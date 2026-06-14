<script>
  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getOrdersAsPerusahaan, updateOrder, createTransaction, getTransactionsByOrderIds, getPaymentConfirmationsForOrder } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import Map from '$lib/Map.svelte';
  import Chat from '$lib/Chat.svelte';
  import PromptModal from '$lib/PromptModal.svelte';
  import ConfirmModal from '$lib/ConfirmModal.svelte';
  import NotificationPopup from '$lib/NotificationPopup.svelte';
  import StepTracker from '$lib/StepTracker.svelte';

  let profile = $state(null);
  let orders = $state([]);
  let loading = $state(true);
  let actionLoading = $state(false);
  let error = $state('');
  let chatOrderId = $state(null);
  let transactionsMap = $state({}); // order_id -> transaction
  let paidOrdersMap = $state({});   // order_id -> payment_confirmation (only confirmed/paid)
  let completePromptOrderId = $state(null);
  let completePromptError = $state('');
  let cancelConfirmOrderId = $state(null);
  let interval;

  /** Notification popup state */
  let notification = $state(null);

  /** Snapshot of order statuses to detect remote changes */
  let orderStatusSnapshot = $state({}); // {orderId: status}

  function showNotification(type, title, message) {
    notification = { type, title, message, noSound: true };
  }

  function dismissNotification() {
    notification = null;
  }

  /** Update snapshot immediately after local action to avoid double-trigger from polling */
  function updateSnapshot(orderId, newStatus) {
    orderStatusSnapshot = { ...orderStatusSnapshot, [orderId]: newStatus };
  }

  /**
   * Watch for status changes made by the OTHER party (UMKM)
   * by comparing current orders with snapshot. Shows notification + sound.
   */
  function watchRemoteChanges(currentOrders) {
    for (const order of currentOrders) {
      const oldStatus = orderStatusSnapshot[order.id];
      const newStatus = order.status;
      if (!oldStatus || oldStatus === newStatus) continue;

      // Check for UMKM-initiated transitions
      // pending→cancelled is from UMKM; picked_up_by_perusahaan→cancelled is from Perusahaan (skip)
      if (oldStatus === 'pending' && newStatus === 'cancelled') {
        showNotification('error', 'Pesanan Dibatalkan UMKM', 'UMKM membatalkan pesanan.');
        notification.noSound = false;
      } else if (oldStatus === 'pending' && newStatus === 'confirmed_by_umkm') {
        showNotification('success', 'Pesanan Diterima UMKM', 'UMKM telah menerima pesanan pickup.');
        notification.noSound = false;
      } else if (oldStatus === 'picked_up_by_perusahaan' && newStatus === 'picked_up') {
        showNotification('success', 'Penjemputan Dikonfirmasi UMKM', 'UMKM mengkonfirmasi minyak telah dijemput.');
        notification.noSound = false;
      } else if (oldStatus === 'completed_by_perusahaan' && newStatus === 'completed') {
        showNotification('success', 'Pesanan Selesai', 'UMKM telah menyelesaikan pesanan.');
        notification.noSound = false;
      }
    }
    // Update snapshot
    const snap = {};
    for (const o of currentOrders) snap[o.id] = o.status;
    orderStatusSnapshot = snap;
  }

  /** Fetch payment confirmations for given orders to know which are paid */
  async function loadPaymentStatus(orderList) {
    const paidIds = orderList
      .filter(o => o.status === 'completed' || o.status === 'completed_by_perusahaan' || o.status === 'paid')
      .map(o => o.id);
    if (paidIds.length === 0) { paidOrdersMap = {}; return; }

    const map = {};
    for (const oid of paidIds) {
      const { data } = await getPaymentConfirmationsForOrder(oid);
      if (data) {
        const paid = data.find(p => p.status === 'confirmed' || p.status === 'paid');
        if (paid) map[oid] = paid;
      }
    }
    paidOrdersMap = map;
  }

  let activeOrdersMap = $derived.by(() => {
    const active = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed' && o.status !== 'paid');
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
      .filter((o) => o.status === 'completed' || o.status === 'paid')
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

    // Fetch payment confirmations to know which orders are already paid
    await loadPaymentStatus(res.data || []);

    // Init snapshot for remote change detection
    const snap = {};
    for (const o of orders) snap[o.id] = o.status;
    orderStatusSnapshot = snap;

    loading = false;

    // Auto-refresh orders every 3s
    interval = setInterval(async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return;
      const { data } = await getOrdersAsPerusahaan(s.user.id);
      if (data) {
        orders = data;
        await loadPaymentStatus(data);
        watchRemoteChanges(data);

        // Refresh transactions for completed/paid orders
        const txIds = (data || [])
          .filter((o) => o.status === 'completed' || o.status === 'paid')
          .map((o) => o.id);
        if (txIds.length > 0) {
          const txRes = await getTransactionsByOrderIds(txIds);
          if (txRes.data) {
            const map = {};
            for (const tx of txRes.data) {
              map[tx.order_id] = tx;
            }
            transactionsMap = map;
          }
        }
      }
    }, 3000);
  });

  onDestroy(() => clearInterval(interval));

  function updateOrderStatus(orderId, newStatus) {
    if (newStatus === 'completed_by_perusahaan') {
      completePromptOrderId = orderId;
      completePromptError = '';
    } else if (newStatus === 'cancelled') {
      cancelConfirmOrderId = orderId;
    } else {
      executeStatusUpdate(orderId, newStatus);
    }
  }

  async function executeComplete(actualLitersStr) {
    const orderId = completePromptOrderId;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    const actualLiters = parseFloat(actualLitersStr);

    if (!actualLiters || actualLiters <= 0) {
      completePromptError = 'Jumlah aktual tidak valid.';
      return false;
    }

    actionLoading = true;
    error = '';

    const { error: orderErr } = await updateOrder(orderId, { status: 'completed_by_perusahaan' });

    if (orderErr) {
      error = orderErr.message;
      actionLoading = false;
      completePromptOrderId = null;
      return;
    }

    const pricePerLiter = parseFloat(order.oil_listings?.price_per_liter || 0);

    const { data: txData, error: txErr } = await createTransaction({
      order_id: orderId,
      actual_liters: actualLiters,
      total_price: actualLiters * pricePerLiter,
      payment_method: 'transfer',
      payment_status: 'pending'
    });

    if (txErr) {
      error = txErr.message;
    }

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

    orders = orders.map((o) => (o.id === orderId ? { ...o, status: 'completed_by_perusahaan' } : o));
    actionLoading = false;
    completePromptOrderId = null;
    showNotification('success', 'Pesanan Diselesaikan', 'Pickup berhasil diselesaikan. Pembayaran telah diproses ke UMKM.');
    updateSnapshot(orderId, 'completed_by_perusahaan');
  }

  async function executeStatusUpdate(orderId, newStatus) {
    actionLoading = true;
    error = '';

    const { error: orderErr } = await updateOrder(orderId, { status: newStatus });

    if (orderErr) {
      error = orderErr.message;
      actionLoading = false;
      return;
    }

    orders = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
    actionLoading = false;

    // Show notification based on status
    const statusMessages = {
      'confirmed': 'Pickup telah dikonfirmasi. Menunggu penjemputan.',
      'picked_up_by_perusahaan': 'Status diperbarui: minyak sedang dalam perjalanan.',
      'cancelled': 'Pesanan telah dibatalkan.'
    };
    if (statusMessages[newStatus]) {
      showNotification(
        newStatus === 'cancelled' ? 'error' : 'success',
        newStatus === 'cancelled' ? 'Pesanan Dibatalkan' : 'Status Diperbarui',
        statusMessages[newStatus]
      );
      updateSnapshot(orderId, newStatus);
    }
  }

  async function executeCancel() {
    const orderId = cancelConfirmOrderId;
    cancelConfirmOrderId = null;
    if (!orderId) return;
    await executeStatusUpdate(orderId, 'cancelled');
  }

  function statusBadge(s) {
    const map = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      picked_up: 'badge-success',
      completed: 'badge-success',
      paid: 'badge-success',
      cancelled: 'badge-danger',
      confirmed_by_umkm: 'badge-warning',
      picked_up_by_perusahaan: 'badge-info',
      completed_by_perusahaan: 'badge-info'
    };

    return map[s] || 'badge-default';
  }

  function statusLabel(s) {
    const map = {
      pending: 'Menunggu konfirmasi',
      confirmed: 'Pickup dikonfirmasi',
      picked_up: 'Minyak sudah dijemput',
      completed: 'Selesai',
      paid: 'Lunas',
      cancelled: 'Dibatalkan',
      confirmed_by_umkm: 'Disetujui UMKM',
      picked_up_by_perusahaan: 'Dijemput Perusahaan',
      completed_by_perusahaan: 'Diselesaikan Perusahaan'
    };

    return map[s] || s;
  }

  function nextActions(status) {
    if (status === 'confirmed_by_umkm') {
      return [{ label: 'Konfirmasi Pickup', status: 'confirmed', cls: 'btn-primary' }];
    }

    if (status === 'confirmed') {
      return [{ label: 'Sudah Dijemput', status: 'picked_up_by_perusahaan', cls: 'btn-primary' }];
    }

    if (status === 'picked_up_by_perusahaan') {
      return [
        { label: 'Batalkan', status: 'cancelled', cls: 'btn-danger' }
      ];
    }

    if (status === 'picked_up') {
      return [{ label: 'Verifikasi & Selesaikan', status: 'completed_by_perusahaan', cls: 'btn-primary' }];
    }

    return [];
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
              <StepTracker status={order.status} isPaid={!!paidOrdersMap[order.id]} />
            </div>
          {/if}

          <!-- Payment announcement badge for completed orders -->
          {#if (order.status === 'paid') && transactionsMap[order.id]}
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

            {#if order.status === 'completed' || order.status === 'paid'}
              {#if order.status === 'paid' || paidOrdersMap[order.id]}
                <!-- Already paid -->
                <span class="badge-success inline-flex items-center gap-1 btn-sm">
                  <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#check"/></svg>
                  Sudah Dibayar
                </span>
              {:else}
                <a
                  href="/dashboard/payment?order_id={order.id}"
                  class="btn-primary btn-sm inline-flex items-center gap-1"
                >
                  <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#credit-card"/></svg>
                  Bayar UMKM
                </a>
              {/if}
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

{#if completePromptOrderId}
  {@const order = orders.find((o) => o.id === completePromptOrderId)}
  <PromptModal
    title="Verifikasi & Selesaikan"
    message="Masukkan jumlah minyak jelantah yang benar-benar diterima:"
    label="Jumlah Aktual (Liter)"
    placeholder={String(order?.requested_liters || '')}
    defaultValue={String(order?.requested_liters || '')}
    confirmText="Selesaikan"
    error={completePromptError}
    onconfirm={(val) => executeComplete(val)}
    oncancel={() => completePromptOrderId = null}
  />
{/if}

{#if cancelConfirmOrderId}
  <ConfirmModal
    title="Batalkan Pesanan"
    message="Batalkan pesanan pickup ini? Tindakan ini tidak dapat dibatalkan."
    confirmText="Ya, Batalkan"
    cancelText="Tidak"
    variant="danger"
    onconfirm={executeCancel}
    oncancel={() => cancelConfirmOrderId = null}
    loading={actionLoading}
  />
{/if}

{#if notification}
  <NotificationPopup
    type={notification.type}
    title={notification.title}
    message={notification.message}
    noSound={notification.noSound}
    ondismiss={dismissNotification}
  />
{/if}
