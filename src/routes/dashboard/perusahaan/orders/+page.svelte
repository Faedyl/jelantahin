<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getOrdersAsPerusahaan, updateOrder, createTransaction, earnPoints, ensurePointsAccount } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import Map from '$lib/Map.svelte';

  let profile = $state(null);
  let orders = $state([]);
  let loading = $state(true);
  let actionLoading = $state(false);
  let error = $state('');

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

      const { error: txErr } = await createTransaction({
        order_id: orderId,
        actual_liters: actualLiters,
        total_price: actualLiters * pricePerLiter,
        payment_method: 'transfer',
        payment_status: 'paid'
      });

      if (txErr) {
        error = txErr.message;
      }

      // 🏆 Auto-earn points for UMKM: 1 liter = 10 poin
      if (!txErr) {
        const points = Math.floor(actualLiters * 10);
        await ensurePointsAccount(order.umkm_id);
        await earnPoints({
          userId: order.umkm_id,
          transactionId: null,
          points,
          source: 'transaction',
          description: `${actualLiters}L minyak jelantah — 1L = 10 poin`,
        });
      }
    }

    orders = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
    actionLoading = false;
  }

  function statusBadge(s) {
    const map = {
      pending: 'badge-yellow',
      confirmed: 'badge-blue',
      picked_up: 'badge-green',
      completed: 'badge-green',
      cancelled: 'badge-red'
    };

    return map[s] || 'badge-stone';
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

<div class="mx-auto max-w-4xl px-4 py-8">
  <a
    href="/dashboard/perusahaan"
    class="mb-4 inline-block text-sm text-jelantah-600 hover:text-jelantah-700"
  >
    ← Kembali ke Dashboard
  </a>

  <div class="mb-6">
    <p class="text-sm font-semibold text-jelantah-600">Jelantahin</p>
    <h1 class="text-2xl font-bold text-stone-800">Tracking Pickup Minyak</h1>
    <p class="text-sm text-stone-500">
      Pantau dan ubah status pickup minyak jelantah dari UMKM.
    </p>
  </div>

  {#if error}
    <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {error}
    </div>
  {/if}

  {#if loading}
    <p class="text-sm text-stone-400">Memuat...</p>
  {:else if orders.length === 0}
    <div class="card py-12 text-center">
      <p class="text-stone-400">Belum ada pesanan pickup.</p>
      <a
        href="/dashboard/perusahaan/browse"
        class="mt-2 inline-block text-sm text-jelantah-600 hover:text-jelantah-700"
      >
        Cari permintaan pickup →
      </a>
    </div>
  {:else}
    <!-- Overview map for active pickups with coordinates -->
    {#if activeOrdersMap.length > 0}
      <div class="card p-2 mb-6">
        <h2 class="text-sm font-semibold text-stone-800 mb-2 px-2">📍 Lokasi Pickup Aktif</h2>
        <Map markers={activeOrdersMap} height="300px" zoom={11} />
      </div>
    {/if}

    <div class="space-y-4">
      {#each orders as order}
        <div class="card">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <p class="font-semibold text-stone-800">
                Pickup {order.requested_liters}L — {order.oil_listings?.city || 'Alamat UMKM'}
              </p>

              <p class="text-xs text-stone-500">
                #{order.id.slice(0, 8)} • Dibuat
                {new Date(order.created_at).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>

              {#if order.pickup_date}
                <p class="text-xs text-stone-500">
                  Jadwal pickup: {new Date(order.pickup_date).toLocaleDateString('id-ID')}
                </p>
              {/if}
            </div>

            <span class={statusBadge(order.status)}>
              {statusLabel(order.status)}
            </span>
          </div>

          {#if order.status !== 'cancelled'}
            <div class="mb-4 rounded-2xl bg-stone-50 p-4">
              <div class="grid grid-cols-4 gap-2">
                {#each trackingSteps as step, index}
                  <div class="text-center">
                    <div
                      class={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        index <= stepIndex(order.status)
                          ? 'bg-jelantah-600 text-white'
                          : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <p
                      class={`text-[11px] ${
                        index <= stepIndex(order.status)
                          ? 'font-semibold text-jelantah-700'
                          : 'text-stone-400'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if order.oil_listings}
            <div class="mb-3 rounded-lg bg-green-50 p-3 text-xs text-stone-700">
              <p>📍 {order.oil_listings.pickup_address}</p>

              <p class="mt-1">
                💰 {formatRupiah(order.oil_listings.price_per_liter)}/L —
                Total estimasi:
                {formatRupiah(
                  parseFloat(order.requested_liters) *
                    parseFloat(order.oil_listings.price_per_liter)
                )}
              </p>

              {#if order.notes}
                <p class="mt-2 whitespace-pre-line text-stone-500">
                  Catatan: {order.notes}
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

          <div class="flex flex-wrap gap-2">
            {#each nextActions(order.status) as action}
              <button
                onclick={() => updateOrderStatus(order.id, action.status)}
                class={action.cls + ' px-3 py-1.5 text-xs'}
                disabled={actionLoading}
              >
                {actionLoading ? 'Memproses...' : action.label}
              </button>
            {/each}

            {#if order.status === 'completed'}
              <a
                href="/dashboard/payment?order_id={order.id}"
                class="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1"
              >
                💳 Bayar UMKM
              </a>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>