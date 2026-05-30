<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getAvailableListings, createOrder, updateListing } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let listings = $state([]);
  let loading = $state(true);
  let actionLoading = $state(false);
  let error = $state('');

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'perusahaan') return goto('/dashboard');
    profile = userProfile.data;

    const res = await getAvailableListings();
    listings = res.data || [];
    loading = false;
  });

  async function claimListing(listing) {
    if (!confirm(`Klaim ${listing.quantity_liters}L dari UMKM ini?`)) return;
    actionLoading = true;
    error = '';

    const { error: orderErr } = await createOrder({
      listing_id: listing.id,
      perusahaan_id: profile.id,
      umkm_id: listing.umkm_id,
      requested_liters: listing.quantity_liters,
      pickup_date: null
    });

    if (orderErr) { error = orderErr.message; actionLoading = false; return; }

    await updateListing(listing.id, { status: 'claimed' });
    actionLoading = false;
    goto('/dashboard/perusahaan/orders');
  }
</script>

<div class="mx-auto max-w-5xl px-4 py-8">
  <a href="/dashboard/perusahaan" class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">← Kembali ke Dashboard</a>
  <h1 class="text-xl font-bold text-stone-800 mb-6">Listing Minyak Tersedia</h1>

  {#if error}
    <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  {#if loading}
    <p class="text-stone-400 text-sm">Memuat...</p>
  {:else if listings.length === 0}
    <div class="card text-center py-12">
      <p class="text-stone-400">Belum ada listing minyak tersedia saat ini.</p>
      <p class="text-sm text-stone-400 mt-1">Coba lagi nanti atau perluas area pencarian.</p>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2">
      {#each listings as listing}
        <div class="card">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-stone-800">{listing.profiles?.umkm_name || listing.profiles?.full_name || 'UMKM'}</h3>
              <p class="text-xs text-stone-500">{listing.city || listing.pickup_address?.slice(0, 30)}</p>
            </div>
            <span class="badge-green">Available</span>
          </div>

          <div class="flex gap-4 text-sm mb-4">
            <div>
              <p class="text-stone-500">Jumlah</p>
              <p class="font-semibold text-stone-800">{listing.quantity_liters} L</p>
            </div>
            <div>
              <p class="text-stone-500">Harga</p>
              <p class="font-semibold text-stone-800">Rp {Number(listing.price_per_liter).toLocaleString('id-ID')}/L</p>
            </div>
          </div>

          {#if listing.description}
            <p class="text-xs text-stone-500 mb-3">{listing.description}</p>
          {/if}

          <div class="flex items-center justify-between">
            {#if listing.available_until}
              <p class="text-xs text-stone-400">Tersedia hingga {new Date(listing.available_until).toLocaleDateString('id-ID')}</p>
            {:else}
              <span></span>
            {/if}
            <button onclick={() => claimListing(listing)} class="btn-primary text-xs py-1.5 px-4" disabled={actionLoading}>
              {actionLoading ? 'Memproses...' : 'Klaim'}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>