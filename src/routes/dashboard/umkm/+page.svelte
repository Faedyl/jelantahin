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
      'available': 'badge-green',
      'claimed': 'badge-blue',
      'completed': 'badge-green',
      'cancelled': 'badge-red',
      'pending': 'badge-yellow',
      'confirmed': 'badge-blue',
      'picked_up': 'badge-green'
    };
    return map[status] || 'badge-stone';
  }
</script>

{#if loading}
  <div class="flex min-h-[40vh] items-center justify-center"><p class="text-stone-400">Memuat...</p></div>
{:else}
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-stone-800">Dashboard UMKM</h1>
        <p class="text-sm text-stone-500">Kelola penjualan minyak jelantah Anda</p>
      </div>
      <a href="/dashboard/umkm/listing" class="btn-primary">+ Tambah Listing</a>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 sm:grid-cols-4 mb-8">
      <div class="stat-card">
        <p class="text-xs text-stone-500 uppercase tracking-wide">Total Listing</p>
        <p class="text-2xl font-bold text-stone-800 mt-1">{stats.totalListings}</p>
      </div>
      <div class="stat-card">
        <p class="text-xs text-stone-500 uppercase tracking-wide">Pesanan Aktif</p>
        <p class="text-2xl font-bold text-jelantah-600 mt-1">{stats.activeOrders}</p>
      </div>
      <div class="stat-card">
        <p class="text-xs text-stone-500 uppercase tracking-wide">Estimasi Pendapatan</p>
        <p class="text-2xl font-bold text-green-600 mt-1">
          Rp {stats.totalEarnings.toLocaleString('id-ID')}
        </p>
      </div>
      <a href="/dashboard/umkm/points" class="stat-card block hover:shadow-md transition-shadow">
        <p class="text-xs text-stone-500 uppercase tracking-wide">🏆 Kupon Poin</p>
        <p class="text-2xl font-bold text-jelantah-600 mt-1">
          {((stats.activeOrders || 0) * 50).toLocaleString('id-ID')}
        </p>
        <p class="text-xs text-jelantah-500 mt-0.5">Klik untuk tukar →</p>
      </a>
    </div>

    <!-- Active Orders -->
    <div class="card mb-6">
      <h2 class="font-semibold text-stone-800 mb-4">Pesanan Masuk</h2>
      {#if orders.length === 0}
        <p class="text-sm text-stone-400">Belum ada pesanan.</p>
      {:else}
        <div class="space-y-3">
          {#each orders.filter(o => !['completed','cancelled'].includes(o.status)) as order}
            <div class="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0 last:pb-0">
              <div>
                <p class="text-sm font-medium text-stone-800">
                  Pesanan #{order.id.slice(0,8)}
                </p>
                <p class="text-xs text-stone-500">
                  {order.requested_liters}L — {new Date(order.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
              <span class="{statusBadge(order.status)}">{order.status}</span>
            </div>
          {/each}
        </div>
      {/if}
      <a href="/dashboard/umkm/history" class="mt-4 inline-block text-sm text-jelantah-600 hover:text-jelantah-700">Lihat riwayat lengkap →</a>
    </div>

    <!-- My Listings -->
    <div class="card">
      <h2 class="font-semibold text-stone-800 mb-4">Listing Saya</h2>
      {#if listings.length === 0}
        <p class="text-sm text-stone-400">Belum ada listing. Mulai dengan tambah listing baru.</p>
      {:else}
        <div class="space-y-3">
          {#each listings.slice(0, 5) as listing}
            <div class="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0 last:pb-0">
              <div>
                <p class="text-sm font-medium text-stone-800">{listing.quantity_liters}L — Rp {Number(listing.price_per_liter).toLocaleString('id-ID')}/L</p>
                <p class="text-xs text-stone-500">{listing.city || listing.pickup_address?.slice(0,30)}</p>
              </div>
              <span class="{statusBadge(listing.status)}">{listing.status}</span>
            </div>
          {/each}
        </div>
      {/if}
      <a href="/dashboard/umkm/history" class="mt-4 inline-block text-sm text-jelantah-600 hover:text-jelantah-700">Lihat semua listing →</a>
    </div>

    <!-- Quick Links -->
    <div class="mt-6 grid gap-4 sm:grid-cols-4">
      <a href="/dashboard/umkm/bank" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
        <span class="text-2xl">🏦</span>
        <div>
          <p class="font-semibold text-stone-800 text-sm">Rekening Bank</p>
          <p class="text-xs text-stone-500">Setel rekening penerimaan</p>
        </div>
      </a>
      <a href="/dashboard/umkm/points" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
        <span class="text-2xl">🏆</span>
        <div>
          <p class="font-semibold text-stone-800 text-sm">Kupon Poin</p>
          <p class="text-xs text-stone-500">Tukar poin jadi hadiah</p>
        </div>
      </a>
      <a href="/dashboard/umkm/history" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
        <span class="text-2xl">📋</span>
        <div>
          <p class="font-semibold text-stone-800 text-sm">Riwayat</p>
          <p class="text-xs text-stone-500">Semua listing & pesanan</p>
        </div>
      </a>
      <a href="/dashboard/payment" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
        <span class="text-2xl">💳</span>
        <div>
          <p class="font-semibold text-stone-800 text-sm">Pembayaran</p>
          <p class="text-xs text-stone-500">Konfirmasi & riwayat</p>
        </div>
      </a>
    </div>
  </div>
{/if}