<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getMyListings, getOrdersAsUmkm, getOrdersAsPerusahaan, getPointsBalance } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(/** @type {any} */ (null));
  let loading = $state(true);
  let dataLoaded = $state(false);

  // Role-specific data
  let umkmStats = $state({ listings: 0, activeOrders: 0, earnings: 0, points: 0 });
  let perusahaanStats = $state({ orders: 0, activeOrders: 0, totalLiters: 0 });
  /** @type {any[]} */ let recentOrders = $state([]);
  /** @type {any[]} */ let recentListings = $state([]);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const { data } = await getProfile(session.user.id);
    if (!data) {
      loading = false;
      return;
    }
    profile = data;

    // Fetch role-specific data
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

      perusahaanStats = {
        orders: orders.length,
        activeOrders: orders.filter(o => !['completed','cancelled'].includes(o.status)).length,
        totalLiters
      };
    }

    dataLoaded = true;
    loading = false;
  });

  /** @param {string} s */ function statusBadge(s) {
    const map = /** @type {Record<string,string>} */ ({
      'available':'badge-green','claimed':'badge-blue','pending':'badge-yellow',
      'confirmed':'badge-blue','picked_up':'badge-green','completed':'badge-green','cancelled':'badge-red'
    });
    return map[s] || 'badge-stone';
  }

  /** @param {number} v */ function formatRupiah(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
  }

  /** @param {string} id */ function shortId(id) { return id?.slice(0, 8) || ''; }
</script>

{#if loading}
  <div class="flex min-h-[40vh] items-center justify-center">
    <p class="text-sm text-stone-400">Memuat...</p>
  </div>

<!-- Profile not found — fallback -->
{:else if !profile}
  <div class="mx-auto max-w-md px-4 py-16 text-center">
    <div class="text-5xl mb-4">🫒</div>
    <h2 class="text-xl font-bold text-stone-800 mb-2">Profil belum tersedia</h2>
    <p class="text-sm text-stone-500 mb-6">Akun Anda belum memiliki profil. Silakan daftar ulang atau hubungi admin.</p>
    <a href="/register" class="btn-primary inline-block px-6 py-2">Daftar Sekarang</a>
  </div>

{:else}
  <div class="mx-auto max-w-6xl px-4 py-8">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div class="flex items-center gap-4">
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-jelantah-100 text-2xl">
          {profile.role === 'umkm' ? '🏪' : '🏭'}
        </div>
        <div>
          <h1 class="text-2xl font-bold text-stone-800">
            {profile.role === 'umkm' ? (profile.umkm_name || profile.full_name) : (profile.company_name || profile.full_name)}
          </h1>
          <p class="text-sm text-stone-500">
            {profile.role === 'umkm' ? 'UMKM — Penjual Minyak Jelantah' : 'Perusahaan — Kolektor Minyak Jelantah'}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <a href="/logout" class="btn-secondary text-xs px-3 py-1.5">Logout</a>
      </div>
    </div>

    <!-- ── Role: UMKM ──────────────────────────────────────────── -->
    {#if profile.role === 'umkm'}
      <!-- Stats row -->
      <div class="grid gap-4 sm:grid-cols-4 mb-8">
        <div class="stat-card">
          <p class="text-xs text-stone-500 uppercase tracking-wide">Total Listing</p>
          <p class="text-2xl font-bold text-stone-800 mt-1">{umkmStats.listings}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs text-stone-500 uppercase tracking-wide">Pesanan Aktif</p>
          <p class="text-2xl font-bold text-jelantah-600 mt-1">{umkmStats.activeOrders}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs text-stone-500 uppercase tracking-wide">Estimasi Pendapatan</p>
          <p class="text-2xl font-bold text-green-600 mt-1">{formatRupiah(umkmStats.earnings)}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs text-stone-500 uppercase tracking-wide">🏆 Kupon Poin</p>
          <p class="text-2xl font-bold text-jelantah-600 mt-1">{umkmStats.points.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <!-- Quick actions + content grid -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Quick actions -->
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-stone-800 mb-4">Aksi Cepat</h2>
          <div class="space-y-3">
            <a href="/dashboard/umkm/listing" class="btn-primary w-full justify-center">+ Ajukan Pickup Baru</a>
            <a href="/dashboard/umkm/bank" class="btn-secondary w-full justify-center">🏦 Rekening Penerimaan</a>
            <a href="/dashboard/umkm/points" class="btn-secondary w-full justify-center">🏆 Tukar Poin</a>
            <a href="/dashboard/umkm/history" class="btn-secondary w-full justify-center">📋 Riwayat & Pembayaran</a>
          </div>
        </div>

        <!-- Recent orders -->
        <div class="card lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-stone-800">Pesanan Masuk</h2>
            <a href="/dashboard/umkm" class="text-xs text-jelantah-600 hover:text-jelantah-700">Lihat semua →</a>
          </div>
          {#if recentOrders.length === 0}
            <p class="text-sm text-stone-400 py-4 text-center">Belum ada pesanan masuk.</p>
          {:else}
            <div class="space-y-2">
              {#each recentOrders as order}
                <div class="flex items-center justify-between border-b border-stone-100 pb-2 last:border-0 last:pb-0">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-stone-800 truncate">
                      #{shortId(order.id)} — {order.requested_liters}L
                    </p>
                    <p class="text-xs text-stone-500">
                      {new Date(order.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                    </p>
                  </div>
                  <span class="{statusBadge(order.status)} text-xs">{order.status}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Recent listings (full width below) -->
        <div class="card lg:col-span-3">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-stone-800">Listing Terbaru</h2>
            <a href="/dashboard/umkm/history" class="text-xs text-jelantah-600 hover:text-jelantah-700">Lihat semua →</a>
          </div>
          {#if recentListings.length === 0}
            <p class="text-sm text-stone-400 py-4 text-center">Belum ada listing. Mulai dengan ajukan pickup baru.</p>
          {:else}
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {#each recentListings as listing}
                <div class="rounded-xl border border-stone-200 p-3">
                  <p class="text-sm font-semibold text-stone-800">{listing.quantity_liters}L</p>
                  <p class="text-xs text-jelantah-600">{formatRupiah(listing.price_per_liter)}/L</p>
                  <p class="text-xs text-stone-400 truncate mt-1">{listing.city || listing.pickup_address?.slice(0, 25)}</p>
                  <span class="{statusBadge(listing.status)} text-xs mt-2 inline-block">{listing.status}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

    <!-- ── Role: Perusahaan ────────────────────────────────────── -->
    {:else}
      <!-- Stats row -->
      <div class="grid gap-4 sm:grid-cols-3 mb-8">
        <div class="stat-card">
          <p class="text-xs text-stone-500 uppercase tracking-wide">Total Pesanan</p>
          <p class="text-2xl font-bold text-stone-800 mt-1">{perusahaanStats.orders}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs text-stone-500 uppercase tracking-wide">Pesanan Aktif</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">{perusahaanStats.activeOrders}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs text-stone-500 uppercase tracking-wide">Total Liter Dikoleksi</p>
          <p class="text-2xl font-bold text-green-600 mt-1">{perusahaanStats.totalLiters} L</p>
        </div>
      </div>

      <!-- Quick actions + content grid -->
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="card lg:col-span-1">
          <h2 class="font-semibold text-stone-800 mb-4">Aksi Cepat</h2>
          <div class="space-y-3">
            <a href="/dashboard/perusahaan/browse" class="btn-primary w-full justify-center">🔍 Cari Listing Minyak</a>
            <a href="/dashboard/perusahaan/orders" class="btn-secondary w-full justify-center">📋 Pesanan Saya</a>
            <a href="/dashboard/payment" class="btn-secondary w-full justify-center">💳 Pembayaran</a>
            <a href="/dashboard/perusahaan" class="btn-secondary w-full justify-center">Dashboard Lengkap</a>
          </div>
        </div>

        <div class="card lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-stone-800">Pesanan Aktif</h2>
            <a href="/dashboard/perusahaan/orders" class="text-xs text-jelantah-600 hover:text-jelantah-700">Lihat semua →</a>
          </div>
          {#if recentOrders.length === 0}
            <p class="text-sm text-stone-400 py-4 text-center">Belum ada pesanan aktif. Mulai dengan mencari listing.</p>
          {:else}
            <div class="space-y-2">
              {#each recentOrders as order}
                <div class="flex items-center justify-between border-b border-stone-100 pb-2 last:border-0 last:pb-0">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-stone-800 truncate">
                      #{shortId(order.id)} — {order.requested_liters}L
                      {#if order.oil_listings?.pickup_address}
                        <span class="font-normal text-stone-500">— {order.oil_listings.pickup_address.slice(0, 25)}</span>
                      {/if}
                    </p>
                    <p class="text-xs text-stone-500">
                      {new Date(order.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                      {#if order.pickup_date} • Jemput: {new Date(order.pickup_date).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}{/if}
                    </p>
                  </div>
                  <span class="{statusBadge(order.status)} text-xs">{order.status}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- ── Profile Card (footer) ────────────────────────────────── -->
    <div class="card mt-8">
      <details class="group">
        <summary class="cursor-pointer text-sm font-semibold text-stone-700 list-none flex items-center gap-2">
          <span>👤 Detail Profil</span>
          <span class="text-stone-400 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <dl class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between border-b border-stone-50 pb-1">
            <dt class="text-stone-500">Nama</dt>
            <dd>{profile.full_name}</dd>
          </div>
          {#if profile.phone}
            <div class="flex justify-between border-b border-stone-50 pb-1">
              <dt class="text-stone-500">Telepon</dt>
              <dd>{profile.phone}</dd>
            </div>
          {/if}
          {#if profile.email}
            <div class="flex justify-between border-b border-stone-50 pb-1">
              <dt class="text-stone-500">Email</dt>
              <dd>{profile.email}</dd>
            </div>
          {/if}
          {#if profile.address}
            <div class="flex justify-between border-b border-stone-50 pb-1">
              <dt class="text-stone-500">Alamat</dt>
              <dd class="text-right max-w-xs">{profile.address}</dd>
            </div>
          {/if}
          {#if profile.umkm_name}
            <div class="flex justify-between border-b border-stone-50 pb-1">
              <dt class="text-stone-500">Nama Usaha</dt>
              <dd>{profile.umkm_name}</dd>
            </div>
          {/if}
          {#if profile.umkm_type}
            <div class="flex justify-between border-b border-stone-50 pb-1">
              <dt class="text-stone-500">Jenis UMKM</dt>
              <dd>{profile.umkm_type}</dd>
            </div>
          {/if}
          {#if profile.company_name}
            <div class="flex justify-between border-b border-stone-50 pb-1">
              <dt class="text-stone-500">Perusahaan</dt>
              <dd>{profile.company_name}</dd>
            </div>
          {/if}
          {#if profile.company_nib}
            <div class="flex justify-between border-b border-stone-50 pb-1">
              <dt class="text-stone-500">NIB</dt>
              <dd>{profile.company_nib}</dd>
            </div>
          {/if}
        </dl>
      </details>
    </div>

  </div>
{/if}