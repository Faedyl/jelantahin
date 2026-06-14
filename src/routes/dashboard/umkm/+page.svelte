<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getMyListings, getOrdersAsUmkm } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let listings = $state([]);
  let orders = $state([]);
  let stats = $state({ totalListings: 0, activeOrders: 0, totalEarnings: 0 });
  let loading = $state(true);

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

    const completedTx = orders.filter(o => o.status === 'completed');
    const totalEarnings = completedTx.reduce((sum, o) => {
      return sum + (parseFloat(o.requested_liters) * 8000); // estimasi Rp 8k/liter
    }, 0);

    stats = {
      totalListings: listings.length,
      activeOrders: orders.filter(o => !['completed','cancelled'].includes(o.status)).length,
      totalEarnings
    };

    loading = false;
  });

  function statusBadge(status) {
    const map = {
      'available': 'badge-success',
      'claimed': 'badge-info',
      'completed': 'badge-success',
      'cancelled': 'badge-danger',
      'pending': 'badge-warning',
      'confirmed': 'badge-info',
      'picked_up': 'badge-success'
    };
    return map[status] || 'badge-default';
  }
</script>

{#if loading}
  <div class="flex min-h-[40vh] items-center justify-center">
    <svg class="icon w-6 h-6 text-earth-500 animate-spin"><use href="/icons.svg#loader"/></svg>
    <span class="ml-2 text-sm text-earth-600">Memuat...</span>
  </div>
{:else}
  <div class="page-container py-8">
    <!-- Page Header -->
    <div class="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="page-title">Dashboard UMKM</h1>
        <p class="page-subtitle">Kelola penjualan minyak jelantah Anda</p>
      </div>
      <a href="/dashboard/umkm/listing" class="btn-primary btn-md">
        <svg class="icon w-4 h-4"><use href="/icons.svg#package"/></svg>
        Tambah Listing
      </a>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 sm:grid-cols-4 mb-8">
      <div class="stat">
        <p class="stat-label">
          <svg class="icon w-3.5 h-3.5 inline mr-1"><use href="/icons.svg#package"/></svg>
          Total Listing
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
          {((stats.activeOrders || 0) * 50).toLocaleString('id-ID')}
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
                </div>
              </div>
              <span class={statusBadge(order.status)}>{order.status}</span>
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
          <h2 class="order-card-title">Listing Saya</h2>
        </div>
      </div>
      {#if listings.length === 0}
        <div class="empty-state py-8">
          <svg class="empty-state-icon w-12 h-12"><use href="/icons.svg#shop"/></svg>
          <p class="empty-state-title">Belum ada listing</p>
          <p class="empty-state-desc">Mulai dengan tambah listing baru.</p>
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
              <span class={statusBadge(listing.status)}>{listing.status}</span>
            </div>
          {/each}
        </div>
      {/if}
      <a href="/dashboard/umkm/history" class="mt-4 inline-flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700 font-medium">
        Lihat semua listing
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
          <p class="quick-link-desc">Semua listing & pesanan</p>
        </div>
      </a>
      <a href="/dashboard/payment" class="quick-link">
        <span class="quick-link-icon">
          <svg class="icon w-5 h-5"><use href="/icons.svg#credit-card"/></svg>
        </span>
        <div>
          <p class="quick-link-title">Pembayaran</p>
          <p class="quick-link-desc">Konfirmasi & riwayat</p>
        </div>
      </a>
    </div>
  </div>
{/if}
