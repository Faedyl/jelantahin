<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getMyListings, getOrdersAsUmkm, getOrdersAsPerusahaan, getPointsBalance } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let loading = $state(true);
  let dataLoaded = $state(false);

  // Role-specific data
  let umkmStats = $state({ listings: 0, activeOrders: 0, earnings: 0, points: 0 });
  let perusahaanStats = $state({ orders: 0, activeOrders: 0, totalLiters: 0 });
  let recentOrders = $state([]);
  let recentListings = $state([]);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const { data } = await getProfile(session.user.id);
    if (!data) { loading = false; return; }
    profile = data;

    if (data.role === 'umkm') {
      const [listingsRes, ordersRes, pointsRes] = await Promise.all([
        getMyListings(session.user.id),
        getOrdersAsUmkm(session.user.id),
        getPointsBalance(session.user.id),
      ]);
      const listings = listingsRes.data || [];
      const orders = ordersRes.data || [];
      recentListings = listings.slice(0, 4);
      recentOrders = orders.filter(o => !['completed','cancelled'].includes(o.status)).slice(0, 4);
      const completedTx = orders.filter(o => o.status === 'completed');
      const earnings = completedTx.reduce((sum, o) => sum + (parseFloat(o.requested_liters || 0) * 8000), 0);
      umkmStats = {
        listings: listings.length,
        activeOrders: orders.filter(o => !['completed','cancelled'].includes(o.status)).length,
        earnings,
        points: pointsRes.data?.balance || 0,
      };
    } else if (data.role === 'perusahaan') {
      const ordersRes = await getOrdersAsPerusahaan(session.user.id);
      const orders = ordersRes.data || [];
      recentOrders = orders.filter(o => !['completed','cancelled'].includes(o.status)).slice(0, 4);
      const totalLiters = orders.reduce((sum, o) => sum + parseFloat(o.requested_liters || 0), 0);
      perusahaanStats = { orders: orders.length, activeOrders: orders.filter(o => !['completed','cancelled'].includes(o.status)).length, totalLiters };
    }

    dataLoaded = true;
    loading = false;
  });

  function statusBadge(s) {
    const map = {
      'available':'badge-success','claimed':'badge-info','pending':'badge-warning',
      'confirmed':'badge-info','picked_up':'badge-success','completed':'badge-success','cancelled':'badge-danger',
      'confirmed_by_umkm':'badge-warning','picked_up_by_perusahaan':'badge-info','completed_by_perusahaan':'badge-info'
    };
    return map[s] || 'badge-default';
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

  function formatRupiah(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
  }
  function shortId(id) { return id?.slice(0, 8) || ''; }
</script>

{#if loading}
  <div class="flex min-h-[40vh] items-center justify-center">
    <svg class="icon w-8 h-8 text-gold-500 icon-spin"><use href="/icons.svg#loader"/></svg>
  </div>

{:else if !profile}
  <div class="empty-state">
    <svg class="empty-state-icon"><use href="/icons.svg#user"/></svg>
    <h2 class="empty-state-title">Profil belum tersedia</h2>
    <p class="empty-state-desc mb-6">Akun Anda belum memiliki profil. Silakan daftar ulang atau hubungi admin.</p>
    <a href="/register" class="btn-primary btn-md">Daftar Sekarang</a>
  </div>

{:else}
  <div class="page-container py-8">
    <!-- ═══ Header ═══ -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div class="flex items-center gap-4">
        <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-gold-200/70 text-gold-600">
          {#if profile.role === 'umkm'}
            <svg class="icon w-7 h-7"><use href="/icons.svg#shop"/></svg>
          {:else}
            <svg class="icon w-7 h-7"><use href="/icons.svg#building"/></svg>
          {/if}
        </div>
        <div>
          <h1 class="page-title">
            {profile.role === 'umkm' ? (profile.umkm_name || profile.full_name) : (profile.company_name || profile.full_name)}
          </h1>
          <p class="page-subtitle">
            {profile.role === 'umkm' ? 'UMKM — Penjual Minyak Jelantah' : 'Perusahaan — Kolektor Minyak Jelantah'}
          </p>
        </div>
      </div>
    </div>

    <!-- ═══ ROLE: UMKM ═══ -->
    {#if profile.role === 'umkm'}
      <!-- Stats -->
      <div class="grid gap-4 sm:grid-cols-4 mb-8">
        <div class="stat">
          <p class="stat-label">Total Penawaran</p>
          <p class="stat-value">{umkmStats.listings}</p>
        </div>
        <div class="stat">
          <p class="stat-label">Pesanan Aktif</p>
          <p class="stat-value stat-accent">{umkmStats.activeOrders}</p>
        </div>
        <div class="stat">
          <p class="stat-label">Estimasi Pendapatan</p>
          <p class="stat-value" class:text-herb-600={umkmStats.earnings > 0}>{formatRupiah(umkmStats.earnings)}</p>
        </div>
        <a href="/dashboard/umkm/points" class="stat block hover:shadow-brand-md transition-all duration-200 group">
          <p class="stat-label flex items-center gap-1">
            <svg class="icon w-3 h-3 text-gold-500"><use href="/icons.svg#award"/></svg>
            Kupon Poin
          </p>
          <p class="stat-value stat-accent">{umkmStats.points.toLocaleString('id-ID')}</p>
          <p class="text-xs text-gold-600 mt-0.5 group-hover:underline">1L = 10 poin • Tukar →</p>
        </a>
      </div>

      <!-- Content grid -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Quick actions -->
        <div class="card p-5 lg:col-span-1 min-w-0">
          <h2 class="font-semibold text-earth-900 mb-4 font-display">Aksi Cepat</h2>
          <div class="space-y-2.5">
            <a href="/dashboard/umkm/listing" class="btn-primary w-full btn-sm justify-start">
              <svg class="icon w-4 h-4"><use href="/icons.svg#package"/></svg>
              Ajukan Pickup Baru
            </a>
            <a href="/dashboard/umkm/bank" class="btn-secondary w-full btn-sm justify-start">
              <svg class="icon w-4 h-4"><use href="/icons.svg#bank"/></svg>
              Rekening Penerimaan
            </a>
            <a href="/dashboard/umkm/points" class="btn-secondary w-full btn-sm justify-start">
              <svg class="icon w-4 h-4"><use href="/icons.svg#award"/></svg>
              Tukar Poin
            </a>
            <a href="/dashboard/umkm/history" class="btn-secondary w-full btn-sm justify-start">
              <svg class="icon w-4 h-4"><use href="/icons.svg#clock-rotate"/></svg>
              Riwayat & Pembayaran
            </a>
          </div>
        </div>

        <!-- Recent orders -->
        <div class="card p-5 lg:col-span-2 min-w-0">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-earth-900 font-display">Pesanan Masuk</h2>
            <a href="/dashboard/umkm" class="text-xs font-medium text-gold-600 hover:text-gold-700 transition-colors inline-flex items-center gap-1">
              Lihat semua
              <svg class="icon w-3 h-3"><use href="/icons.svg#arrow-right"/></svg>
            </a>
          </div>
          {#if recentOrders.length === 0}
            <div class="empty-state py-8">
              <svg class="w-10 h-10 text-earth-400 mb-3"><use href="/icons.svg#package"/></svg>
              <p class="text-sm text-earth-500">Belum ada pesanan masuk.</p>
            </div>
          {:else}
            <div class="space-y-2">
              {#each recentOrders as order}
                <div class="flex items-center justify-between rounded-md p-3 -mx-1 hover:bg-earth-100 transition-colors gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-earth-900 truncate">
                      #{shortId(order.id)} — {order.requested_liters}L
                    </p>
                    <p class="text-xs text-earth-600">
                      {new Date(order.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                    </p>
                  </div>
                  <span class="{statusBadge(order.status)} text-xs flex-shrink-0">{statusLabel(order.status)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Recent listings -->
        <div class="card p-5 lg:col-span-3">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-earth-900 font-display">Penawaran Terbaru</h2>
            <a href="/dashboard/umkm/history" class="text-xs font-medium text-gold-600 hover:text-gold-700 transition-colors inline-flex items-center gap-1">
              Lihat semua
              <svg class="icon w-3 h-3"><use href="/icons.svg#arrow-right"/></svg>
            </a>
          </div>
          {#if recentListings.length === 0}
            <div class="empty-state py-8">
              <svg class="w-10 h-10 text-earth-400 mb-3"><use href="/icons.svg#package"/></svg>
              <p class="text-sm text-earth-500">Belum ada penawaran. Mulai dengan ajukan pickup baru.</p>
            </div>
          {:else}
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {#each recentListings as listing}
                <div class="rounded-lg border border-earth-300/60 p-4 hover:shadow-brand-sm transition-shadow">
                  <p class="font-semibold text-earth-900 font-display">{listing.quantity_liters}L</p>
                  <p class="text-xs text-gold-600 font-medium">{formatRupiah(listing.price_per_liter)}/L</p>
                  <p class="text-xs text-earth-500 truncate mt-1">{listing.city || listing.pickup_address?.slice(0, 25)}</p>
                  <span class="{statusBadge(listing.status)} text-xs mt-2 inline-block">{statusLabel(listing.status)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

    <!-- ═══ ROLE: Perusahaan ═══ -->
    {:else}
      <!-- Stats -->
      <div class="grid gap-4 sm:grid-cols-3 mb-8">
        <div class="stat">
          <p class="stat-label">Total Pesanan</p>
          <p class="stat-value">{perusahaanStats.orders}</p>
        </div>
        <div class="stat">
          <p class="stat-label">Pesanan Aktif</p>
          <p class="stat-value text-info">{perusahaanStats.activeOrders}</p>
        </div>
        <div class="stat">
          <p class="stat-label">Total Liter Dikoleksi</p>
          <p class="stat-value text-herb-600">{perusahaanStats.totalLiters} L</p>
        </div>
      </div>

      <!-- Quick actions + content -->
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="card p-5 lg:col-span-1 min-w-0">
          <h2 class="font-semibold text-earth-900 mb-4 font-display">Aksi Cepat</h2>
          <div class="space-y-2.5">
            <a href="/dashboard/perusahaan/browse" class="btn-primary w-full btn-sm justify-start">
              <svg class="icon w-4 h-4"><use href="/icons.svg#search"/></svg>
              Cari Listing Minyak
            </a>
            <a href="/dashboard/perusahaan/orders" class="btn-secondary w-full btn-sm justify-start">
              <svg class="icon w-4 h-4"><use href="/icons.svg#package"/></svg>
              Pesanan Saya
            </a>
            <a href="/dashboard/payment" class="btn-secondary w-full btn-sm justify-start">
              <svg class="icon w-4 h-4"><use href="/icons.svg#credit-card"/></svg>
              Pembayaran
            </a>
          </div>
        </div>

        <div class="card p-5 lg:col-span-2 min-w-0">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-earth-900 font-display">Pesanan Aktif</h2>
            <a href="/dashboard/perusahaan/orders" class="text-xs font-medium text-gold-600 hover:text-gold-700 transition-colors inline-flex items-center gap-1">
              Lihat semua
              <svg class="icon w-3 h-3"><use href="/icons.svg#arrow-right"/></svg>
            </a>
          </div>
          {#if recentOrders.length === 0}
            <div class="empty-state py-8">
              <svg class="w-10 h-10 text-earth-400 mb-3"><use href="/icons.svg#package"/></svg>
              <p class="text-sm text-earth-500">Belum ada pesanan aktif. Mulai dengan mencari listing.</p>
            </div>
          {:else}
            <div class="space-y-2">
              {#each recentOrders as order}
                <div class="flex items-center justify-between rounded-md p-3 -mx-1 hover:bg-earth-100 transition-colors gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-earth-900 truncate">
                      #{shortId(order.id)} — {order.requested_liters}L
                      {#if order.oil_listings?.pickup_address}
                        <span class="font-normal text-earth-500">— {order.oil_listings.pickup_address.slice(0, 25)}</span>
                      {/if}
                    </p>
                    <p class="text-xs text-earth-600">
                      {new Date(order.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                      {#if order.pickup_date} • Jemput: {new Date(order.pickup_date).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}{/if}
                    </p>
                  </div>
                  <span class="{statusBadge(order.status)} text-xs flex-shrink-0">{statusLabel(order.status)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- ═══ Profile Card ═══ -->
    <details class="card mt-8 group">
      <summary class="flex cursor-pointer items-center gap-2 p-5 font-semibold text-earth-800 list-none font-display">
        <svg class="icon w-4 h-4 text-earth-500"><use href="/icons.svg#user"/></svg>
        Detail Profil
        <svg class="icon w-4 h-4 text-earth-400 ml-auto group-open:rotate-180 transition-transform"><use href="/icons.svg#chevron-down"/></svg>
      </summary>
      <div class="px-5 pb-5 space-y-2 text-sm">
        <div class="flex justify-between py-1.5 border-b border-earth-200/60">
          <span class="text-earth-600">Nama</span>
          <span class="font-medium text-earth-900">{profile.full_name}</span>
        </div>
        {#if profile.phone}
          <div class="flex justify-between py-1.5 border-b border-earth-200/60">
            <span class="text-earth-600">Telepon</span>
            <span>{profile.phone}</span>
          </div>
        {/if}
        {#if profile.email}
          <div class="flex justify-between py-1.5 border-b border-earth-200/60">
            <span class="text-earth-600">Email</span>
            <span>{profile.email}</span>
          </div>
        {/if}
        {#if profile.address}
          <div class="flex justify-between gap-2 py-1.5 border-b border-earth-200/60">
            <span class="text-earth-600 flex-shrink-0">Alamat</span>
            <span class="text-right break-words max-w-[60%]">{profile.address}</span>
          </div>
        {/if}
        {#if profile.umkm_name}
          <div class="flex justify-between py-1.5 border-b border-earth-200/60">
            <span class="text-earth-600">Nama Usaha</span>
            <span class="font-medium">{profile.umkm_name}</span>
          </div>
        {/if}
        {#if profile.umkm_type}
          <div class="flex justify-between py-1.5 border-b border-earth-200/60">
            <span class="text-earth-600">Jenis UMKM</span>
            <span>{profile.umkm_type}</span>
          </div>
        {/if}
        {#if profile.company_name}
          <div class="flex justify-between py-1.5 border-b border-earth-200/60">
            <span class="text-earth-600">Perusahaan</span>
            <span class="font-medium">{profile.company_name}</span>
          </div>
        {/if}
        {#if profile.company_nib}
          <div class="flex justify-between py-1.5">
            <span class="text-earth-600">NIB</span>
            <span>{profile.company_nib}</span>
          </div>
        {/if}
      </div>
    </details>
  </div>
{/if}
