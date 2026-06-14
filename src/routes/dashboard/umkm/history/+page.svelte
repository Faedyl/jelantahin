<script>
  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getMyListings, getOrdersAsUmkm, getPaymentsForUmkm, getPointsBalance, ensurePointsAccount, getTransactionsByOrderIds, updateOrder } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import Map from '$lib/Map.svelte';
  import Chat from '$lib/Chat.svelte';
  import ConfirmModal from '$lib/ConfirmModal.svelte';

  let profile = $state(null);
  let listings = $state([]);
  let orders = $state([]);
  let tab = $state('listings');
  let loading = $state(true);
  let chatOrderId = $state(null);
  let transactionsMap = $state({}); // order_id -> transaction

  let pointsBalance = $state(0);
  let incomingPayments = $state([]);
  let totalReceived = $state(0);
  let rejectConfirmOrderId = $state(null);
  let actionLoading = $state(false);
  let error = $state('');
  let interval;

  function setTab(value) {
    tab = value;
  }

  let listingMarkers = $derived(
    listings
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((l) => ({
        lat: Number(l.latitude),
        lng: Number(l.longitude),
        popup: `<p style="font-size:12px;margin:0;">${l.quantity_liters}L — Rp ${Number(
          l.price_per_liter
        ).toLocaleString('id-ID')}/L</p><p style="font-size:11px;color:#78716c;margin:2px 0;">${
          l.city || l.pickup_address?.slice(0, 30) || ''
        } • ${statusLabel(l.status)}</p>`
      }))
  );

  let completedOrders = $derived(orders.filter((order) => order.status === 'completed'));

  let totalLiters = $derived(
    completedOrders.reduce((total, order) => {
      return total + Number(order.requested_liters || 0);
    }, 0)
  );

  let totalCuan = $derived(
    completedOrders.reduce((total, order) => {
      const liters = Number(order.requested_liters || 0);
      const price = Number(order.oil_listings?.price_per_liter || 0);
      return total + liters * price;
    }, 0)
  );

  const trackingSteps = [
    { key: 'pending',               label: 'Menunggu' },
    { key: 'confirmed_by_umkm',     label: 'Disetujui' },
    { key: 'confirmed',             label: 'Dikonfirmasi' },
    { key: 'picked_up_by_perusahaan', label: 'Dijemput' },
    { key: 'picked_up',             label: 'Dikonfirmasi UMKM' },
    { key: 'completed_by_perusahaan', label: 'Diselesaikan' },
    { key: 'completed',             label: 'Selesai' }
  ];

  onMount(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);

    if (!userProfile.data || userProfile.data.role !== 'umkm') {
      return goto('/dashboard');
    }

    profile = userProfile.data;

    await ensurePointsAccount(session.user.id);
    const [listingsRes, ordersRes, paymentsRes, pointsRes] = await Promise.all([
      getMyListings(session.user.id),
      getOrdersAsUmkm(session.user.id),
      getPaymentsForUmkm(session.user.id),
      getPointsBalance(session.user.id),
    ]);

    listings = listingsRes.data || [];
    orders = ordersRes.data || [];
    incomingPayments = paymentsRes.data || [];
    totalReceived = incomingPayments
      .filter(p => p.status === 'confirmed' || p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    pointsBalance = pointsRes.data?.balance || 0;

    // Fetch transactions for completed orders to show payment announcements
    const completedIds = (ordersRes.data || [])
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

    // Auto-refresh orders every 10s
    interval = setInterval(async () => {
      const { data } = await getOrdersAsUmkm(session.user.id);
      if (data) orders = data;
    }, 10000);
  });

  onDestroy(() => clearInterval(interval));

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  function statusBadge(status) {
    const map = {
      available: 'badge-success',
      claimed: 'badge-info',
      completed: 'badge-success',
      cancelled: 'badge-danger',
      pending: 'badge-warning',
      confirmed: 'badge-info',
      picked_up: 'badge-success',
      confirmed_by_umkm: 'badge-warning',
      picked_up_by_perusahaan: 'badge-info',
      completed_by_perusahaan: 'badge-info'
    };

    return map[status] || 'badge-default';
  }

  function statusLabel(status) {
    const map = {
      available: 'Tersedia',
      claimed: 'Diproses Pengolah',
      pending: 'Menunggu Konfirmasi',
      confirmed: 'Dikonfirmasi',
      picked_up: 'Sudah Dijemput',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      confirmed_by_umkm: 'Disetujui UMKM',
      picked_up_by_perusahaan: 'Dijemput Perusahaan',
      completed_by_perusahaan: 'Diselesaikan Perusahaan'
    };

    return map[status] || status;
  }

  function stepIndex(status) {
    if (status === 'cancelled') return -1;
    return trackingSteps.findIndex((step) => step.key === status);
  }

  async function acceptOrder(orderId) {
    actionLoading = true;
    error = '';
    const { error: err } = await updateOrder(orderId, { status: 'confirmed_by_umkm' });
    actionLoading = false;
    if (err) {
      error = err.message;
    } else {
      orders = orders.map(o => o.id === orderId ? { ...o, status: 'confirmed_by_umkm' } : o);
    }
  }

  async function confirmPickup(orderId) {
    actionLoading = true;
    error = '';
    const { error: err } = await updateOrder(orderId, { status: 'picked_up' });
    actionLoading = false;
    if (err) {
      error = err.message;
    } else {
      orders = orders.map(o => o.id === orderId ? { ...o, status: 'picked_up' } : o);
    }
  }

  async function confirmCompleted(orderId) {
    actionLoading = true;
    error = '';
    const { error: err } = await updateOrder(orderId, { status: 'completed' });
    actionLoading = false;
    if (err) {
      error = err.message;
    } else {
      orders = orders.map(o => o.id === orderId ? { ...o, status: 'completed' } : o);
    }
  }

  async function rejectOrder(orderId) {
    rejectConfirmOrderId = orderId;
  }

  function confirmReject() {
    const orderId = rejectConfirmOrderId;
    rejectConfirmOrderId = null;
    if (!orderId) return;
    actionLoading = true;
    error = '';
    updateOrder(orderId, { status: 'cancelled' }).then(({ error: err }) => {
      actionLoading = false;
      if (err) {
        error = err.message;
      } else {
        orders = orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o);
      }
    });
  }
</script>

<div class="page-container py-8">
  <a
    href="/dashboard/umkm"
    class="nav-link mb-4 inline-flex"
  >
    <svg class="icon w-4 h-4"><use href="/icons.svg#arrow-right"/></svg>
    <span>Kembali ke Dashboard</span>
  </a>

  <h1 class="page-title mb-6">Riwayat & Penawaran</h1>

  {#if error}
    <div class="alert-error mb-4">
      <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
      <span>{error}</span>
    </div>
  {/if}

  <div class="mb-6 grid gap-3 sm:grid-cols-3">
    <div class="stat">
      <p class="stat-label">Total Jelantah Tersalurkan</p>
      <p class="stat-value">{totalLiters} L</p>
      <p class="text-xs text-earth-500 mt-1">Dihitung dari pickup yang selesai</p>
    </div>

    <div class="stat">
      <p class="stat-label">Total Cuan</p>
      <p class="stat-value stat-accent">{formatRupiah(totalCuan)}</p>
      <p class="text-xs text-earth-500 mt-1">Estimasi hasil penyaluran jelantah</p>
    </div>

    <a href="/dashboard/umkm/points" class="stat block hover:shadow-brand-md transition-all duration-200">
      <p class="stat-label flex items-center gap-1">
        <svg class="icon w-3.5 h-3.5 text-gold-500"><use href="/icons.svg#award"/></svg>
        Kupon Poin
      </p>
      <p class="stat-value" style="color: #D4A40D;">{pointsBalance.toLocaleString('id-ID')} poin</p>
      <p class="text-xs text-earth-500 mt-1">1 liter = 10 poin • Klik untuk tukar</p>
    </a>
  </div>

  <a href="/dashboard/umkm/points" class="card-hover mb-6 block p-5 bg-gradient-to-br from-herb-100 to-gold-100">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-semibold text-gold-700 flex items-center gap-1">
          <svg class="icon w-4 h-4"><use href="/icons.svg#award"/></svg>
          Kupon Poin — Tukarkan Hadiah!
        </p>
        <h2 class="mt-1 text-lg font-bold text-earth-900">Kumpulkan poin, tukar jadi hadiah</h2>
        <p class="mt-1 text-sm text-earth-700">
          Setiap transaksi memberimu poin kupon yang bisa ditukar dengan berbagai hadiah menarik.
          Klik di sini untuk lihat katalog!
        </p>
      </div>

      <div class="flex gap-2 shrink-0">
        <span class="btn-primary btn-sm pointer-events-none">
          Lihat Hadiah
          <svg class="icon w-3 h-3"><use href="/icons.svg#arrow-right"/></svg>
        </span>
      </div>
    </div>
  </a>

  <div class="relative z-20 mb-6 flex gap-1 bg-earth-200 rounded-lg p-1">
    <button onclick={() => setTab('listings')}
      class="btn-ghost btn-sm {tab === 'listings' ? 'nav-link-active' : ''}">
      <svg class="icon w-4 h-4"><use href="/icons.svg#menu"/></svg>
      Penawaran
    </button>
    <button onclick={() => setTab('orders')}
      class="btn-ghost btn-sm {tab === 'orders' ? 'nav-link-active' : ''}">
      <svg class="icon w-4 h-4"><use href="/icons.svg#package"/></svg>
      Pesanan
    </button>
    <button onclick={() => setTab('payments')}
      class="btn-ghost btn-sm {tab === 'payments' ? 'nav-link-active' : ''}">
      <svg class="icon w-4 h-4"><use href="/icons.svg#credit-card"/></svg>
      Pembayaran Masuk
    </button>
  </div>

  {#if loading}
    <div class="skeleton-card">
      <div class="skeleton-text"></div>
      <div class="skeleton-text"></div>
    </div>
  {:else if tab === 'listings'}
    {#if listingMarkers.length > 0}
      <div class="card p-2 mb-4">
        <Map markers={listingMarkers} height="280px" zoom={12} />
      </div>
    {/if}

    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-earth-900">Semua Penawaran ({listings.length})</h2>
        <a href="/dashboard/umkm/listing" class="btn-primary btn-sm">
          <svg class="icon w-3 h-3"><use href="/icons.svg#package"/></svg>
          Baru
        </a>
      </div>

      {#if listings.length === 0}
        <div class="empty-state py-8">
          <svg class="empty-state-icon"><use href="/icons.svg#package"/></svg>
          <p class="empty-state-title">Belum ada penawaran</p>
          <p class="empty-state-desc">Buat penawaran baru untuk menjual jelantah.</p>
        </div>
      {:else}
        <div class="divide-y divide-earth-300/50">
          {#each listings as listing}
            <div class="flex items-center justify-between py-3">
              <div>
                <p class="text-sm font-medium text-earth-800">
                  {listing.quantity_liters}L @ Rp {Number(listing.price_per_liter).toLocaleString(
                    'id-ID'
                  )}/L
                </p>
                <p class="text-xs text-earth-600">
                  {listing.city || listing.pickup_address?.slice(0, 30)}
                  •
                  {new Date(listing.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>

              <span class={statusBadge(listing.status)}>
                {statusLabel(listing.status)}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else if tab === 'orders'}
    <div class="card p-5">
      <h2 class="font-semibold text-earth-900 mb-4">Riwayat Pesanan ({orders.length})</h2>

      {#if orders.length === 0}
        <div class="empty-state py-8">
          <svg class="empty-state-icon"><use href="/icons.svg#package"/></svg>
          <p class="empty-state-title">Belum ada pesanan</p>
          <p class="empty-state-desc">Tunggu hingga ada perusahaan yang memesan penawaran Anda.</p>
        </div>
      {:else}
        <div class="divide-y divide-earth-300/50">
          {#each orders as order}
            <div class="py-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-earth-800">
                    Pesanan #{order.id.slice(0, 8)} — {order.requested_liters}L
                  </p>

                  <p class="text-xs text-earth-600">
                    {new Date(order.created_at).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {#if order.pickup_date}
                      • Jemput: {new Date(order.pickup_date).toLocaleDateString('id-ID')}
                    {/if}
                  </p>

                  {#if order.oil_listings}
                    <p class="mt-1 text-xs text-earth-600">
                      Total estimasi:
                      {formatRupiah(
                        Number(order.requested_liters || 0) *
                          Number(order.oil_listings.price_per_liter || 0)
                      )}
                    </p>
                  {/if}
                </div>

                <span class={statusBadge(order.status)}>
                  {statusLabel(order.status)}
                </span>
              </div>

              {#if order.status !== 'cancelled'}
                <div class="card-flat p-4 mt-4">
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
              {:else}
                <div class="alert-danger mt-3">
                  <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
                  <span>Pickup ini telah dibatalkan.</span>
                </div>
              {/if}

              <!-- Payment announcement badge for completed orders -->
              {#if order.status === 'completed' && transactionsMap[order.id]}
                {@const tx = transactionsMap[order.id]}
                <div class="mt-4 flex justify-center">
                  <div class="alert-success w-full">
                    <svg class="icon w-5 h-5 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg>
                    <div class="text-center">
                      <p class="font-semibold">Pembayaran Telah Dikonfirmasi</p>
                      <p class="text-xs text-herb-600">
                        {formatRupiah(tx.total_price)} —
                        {new Date(tx.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              {/if}

              <div class="mt-3 flex gap-2">
                {#if order.status === 'pending'}
                  <button
                    onclick={() => acceptOrder(order.id)}
                    class="btn-primary btn-sm inline-flex items-center gap-1"
                    disabled={actionLoading}
                  >
                    <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#check"/></svg>
                    Terima
                  </button>
                  <button
                    onclick={() => rejectOrder(order.id)}
                    class="btn-danger btn-sm inline-flex items-center gap-1"
                    disabled={actionLoading}
                  >
                    <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#x"/></svg>
                    Tolak
                  </button>
                {:else if order.status === 'picked_up_by_perusahaan'}
                  <button
                    onclick={() => confirmPickup(order.id)}
                    class="btn-primary btn-sm inline-flex items-center gap-1"
                    disabled={actionLoading}
                  >
                    <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#check"/></svg>
                    Konfirmasi Penjemputan
                  </button>
                {:else if order.status === 'completed_by_perusahaan'}
                  <button
                    onclick={() => confirmCompleted(order.id)}
                    class="btn-primary btn-sm inline-flex items-center gap-1"
                    disabled={actionLoading}
                  >
                    <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#check"/></svg>
                    Konfirmasi Selesai
                  </button>
                {/if}
                <button
                  onclick={() => (chatOrderId = order.id)}
                  class="btn-secondary btn-sm inline-flex items-center gap-1"
                >
                  <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#message-circle"/></svg>
                  Chat
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else if tab === 'payments'}
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-earth-900 flex items-center gap-1">
          <svg class="icon w-4 h-4"><use href="/icons.svg#credit-card"/></svg>
          Pembayaran Masuk
        </h2>
        <div class="text-right">
          <p class="text-xs text-earth-600">Total Diterima</p>
          <p class="text-lg font-bold text-herb-600">{formatRupiah(totalReceived)}</p>
        </div>
      </div>

      {#if incomingPayments.length === 0}
        <div class="empty-state py-8">
          <svg class="empty-state-icon"><use href="/icons.svg#credit-card"/></svg>
          <p class="empty-state-title">Belum ada pembayaran masuk</p>
          <p class="empty-state-desc">Pembayaran muncul setelah Perusahaan mengkonfirmasi.</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each incomingPayments as p}
            <div class="flex items-center justify-between border-b border-earth-300/50 pb-3 last:border-0 last:pb-0">
              <div>
                <div class="flex items-center gap-2">
                  <svg class="icon w-4 h-4 text-earth-600"><use href="/icons.svg#bank"/></svg>
                  <p class="text-sm font-medium text-earth-800">
                    Pembayaran via {p.payment_banks?.bank_name || 'Bank'}
                  </p>
                </div>
                <p class="text-xs text-earth-600 mt-1">
                  {p.sender_name || 'Perusahaan'} • {new Date(p.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                </p>
                {#if p.notes}
                  <p class="text-xs text-earth-500 mt-0.5">{p.notes}</p>
                {/if}
              </div>
              <div class="text-right">
                <p class="text-sm font-bold text-herb-600">{formatRupiah(p.amount)}</p>
                <span class="{statusBadge(p.status)} text-xs mt-1 inline-block">{p.status}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if chatOrderId && profile}
  <Chat
    orderId={chatOrderId}
    currentUserId={profile.id}
    currentUserName={profile.umkm_name || profile.full_name}
    orderStatus={orders.find((o) => o.id === chatOrderId)?.status}
    onclose={() => (chatOrderId = null)}
  />
{/if}

{#if rejectConfirmOrderId}
  <ConfirmModal
    title="Batalkan Pesanan"
    message="Batalkan pesanan ini? Tindakan ini tidak dapat dibatalkan."
    confirmText="Ya, Batalkan"
    cancelText="Tidak"
    variant="danger"
    onconfirm={confirmReject}
    oncancel={() => rejectConfirmOrderId = null}
    loading={actionLoading}
  />
{/if}
