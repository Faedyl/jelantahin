<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getAvailableListings, createOrder, updateListing } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import Map from '$lib/Map.svelte';

  let profile = $state(null);
  let listings = $state([]);
  let loading = $state(true);
  let actionLoading = $state(false);
  let error = $state('');
  let viewMode = $state('map'); // 'map' or 'list'

  let markers = $derived(
    listings
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((l) => ({
        lat: Number(l.latitude),
        lng: Number(l.longitude),
        popup: buildPopup(l),
      }))
  );

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

  function buildPopup(listing) {
    const name = listing.profiles?.umkm_name || listing.profiles?.full_name || 'UMKM';
    const price = Number(listing.price_per_liter).toLocaleString('id-ID');
    const city = listing.city || listing.pickup_address?.slice(0, 30) || '';
    const address = listing.pickup_address?.slice(0, 60) || '';
    const avail = listing.available_until
      ? `Tersedia hingga ${new Date(listing.available_until).toLocaleDateString('id-ID')}`
      : '';

    return `
      <div style="min-width: 180px;">
        <p style="font-weight: 600; font-size: 14px; margin: 0;">${name}</p>
        <p style="font-size: 12px; color: #78716c; margin: 2px 0;">📍 ${city || address}</p>
        <p style="font-size: 13px; margin: 6px 0;">
          <strong>${listing.quantity_liters}L</strong> — Rp ${price}/L
        </p>
        ${avail ? `<p style="font-size: 11px; color: #a8a29e; margin: 2px 0;">${avail}</p>` : ''}
        <p style="font-size: 11px; color: #78716c; margin: 2px 0; font-style: italic;">
          Klik kartu di bawah untuk mengambil pickup
        </p>
      </div>
    `;
  }

  async function claimListing(listing) {
    if (!confirm(`Terima permintaan pickup ${listing.quantity_liters}L dari UMKM ini?`)) return;

    actionLoading = true;
    error = '';

    const pickupDate = listing.available_until
      ? new Date(listing.available_until).toISOString().slice(0, 10)
      : null;

    const { error: orderErr } = await createOrder({
      listing_id: listing.id,
      perusahaan_id: profile.id,
      umkm_id: listing.umkm_id,
      requested_liters: listing.quantity_liters,
      pickup_date: pickupDate,
      notes: listing.description || null
    });

    if (orderErr) {
      error = orderErr.message;
      actionLoading = false;
      return;
    }

    await updateListing(listing.id, { status: 'claimed' });

    actionLoading = false;
    goto('/dashboard/perusahaan/orders');
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }
</script>

<div class="mx-auto max-w-6xl px-4 py-8">
  <a href="/dashboard/perusahaan" class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">
    ← Kembali ke Dashboard
  </a>

  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-xl font-bold text-stone-800">Permintaan Pickup Tersedia</h1>
      <p class="text-sm text-stone-500">{listings.length} permintaan dari UMKM</p>
    </div>

    <!-- View toggle -->
    <div class="flex gap-1 rounded-lg border border-stone-200 bg-white p-1 text-sm">
      <button
        onclick={() => viewMode = 'map'}
        class="px-3 py-1.5 rounded-md transition {viewMode === 'map' ? 'bg-jelantah-100 text-jelantah-700 font-semibold' : 'text-stone-500 hover:text-stone-700'}"
      >
        🗺️ Peta
      </button>
      <button
        onclick={() => viewMode = 'list'}
        class="px-3 py-1.5 rounded-md transition {viewMode === 'list' ? 'bg-jelantah-100 text-jelantah-700 font-semibold' : 'text-stone-500 hover:text-stone-700'}"
      >
        📋 Daftar
      </button>
    </div>
  </div>

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
    <!-- Map view -->
    {#if viewMode === 'map'}
      <div class="card p-2 mb-6">
        <Map
          markers={markers}
          height="400px"
          zoom={11}
        />
      </div>

      {#if markers.length < listings.length}
        <p class="text-xs text-stone-400 mb-4">
          ℹ️ {listings.length - markers.length} permintaan tidak memiliki koordinat lokasi dan tidak muncul di peta.
        </p>
      {/if}

      <!-- Listings below the map (as a compact list) -->
      <h2 class="font-semibold text-stone-800 mb-3">Daftar Permintaan</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each listings as listing}
          <div class="card p-4">
            <div class="flex items-start justify-between mb-2">
              <div>
                <h3 class="font-semibold text-sm text-stone-800">{listing.profiles?.umkm_name || listing.profiles?.full_name || 'UMKM'}</h3>
                <p class="text-xs text-stone-500">
                  {listing.city || listing.pickup_address?.slice(0, 30)}
                </p>
              </div>
              <span class="badge-green text-[10px]">Available</span>
            </div>

            <div class="flex gap-3 text-sm mb-2">
              <span class="font-semibold text-stone-800">{listing.quantity_liters}L</span>
              <span class="text-stone-500">{formatRupiah(listing.price_per_liter)}/L</span>
            </div>

            {#if listing.description}
              <p class="text-xs text-stone-500 mb-2 line-clamp-2">{listing.description}</p>
            {/if}

            <div class="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
              {#if listing.available_until}
                <p class="text-[11px] text-stone-400">Hingga {new Date(listing.available_until).toLocaleDateString('id-ID')}</p>
              {:else}
                <span></span>
              {/if}
              <button
                id="claim-{listing.id}"
                onclick={() => claimListing(listing)}
                class="btn-primary text-[11px] py-1.5 px-3"
                disabled={actionLoading}
              >
                {actionLoading ? '...' : 'Terima Pickup'}
              </button>
            </div>
          </div>
        {/each}
      </div>

    {/if}

    <!-- List view (original card grid) -->
    {#if viewMode === 'list'}
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
                <p class="font-semibold text-stone-800">{formatRupiah(listing.price_per_liter)}/L</p>
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
                {actionLoading ? 'Memproses...' : 'Terima Pickup'}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
