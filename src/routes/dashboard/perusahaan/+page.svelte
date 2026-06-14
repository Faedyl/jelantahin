<script>
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getOrdersAsPerusahaan } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import NotificationPopup from '$lib/NotificationPopup.svelte';

  let profile = $state(null);
  let orders = $state([]);
  let stats = $state({ totalOrders: 0, activeOrders: 0, totalLiters: 0 });
  let loading = $state(true);
  let interval;

  /** Notification popup state */
  let notification = $state(null);

  /** Snapshot of order statuses to detect remote changes */
  let orderStatusSnapshot = $state({});

  function showNotification(type, title, message) {
    notification = { type, title, message, noSound: true };
  }

  function dismissNotification() {
    notification = null;
  }

  /** Update snapshot after local action to avoid polling re-trigger */
  function updateSnapshot(orderId, newStatus) {
    orderStatusSnapshot = { ...orderStatusSnapshot, [orderId]: newStatus };
  }

  /**
   * Watch for status changes made by UMKM — plays sound for the involved party.
   */
  function watchRemoteChanges(currentOrders) {
    for (const order of currentOrders) {
      const oldStatus = orderStatusSnapshot[order.id];
      const newStatus = order.status;
      if (!oldStatus || oldStatus === newStatus) continue;

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
    const snap = {};
    for (const o of currentOrders) snap[o.id] = o.status;
    orderStatusSnapshot = snap;
  }

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'perusahaan') return goto('/dashboard');
    profile = userProfile.data;

    const ordersRes = await getOrdersAsPerusahaan(session.user.id);
    orders = ordersRes.data || [];

    // Init snapshot
    const snap = {};
    for (const o of orders) snap[o.id] = o.status;
    orderStatusSnapshot = snap;

    const active = orders.filter(o => !['completed','cancelled'].includes(o.status));
    const totalLiters = orders.reduce((sum, o) => sum + parseFloat(o.requested_liters || 0), 0);

    stats = { totalOrders: orders.length, activeOrders: active.length, totalLiters };
    loading = false;

    // Auto-refresh every 3s for remote change detection
    interval = setInterval(async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return;
      const { data } = await getOrdersAsPerusahaan(s.user.id);
      if (data) {
        orders = data;
        watchRemoteChanges(data);
        // Refresh stats too
        const activeOrders = data.filter(o => !['completed','cancelled'].includes(o.status));
        const totalL = data.reduce((sum, o) => sum + parseFloat(o.requested_liters || 0), 0);
        stats = { totalOrders: data.length, activeOrders: activeOrders.length, totalLiters: totalL };
      }
    }, 3000);
  });

  onDestroy(() => clearInterval(interval));

  function statusBadge(s) {
    const map = { 'pending':'badge-warning','confirmed':'badge-info','picked_up':'badge-success','completed':'badge-success','cancelled':'badge-danger','confirmed_by_umkm':'badge-warning','picked_up_by_perusahaan':'badge-info','completed_by_perusahaan':'badge-info' };
    return map[s] || 'badge-default';
  }

  function statusLabel(s) {
    const map = {
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
  <div class="flex min-h-[40vh] items-center justify-center"><p class="text-earth-600">Memuat...</p></div>
{:else}
  <div class="page-container py-8">
    <div class="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="page-title">Dashboard Perusahaan</h1>
        <p class="page-subtitle">Cari dan klaim minyak jelantah dari UMKM</p>
      </div>
      <a href="/dashboard/perusahaan/browse" class="btn-primary btn-md">Cari Minyak</a>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 sm:grid-cols-3 mb-8">
      <div class="stat">
        <p class="stat-label">Total Pesanan</p>
        <p class="stat-value">{stats.totalOrders}</p>
      </div>
      <div class="stat">
        <p class="stat-label">Pesanan Aktif</p>
        <p class="stat-value text-blue-600 mt-1">{stats.activeOrders}</p>
      </div>
      <div class="stat">
        <p class="stat-label">Total Litter Dikoleksi</p>
        <p class="stat-value text-herb-600 mt-1">{stats.totalLiters} L</p>
      </div>
    </div>

    <!-- Active Orders -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-earth-900">Pesanan Aktif</h2>
        <a href="/dashboard/perusahaan/orders" class="text-sm text-gold-600 hover:text-gold-700">Lihat semua →</a>
      </div>

      {#if orders.length === 0}
        <p class="text-sm text-earth-600">Belum ada pesanan. Mulai dengan mencari listing minyak.</p>
      {:else}
        <div class="divide-y divide-earth-200/60">
          {#each orders.filter(o => !['completed','cancelled'].includes(o.status)) as order}
            <div class="flex items-center justify-between py-3">
              <div>
                <p class="text-sm font-medium text-earth-900">
                  {order.requested_liters}L — #{order.id.slice(0,8)}
                </p>
                <p class="text-xs text-earth-600">
                  {new Date(order.created_at).toLocaleDateString('id-ID')}
                  {#if order.pickup_date} • Jemput: {new Date(order.pickup_date).toLocaleDateString('id-ID')}{/if}
                </p>
              </div>
              <span class="{statusBadge(order.status)}">{statusLabel(order.status)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
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
