<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getOrdersAsPerusahaan, updateOrder, createTransaction, getTransactionsByOrderIds } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import Map from '$lib/Map.svelte';
  import Chat from '$lib/Chat.svelte';

  let profile = $state(null);
  let orders = $state([]);
  let loading = $state(true);
  let actionLoading = $state(false);
  let error = $state('');
  let chatOrderId = $state(null);
  let transactionsMap = $state({}); // order_id -> transaction

  let activeOrdersMap = $derived.by(() => {
    const active = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed');
    return active
      .filter(o => o.oil_listings?.latitude != null && o.oil_listings?.longitude != null)
      .map(o => ({
        lat: Number(o.oil_listings.latitude),
        lng: Number(o.oil_listings.longitude),
        popup: `
          <div>
            <p style="font-weight:600;font-size:13px;margin:0;">${o.requested_liters}L Pickup</p>
            <p style="font-size:11px;color:#78716c;margin:2px 0;">${o.oil_listings.pickup_address?.slice(0, 50) || ''}</p>
            <p style="font-size:11px;color:#78716c;margin:2px 0;">Status: ${o.status}</p>
          </div>
        `
      }));
  });

  const trackingSteps = [
    { key: 'pending', label: 'Menunggu' },
    { key: 'confirmed', label: 'Dikonfirmasi' },
    { key: 'picked_up', label: 'Dijemput' },
    { key: 'completed', label: 'Selesai' }
  ];

  onMount(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'perusahaan') return goto('/dashboard');

    profile = userProfile.data;

    const res = await getOrdersAsPerusahaan(session.user.id);
    orders = res.data || [];

    // Fetch transactions for completed orders to show payment announcements
    const completedIds = (res.data || [])
      .filter((o) => o.status === 'completed')
      .map((o) => o.id);
    if (completedIds.length > 0) {
      const txRes = await getTransactionsByOrderIds(completedIds);
      if (txRes.data) {
        const map = {};
        for (const tx of txRes.data) {
          map[tx.order_id] = tx;
        }
        transactionsMap = map;
      }
    }

    loading = false;
  });

  async function updateOrderStatus(orderId, newStatus) {
    actionLoading = true;
    error = '';

    const order = orders.find((o) => o.id === orderId);

    let actualLiters = order ? parseFloat(order.requested_liters) : 0;

    if (newStatus === 'completed') {
      const input = prompt(
        'Masukkan jumlah minyak jelantah yang benar-benar diterima:',
        actualLiters
      );

      if (input === null) {
        actionLoading = false;
        return;
      }

      actualLiters = parseFloat(input);

      if (!actualLiters || actualLiters <= 0) {
        error = 'Jumlah aktual tidak valid.';
        actionLoading = false;
        return;
      }
    }

    const { error: orderErr } = await updateOrder(orderId, { status: newStatus });

    if (orderErr) {
      error = orderErr.message;
      actionLoading = false;
      return;
    }

    if (newStatus === 'completed' && order) {
      const pricePerLiter = parseFloat(order.oil_listings?.price_per_liter || 0);

      const { data: txData, error: txErr } = await createTransaction({
        order_id: orderId,
        actual_liters: actualLiters,
        total_price: actualLiters * pricePerLiter,
        payment_method: 'transfer',
        payment_status: 'paid'
      });

      if (txErr) {
        error = txErr.message;
      }

      // Update local transactions map so announcement shows immediately
      if (txData) {
        transactionsMap = { ...transactionsMap, [orderId]: txData };
      }

      // 🏆 Auto-earn points for UMKM: 1 liter = 10 poin
      if (!txErr) {
        const points = Math.floor(actualLiters * 10);
        const ptsRes = await fetch('/api/points/earn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: order.umkm_id,
            points,
            source: 'transaction',
            description: `${actualLiters}L minyak jelantah — 1L = 10 poin`,
          }),
        });
        const ptsData = await ptsRes.json();
        if (!ptsRes.ok) {
          console.error('[Points] Gagal earn:', ptsData.error);
        }
      }
    }

    orders = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
    actionLoading = false;
  }

  function statusBadge(s) {
    const map = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      picked_up: 'badge-success',
      completed: 'badge-success',
      cancelled: 'badge-danger'
    };

    return map[s] || 'badge-default';
  }

  function statusLabel(s) {
    const map = {
      pending: 'Menunggu konfirmasi',
      confirmed: 'Pickup dikonfirmasi',
      picked_up: 'Minyak sudah dijemput',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    };

    return map[s] || s;
  }

  function nextActions(status) {
    if (status === 'pending') {
      return [{ label: 'Konfirmasi Pickup', status: 'confirmed', cls: 'btn-primary' }];
    }

    if (status === 'confirmed') {
      return [{ label: 'Sudah Dijemput', status: 'picked_up', cls: 'btn-primary' }];
    }

    if (status === 'picked_up') {
      return [
        { label: 'Verifikasi & Selesaikan', status: 'completed', cls: 'btn-primary' },
        { label: 'Batalkan', status: 'cancelled', cls: 'btn-danger' }
      ];
    }

    return [];
  }

  function stepIndex(status) {
    if (status === 'cancelled') return -1;
    return trackingSteps.findIndex((step) => step.key === status);
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }
</script>

<div class="page-container py-8">
  <!-- Back link -->
  <a href="/dashboard/perusahaan" class="nav-link mb-4 inline-flex">
    <svg class="icon w-4 h-4"><use href="/icons.svg#arrow-right"/></svg>
    <span>Kembali ke Dashboard</span>
  </a>

  <!-- Page Header -->
  <div class="page-header">
    <p class="text-sm font-semibold text-gold-600 flex items-center gap-1">
      <svg class="icon w-4 h-4"><use href="/icons.svg#olive-drop"/></svg>
      Jelantahin
    </p>
    <h1 class="page-title">Tracking Pickup Minyak</h1>
    <p class="page-subtitle">Pantau dan ubah status pickup minyak jelantah dari UMKM.</p>
  </div>

  {#if error}
    <div class="alert-error mb-4">
      <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
      <span>{error}</span>
    </div>
  {/if}

  {#if loading}
    <div class="skeleton-card">
      <div class="skeleton-text"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text w-2/3"></div>
    </div>
  {:else if orders.length === 0}
    <div class="empty-state">
      <svg class="empty-state-icon"><use href="/icons.svg#package"/></svg>
      <p class="empty-state-title">Belum ada pesanan pickup</p>
      <p class="empty-state-desc">Cari permintaan pickup yang tersedia untuk memulai.</p>
      <a
        href="/dashboard/perusahaan/browse"
        class="btn-primary btn-md mt-4"
      >
        <svg class="icon w-4 h-4"><use href="/icons.svg#search"/></svg>
        Cari permintaan pickup
      </a>
    </div>
  {:else}
    <!-- Overview map for active pickups with coordinates -->
    {#if activeOrdersMap.length > 0}
      <div class="card p-2 mb-6">
        <h2 class="text-sm font-semibold font-display text-earth-900 mb-2 px-2 flex items-center gap-1">
          <svg class="icon w-4 h-4"><use href="/icons.svg#map-pin"/></svg>
          Lokasi Pickup Aktif
        </h2>
        <Map markers={activeOrdersMap} height="300px" zoom={11} />
      </div>
    {/if}

    <div class="space-y-4">
      {#each orders as order}
        <div class="order-card">
          <div class="order-card-header">
            <div>
              <p class="order-card-title">
                Pickup {order.requested_liters}L — {order.oil_listings?.city || 'Alamat UMKM'}
              </p>
              <p class="order-card-meta flex items-center gap-1">
                <svg class="icon w-3 h-3"><use href="/icons.svg#clock-rotate"/></svg>
                #{order.id.slice(0, 8)} • Dibuat
                {new Date(order.created_at).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              {#if order.pickup_date}
                <p class="order-card-meta flex items-center gap-1">
                  <svg class="icon w-3 h-3"><use href="/icons.svg#calendar"/></svg>
                  Jadwal pickup: {new Date(order.pickup_date).toLocaleDateString('id-ID')}
                </p>
              {/if}
            </div>
            <span class={statusBadge(order.status)}>
              {statusLabel(order.status)}
            </span>
          </div>

          {#if order.status !== 'cancelled'}
            <div class="card-flat p-4 mb-4">
              <div class="step-tracker">
                {#each trackingSteps as step, index}
                  <div class="step-item">
                    <div
                      class="step-circle {index <= stepIndex(order.status) ? 'step-circle-active' : 'step-circle-inactive'}"
                    >
                      {index + 1}
                    </div>
                    <p
                      class="step-label {index <= stepIndex(order.status) ? 'step-label-active' : 'step-label-inactive'}"
                    >
                      {step.label}
                    </p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Payment announcement badge for completed orders -->
          {#if order.status === 'completed' && transactionsMap[order.id]}
            {@const tx = transactionsMap[order.id]}
            <div class="mb-4 flex justify-center">
              <div class="alert-success w-full">
                <svg class="icon w-5 h-5 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg>
                <div>
                  <p class="font-semibold">Pembayaran Telah Dikonfirmasi</p>
                  <p class="text-xs text-herb-600">
                    {formatRupiah(tx.total_price)} —
                    {new Date(tx.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          {/if}

          {#if order.oil_listings}
            <div class="order-card-address">
              <p class="flex items-start gap-1">
                <svg class="icon w-3.5 h-3.5 mt-0.5 flex-shrink-0"><use href="/icons.svg#map-pin"/></svg>
                <span>{order.oil_listings.pickup_address}</span>
              </p>
              <p class="mt-1 flex items-center gap-1">
                <svg class="icon w-3.5 h-3.5 flex-shrink-0"><use href="/icons.svg#credit-card"/></svg>
                {formatRupiah(order.oil_listings.price_per_liter)}/L —
                Total estimasi:
                {formatRupiah(
                  parseFloat(order.requested_liters) *
                    parseFloat(order.oil_listings.price_per_liter)
                )}
              </p>
              {#if order.notes}
                <p class="mt-2 whitespace-pre-line text-earth-600 flex items-start gap-1">
                  <svg class="icon w-3.5 h-3.5 mt-0.5 flex-shrink-0"><use href="/icons.svg#message-circle"/></svg>
                  <span>Catatan: {order.notes}</span>
                </p>
              {/if}
            </div>

            <!-- Mini map for this order if it has coordinates -->
            {#if order.oil_listings.latitude != null && order.oil_listings.longitude != null}
              <div class="mb-3">
                <Map
                  markers={[{
                    lat: Number(order.oil_listings.latitude),
                    lng: Number(order.oil_listings.longitude),
                    popup: `<p style="font-size:12px;margin:0;">📍 ${order.oil_listings.pickup_address?.slice(0, 40) || 'Lokasi pickup'}</p>`
                  }]}
                  height="180px"
                  zoom={15}
                />
              </div>
            {/if}
          {/if}

          <div class="order-card-actions">
            {#each nextActions(order.status) as action}
              <button
                onclick={() => updateOrderStatus(order.id, action.status)}
                class={action.cls + ' btn-sm'}
                disabled={actionLoading}
              >
                {#if actionLoading}
                  <svg class="icon w-3.5 h-3.5 animate-spin"><use href="/icons.svg#loader"/></svg>
                {/if}
                {action.label}
              </button>
            {/each}

            <button
              onclick={() => (chatOrderId = order.id)}
              class="btn-secondary btn-sm inline-flex items-center gap-1"
            >
              <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#message-circle"/></svg>
              Chat
            </button>

            {#if order.status === 'completed'}
              <a
                href="/dashboard/payment?order_id={order.id}"
                class="btn-primary btn-sm inline-flex items-center gap-1"
              >
                <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#credit-card"/></svg>
                Bayar UMKM
              </a>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if chatOrderId && profile}
  <Chat
    orderId={chatOrderId}
    currentUserId={profile.id}
    currentUserName={profile.company_name || profile.full_name}
    orderStatus={orders.find((o) => o.id === chatOrderId)?.status}
    onclose={() => (chatOrderId = null)}
  />
{/if}
