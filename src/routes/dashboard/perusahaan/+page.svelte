<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getOrdersAsPerusahaan } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let orders = $state([]);
  let stats = $state({ totalOrders: 0, activeOrders: 0, totalLiters: 0 });
  let loading = $state(true);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'perusahaan') return goto('/dashboard');
    profile = userProfile.data;

    const ordersRes = await getOrdersAsPerusahaan(session.user.id);
    orders = ordersRes.data || [];

    const active = orders.filter(o => !['completed','cancelled'].includes(o.status));
    const totalLiters = orders.reduce((sum, o) => sum + parseFloat(o.requested_liters || 0), 0);

    stats = { totalOrders: orders.length, activeOrders: active.length, totalLiters };
    loading = false;
  });

  function statusBadge(s) {
    const map = { 'pending':'badge-yellow','confirmed':'badge-blue','picked_up':'badge-green','completed':'badge-green','cancelled':'badge-red' };
    return map[s] || 'badge-stone';
  }
</script>

{#if loading}
  <div class="flex min-h-[40vh] items-center justify-center"><p class="text-stone-400">Memuat...</p></div>
{:else}
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-stone-800">Dashboard Perusahaan</h1>
        <p class="text-sm text-stone-500">Cari dan klaim minyak jelantah dari UMKM</p>
      </div>
      <a href="/dashboard/perusahaan/browse" class="btn-primary">Cari Minyak</a>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 sm:grid-cols-3 mb-8">
      <div class="stat-card">
        <p class="text-xs text-stone-500 uppercase tracking-wide">Total Pesanan</p>
        <p class="text-2xl font-bold text-stone-800 mt-1">{stats.totalOrders}</p>
      </div>
      <div class="stat-card">
        <p class="text-xs text-stone-500 uppercase tracking-wide">Pesanan Aktif</p>
        <p class="text-2xl font-bold text-blue-600 mt-1">{stats.activeOrders}</p>
      </div>
      <div class="stat-card">
        <p class="text-xs text-stone-500 uppercase tracking-wide">Total Litter Dikoleksi</p>
        <p class="text-2xl font-bold text-green-600 mt-1">{stats.totalLiters} L</p>
      </div>
    </div>

    <!-- Active Orders -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-stone-800">Pesanan Aktif</h2>
        <a href="/dashboard/perusahaan/orders" class="text-sm text-jelantah-600 hover:text-jelantah-700">Lihat semua →</a>
      </div>

      {#if orders.length === 0}
        <p class="text-sm text-stone-400">Belum ada pesanan. Mulai dengan mencari listing minyak.</p>
      {:else}
        <div class="divide-y divide-stone-100">
          {#each orders.filter(o => !['completed','cancelled'].includes(o.status)) as order}
            <div class="flex items-center justify-between py-3">
              <div>
                <p class="text-sm font-medium text-stone-800">
                  {order.requested_liters}L — #{order.id.slice(0,8)}
                </p>
                <p class="text-xs text-stone-500">
                  {new Date(order.created_at).toLocaleDateString('id-ID')}
                  {#if order.pickup_date} • Jemput: {new Date(order.pickup_date).toLocaleDateString('id-ID')}{/if}
                </p>
              </div>
              <span class="{statusBadge(order.status)}">{order.status}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}