<script>
  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getMyListings, getOrdersAsUmkm, updateOrder, getPointsBalance, ensurePointsAccount } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import ConfirmModal from '$lib/ConfirmModal.svelte';
  import NotificationPopup from '$lib/NotificationPopup.svelte';

  let profile = $state(null);
  let listings = $state([]);
  let orders = $state([]);
  let pointsBalance = $state(0);
  let stats = $state({ totalListings: 0, activeOrders: 0, totalEarnings: 0 });
  let loading = $state(true);
  let actionLoading = $state(false);
  let error = $state('');
  let rejectConfirmOrderId = $state(null);
  let interval;

  /** Notification popup state */
  let notification = $state(null);

  /** Snapshot of order statuses to detect remote changes */
  let orderStatusSnapshot = $state({}); // {orderId: status}

  function showNotification(type, title, message) {
    notification = { type, title, message };
  }

  function dismissNotification() {
    notification = null;
  }

  /** Update snapshot immediately after local action to avoid double-trigger from polling */
  function updateSnapshot(orderId, newStatus) {
    orderStatusSnapshot = { ...orderStatusSnapshot, [orderId]: newStatus };
  }

  /**
   * Watch for status changes made by the OTHER party (Perusahaan)
   * by comparing current orders with snapshot. Shows notification + sound.
   */
  const perusahaanTransitions = {
    'confirmed_by_umkm': { to: 'confirmed',         type: 'success', title: 'Pickup Dikonfirmasi',          msg: 'Perusahaan telah mengkonfirmasi pickup.' },
    'confirmed':         { to: 'picked_up_by_perusahaan', type: 'success', title: 'Minyak Sedang Dijemput',         msg: 'Perusahaan sedang dalam perjalanan menjemput minyak.' },
    'picked_up':         { to: 'completed_by_perusahaan', type: 'success', title: 'Pesanan Diselesaikan Perusahaan', msg: 'Perusahaan telah menyelesaikan pesanan. Konfirmasi sekarang.' },
    'picked_up_by_perusahaan': { to: 'cancelled',   type: 'error',   title: 'Pesanan Dibatalkan',           msg: 'Perusahaan membatalkan pesanan.' },
  };

  function watchRemoteChanges(currentOrders) {
    for (const order of currentOrders) {
      const oldStatus = orderStatusSnapshot[order.id];
      const newStatus = order.status;
      if (!oldStatus || oldStatus === newStatus) continue;

      // Check if this transition matches a Perusahaan-initiated change
      const match = perusahaanTransitions[oldStatus];
      if (match && match.to === newStatus) {
        showNotification(match.type, match.title, match.msg);
      }
    }
    // Update snapshot
    const snap = {};
    for (const o of currentOrders) snap[o.id] = o.status;
    orderStatusSnapshot = snap;
  }

  let pendingOrders = $derived(orders.filter(o => o.status === 'pending'));
  let pendingCount = $derived(pendingOrders.length);

  async function acceptOrder(orderId) {
    actionLoading = true;
    error = '';
    const { error: err } = await updateOrder(orderId, { status: 'confirmed_by_umkm' });
    actionLoading = false;
    if (err) {
      error = err.message;
    } else {
      orders = orders.map(o => o.id === orderId ? { ...o, status: 'confirmed_by_umkm' } : o);
      showNotification('success', 'Pesanan Diterima', 'Pesanan berhasil diterima. Perusahaan akan segera memproses pickup.');
      updateSnapshot(orderId, 'confirmed_by_umkm');
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
      showNotification('success', 'Penjemputan Dikonfirmasi', 'Minyak jelantah telah dijemput. Menunggu perusahaan menyelesaikan pesanan.');
      updateSnapshot(orderId, 'picked_up');
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
      showNotification('success', 'Pesanan Selesai', 'Transaksi selesai! Poin kupon telah ditambahkan ke akun Anda.');
      updateSnapshot(orderId, 'completed');
    }
  }

  async function rejectOrder(orderId) {
    rejectConfirmOrderId = orderId;
  }

  async function confirmReject() {
    const orderId = rejectConfirmOrderId;
    rejectConfirmOrderId = null;
    if (!orderId) return;
    actionLoading = true;
    error = '';
    const { error: err } = await updateOrder(orderId, { status: 'cancelled' });
    actionLoading = false;
    if (err) {
      error = err.message;
    } else {
      orders = orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o);
      showNotification('error', 'Pesanan Dibatalkan', 'Pesanan telah dibatalkan.');
      updateSnapshot(orderId, 'cancelled');
    }
  }

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'umkm') {
      return goto('/dashboard');
    }
    profile = userProfile.data;

    const [listingsRes, ordersRes] = await Promise.all([
      getMyListings(session.user.id),
      getOrdersAsUmkm(session.user.id)
    ]);

    listings = listingsRes.data || [];
    orders = ordersRes.data || [];

    // Load actual points balance
    await ensurePointsAccount(session.user.id);
    const pointsRes = await getPointsBalance(session.user.id);
    pointsBalance = pointsRes.data?.balance || 0;

    const completedTx = orders.filter(o => o.status === 'completed');
    const totalEarnings = completedTx.reduce((sum, o) => {
      return sum + (parseFloat(o.requested_liters) * 8000); // estimasi Rp 8k/liter
    }, 0);

    stats = {
      totalListings: listings.length,
      activeOrders: orders.filter(o => !['completed','cancelled'].includes(o.status)).length,
      totalEarnings
    };

    // Init snapshot for remote change detection
    const snap = {};
    for (const o of orders) snap[o.id] = o.status;
    orderStatusSnapshot = snap;

    loading = false;

    // Auto-refresh orders every 3s
    interval = setInterval(async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return;
      const { data } = await getOrdersAsUmkm(s.user.id);
      if (data) {
        orders = data;
        watchRemoteChanges(data);
      }
    }, 3000);
  });

  onDestroy(() => clearInterval(interval));

  function statusBadge(status) {
    const map = {
      'available': 'badge-success',
      'claimed': 'badge-info',
      'completed': 'badge-success',
      'cancelled': 'badge-danger',
      'pending': 'badge-warning',
      'confirmed': 'badge-info',
      'picked_up': 'badge-success',
      'confirmed_by_umkm': 'badge-warning',
      'picked_up_by_perusahaan': 'badge-info',
      'completed_by_perusahaan': 'badge-info'
    };
    return map[status] || 'badge-default';
  }

  function statusLabel(s) {
    const map = {
      'available': 'Tersedia',
      'claimed': 'Diklaim',
      'pending': 'Menunggu',
      'confirmed': 'Dikonfirmasi',
      'picked_up': 'Sudah Dijemput',
      'completed': 'Selesai',
      'cancelled': 'Dibatalkan',
      'confirmed_by_umkm': 'Disetujui UMKM',
      'picked_up_by_perusahaan': 'Dijemput Perusahaan',
      'completed_by_perusahaan': 'Diselesaikan Perusahaan'
    };
    return map[s] || s;
  }
</script>

{#if loading}
  <div class="flex min-h-[40vh] items-center justify-center">
    <svg class="icon w-6 h-6 text-earth-500 animate-spin"><use href="/icons.svg#loader"/></svg>
    <span class="ml-2 text-sm text-earth-600">Memuat...</span>
  </div>
{:else}
  <div class="page-container py-8">
    <!-- Error Alert -->
    {#if error}
      <div class="alert-error mb-4">
        <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
        <span>{error}</span>
      </div>
    {/if}

    <!-- Pending Orders Notification -->
    {#if pendingCount > 0}
      <a href="/dashboard/umkm/history" class="alert-warning mb-4 block cursor-pointer hover:opacity-90 transition-opacity">
        <svg class="icon w-5 h-5 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
        <div class="flex items-center justify-between w-full">
          <div>
            <p class="font-semibold">{pendingCount} Pesanan Menunggu Konfirmasi</p>
            <p class="text-sm">Ada pesanan masuk yang perlu Anda konfirmasi. Klik untuk lihat.</p>
          </div>
          <svg class="icon w-5 h-5 flex-shrink-0"><use href="/icons.svg#arrow-right"/></svg>
        </div>
      </a>
    {/if}
    <!-- Page Header -->
    <div class="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="page-title">Dashboard UMKM</h1>
        <p class="page-subtitle">Kelola penjualan minyak jelantah Anda</p>
      </div>
      <a href="/dashboard/umkm/listing" class="btn-primary btn-md">
        <svg class="icon w-4 h-4"><use href="/icons.svg#package"/></svg>
        Buat Penawaran
      </a>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 sm:grid-cols-4 mb-8">
      <div class="stat">
        <p class="stat-label">
          <svg class="icon w-3.5 h-3.5 inline mr-1"><use href="/icons.svg#package"/></svg>
          Total Penawaran
        </p>
        <p class="stat-value">{stats.totalListings}</p>
      </div>
      <div class="stat">
        <p class="stat-label">
          <svg class="icon w-3.5 h-3.5 inline mr-1"><use href="/icons.svg#clock-rotate"/></svg>
          Pesanan Aktif
        </p>
        <p class="stat-value stat-accent">{stats.activeOrders}</p>
      </div>
      <div class="stat">
        <p class="stat-label">
          <svg class="icon w-3.5 h-3.5 inline mr-1"><use href="/icons.svg#trending-up"/></svg>
          Estimasi Pendapatan
        </p>
        <p class="stat-value text-herb-600">
          Rp {stats.totalEarnings.toLocaleString('id-ID')}
        </p>
      </div>
      <a href="/dashboard/umkm/points" class="stat card-hover block">
        <p class="stat-label">
          <svg class="icon w-3.5 h-3.5 inline mr-1"><use href="/icons.svg#award"/></svg>
          Kupon Poin
        </p>
        <p class="stat-value stat-accent">
          {pointsBalance.toLocaleString('id-ID')}
        </p>
        <p class="text-xs text-gold-600 mt-0.5 font-medium flex items-center gap-1">
          Klik untuk tukar
          <svg class="icon w-3 h-3"><use href="/icons.svg#arrow-right"/></svg>
        </p>
      </a>
    </div>

    <!-- Active Orders -->
    <div class="order-card mb-6">
      <div class="order-card-header">
        <div>
          <h2 class="order-card-title">Pesanan Masuk</h2>
        </div>
      </div>
      {#if orders.filter(o => !['completed','cancelled'].includes(o.status)).length === 0}
        <div class="empty-state py-8">
          <svg class="empty-state-icon w-12 h-12"><use href="/icons.svg#package"/></svg>
          <p class="empty-state-title">Belum ada pesanan</p>
          <p class="empty-state-desc">Pesanan dari perusahaan akan muncul di sini.</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each orders.filter(o => !['completed','cancelled'].includes(o.status)) as order}
            <div class="flex items-center justify-between border-b border-earth-300/50 pb-3 last:border-0 last:pb-0">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-gold-200/50 flex items-center justify-center flex-shrink-0">
                  <svg class="icon w-4 h-4 text-gold-600"><use href="/icons.svg#olive-drop"/></svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-earth-900">
                    Pesanan #{order.id.slice(0,8)}
                  </p>
                  <p class="text-xs text-earth-600">
                    {order.requested_liters}L — {new Date(order.created_at).toLocaleDateString('id-ID')}
                  </p>
                  {#if order.status === 'pending'}
                    <div class="flex gap-1 mt-2">
                      <button
                        onclick={() => acceptOrder(order.id)}
                        class="btn-primary btn-sm"
                        disabled={actionLoading}
                      >
                        Terima
                      </button>
                      <button
                        onclick={() => rejectOrder(order.id)}
                        class="btn-danger btn-sm"
                        disabled={actionLoading}
                      >
                        Tolak
                      </button>
                    </div>
                  {:else if order.status === 'picked_up_by_perusahaan'}
                    <div class="flex gap-1 mt-2">
                      <button
                        onclick={() => confirmPickup(order.id)}
                        class="btn-primary btn-sm"
                        disabled={actionLoading}
                      >
                        Konfirmasi Penjemputan
                      </button>
                    </div>
                  {:else if order.status === 'completed_by_perusahaan'}
                    <div class="flex gap-1 mt-2">
                      <button
                        onclick={() => confirmCompleted(order.id)}
                        class="btn-primary btn-sm"
                        disabled={actionLoading}
                      >
                        Konfirmasi Selesai
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
              <span class={statusBadge(order.status)}>{statusLabel(order.status)}</span>
            </div>
          {/each}
        </div>
      {/if}
      <a href="/dashboard/umkm/history" class="mt-4 inline-flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700 font-medium">
        Lihat riwayat lengkap
        <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#arrow-right"/></svg>
      </a>
    </div>

    <!-- My Listings -->
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <h2 class="order-card-title">Penawaran Saya</h2>
        </div>
      </div>
      {#if listings.length === 0}
        <div class="empty-state py-8">
          <svg class="empty-state-icon w-12 h-12"><use href="/icons.svg#shop"/></svg>
          <p class="empty-state-title">Belum ada penawaran</p>
          <p class="empty-state-desc">Mulai dengan tambah penawaran baru.</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each listings.slice(0, 5) as listing}
            <div class="flex items-center justify-between border-b border-earth-300/50 pb-3 last:border-0 last:pb-0">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-herb-200/50 flex items-center justify-center flex-shrink-0">
                  <svg class="icon w-4 h-4 text-herb-600"><use href="/icons.svg#olive-drop"/></svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-earth-900">{listing.quantity_liters}L — Rp {Number(listing.price_per_liter).toLocaleString('id-ID')}/L</p>
                  <p class="text-xs text-earth-600">{listing.city || listing.pickup_address?.slice(0,30)}</p>
                </div>
              </div>
              <span class={statusBadge(listing.status)}>{statusLabel(listing.status)}</span>
            </div>
          {/each}
        </div>
      {/if}
      <a href="/dashboard/umkm/history" class="mt-4 inline-flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700 font-medium">
        Lihat semua penawaran
        <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#arrow-right"/></svg>
      </a>
    </div>

    <!-- Quick Links -->
    <div class="mt-6 grid gap-4 sm:grid-cols-4">
      <a href="/dashboard/umkm/bank" class="quick-link">
        <span class="quick-link-icon">
          <svg class="icon w-5 h-5"><use href="/icons.svg#bank"/></svg>
        </span>
        <div>
          <p class="quick-link-title">Rekening Bank</p>
          <p class="quick-link-desc">Setel rekening penerimaan</p>
        </div>
      </a>
      <a href="/dashboard/umkm/points" class="quick-link">
        <span class="quick-link-icon">
          <svg class="icon w-5 h-5"><use href="/icons.svg#award"/></svg>
        </span>
        <div>
          <p class="quick-link-title">Kupon Poin</p>
          <p class="quick-link-desc">Tukar poin jadi hadiah</p>
        </div>
      </a>
      <a href="/dashboard/umkm/history" class="quick-link">
        <span class="quick-link-icon">
          <svg class="icon w-5 h-5"><use href="/icons.svg#clock-rotate"/></svg>
        </span>
        <div>
          <p class="quick-link-title">Riwayat</p>
          <p class="quick-link-desc">Semua penawaran & pesanan</p>
        </div>
      </a>
    </div>
  </div>
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

{#if notification}
  <NotificationPopup
    type={notification.type}
    title={notification.title}
    message={notification.message}
    ondismiss={dismissNotification}
  />
{/if}
