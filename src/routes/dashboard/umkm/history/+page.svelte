<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getMyListings, getOrdersAsUmkm } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let listings = $state([]);
  let orders = $state([]);
  let tab = $state('listings');
  let loading = $state(true);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'umkm') return goto('/dashboard');
    profile = userProfile.data;

    const [listingsRes, ordersRes] = await Promise.all([
      getMyListings(session.user.id),
      getOrdersAsUmkm(session.user.id)
    ]);
    listings = listingsRes.data || [];
    orders = ordersRes.data || [];
    loading = false;
  });

  function statusBadge(s) {
    const map = { 'available':'badge-green','claimed':'badge-blue','completed':'badge-green','cancelled':'badge-red','pending':'badge-yellow','confirmed':'badge-blue','picked_up':'badge-green' };
    return map[s] || 'badge-stone';
  }
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <a href="/dashboard/umkm" class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">← Kembali ke Dashboard</a>
  <h1 class="text-xl font-bold text-stone-800 mb-6">Riwayat & Listing</h1>

  <div class="flex gap-2 mb-6">
    <button onclick={() => tab = 'listings'} class="px-4 py-2 text-sm rounded-lg {tab === 'listings' ? 'bg-jelantah-100 text-jelantah-700 font-semibold' : 'text-stone-500 hover:bg-stone-100'}">Listing</button>
    <button onclick={() => tab = 'orders'} class="px-4 py-2 text-sm rounded-lg {tab === 'orders' ? 'bg-jelantah-100 text-jelantah-700 font-semibold' : 'text-stone-500 hover:bg-stone-100'}">Pesanan</button>
  </div>

  {#if loading}
    <p class="text-stone-400 text-sm">Memuat...</p>
  {:else if tab === 'listings'}
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-stone-800">Semua Listing ({listings.length})</h2>
        <a href="/dashboard/umkm/listing" class="text-sm text-jelantah-600 hover:text-jelantah-700">+ Baru</a>
      </div>
      {#if listings.length === 0}
        <p class="text-sm text-stone-400">Belum ada listing.</p>
      {:else}
        <div class="divide-y divide-stone-100">
          {#each listings as listing}
            <div class="flex items-center justify-between py-3">
              <div>
                <p class="text-sm font-medium text-stone-800">{listing.quantity_liters}L @ Rp {Number(listing.price_per_liter).toLocaleString('id-ID')}/L</p>
                <p class="text-xs text-stone-500">{listing.city || listing.pickup_address?.slice(0,30)} • {new Date(listing.created_at).toLocaleDateString('id-ID')}</p>
              </div>
              <span class="{statusBadge(listing.status)}">{listing.status}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else}
    <div class="card">
      <h2 class="font-semibold text-stone-800 mb-4">Riwayat Pesanan ({orders.length})</h2>
      {#if orders.length === 0}
        <p class="text-sm text-stone-400">Belum ada pesanan.</p>
      {:else}
        <div class="divide-y divide-stone-100">
          {#each orders as order}
            <div class="flex items-center justify-between py-3">
              <div>
                <p class="text-sm font-medium text-stone-800">
                  Pesanan #{order.id.slice(0,8)} — {order.requested_liters}L
                </p>
                <p class="text-xs text-stone-500">
                  {new Date(order.created_at).toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                  {#if order.pickup_date} • Jemput: {new Date(order.pickup_date).toLocaleDateString('id-ID')}{/if}
                </p>
              </div>
              <span class="{statusBadge(order.status)}">{order.status}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>