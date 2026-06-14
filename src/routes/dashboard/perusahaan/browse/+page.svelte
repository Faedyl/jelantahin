<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getAvailableListings, createOrder, updateListing } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import Map from '$lib/Map.svelte';
  import ConfirmModal from '$lib/ConfirmModal.svelte';
  import NotificationPopup from '$lib/NotificationPopup.svelte';

  let profile = $state(null);
  let listings = $state([]);
  let loading = $state(true);
  let actionLoading = $state(false);
  let error = $state('');
  let viewMode = $state('map');
  let confirmListing = $state(null); // listing to confirm claiming for // 'map' or 'list'
  let notification = $state(null);

  function showNotification(type, title, message) {
    notification = { type, title, message };
  }

  function dismissNotification() {
    notification = null;
  }

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
    const listingId = listing.id;

    return `
      <div style="min-width: 180px;">
        <p style="font-weight: 600; font-size: 14px; margin: 0;">${name}</p>
        <p style="font-size: 12px; color: #78716c; margin: 2px 0;">📍 ${city || address}</p>
        <p style="font-size: 13px; margin: 6px 0;">
          <strong>${listing.quantity_liters}L</strong> — Rp ${price}/L
        </p>
        ${avail ? `<p style="font-size: 11px; color: #a8a29e; margin: 2px 0;">${avail}</p>` : ''}
        <button onclick="document.getElementById('claim-${listingId}').click()"
          style="margin-top: 6px; padding: 4px 12px; font-size: 12px; background: #D4A40D; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Terima Pickup
        </button>
      </div>
    `;
  }

  function claimListing(listing) {
    confirmListing = listing;
  }

  async function executeClaim() {
    const listing = confirmListing;
    confirmListing = null;
    if (!listing) return;

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
    showNotification('success', 'Pickup Diterima', 'Permintaan pickup berhasil diterima! Mengarahkan ke halaman pesanan...');
    setTimeout(() => goto('/dashboard/perusahaan/orders'), 1000);
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }
</script>

<div class="page-container py-8">
  <!-- Back link -->
  <a href="/dashboard/perusahaan" class="nav-link mb-4 inline-flex">
    <svg class="icon w-4 h-4"><use href="/icons.svg#arrow-right"/></svg>
    <span>Kembali ke Dashboard</span>
  </a>

  <!-- Page Header -->
  <div class="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="page-title">Permintaan Pickup Tersedia</h1>
      <p class="page-subtitle">{listings.length} permintaan dari UMKM</p>
    </div>

    <!-- View toggle -->
    <div class="flex gap-1 rounded-lg border border-earth-400 bg-white p-1 text-sm">
      <button
        onclick={() => viewMode = 'map'}
        class="px-3 py-1.5 rounded-md transition {viewMode === 'map' ? 'bg-gold-200/50 text-gold-700 font-semibold' : 'text-earth-600 hover:text-earth-800'}"
      >
        <svg class="icon w-4 h-4 inline-block mr-1"><use href="/icons.svg#map-pin"/></svg>
        Peta
      </button>
      <button
        onclick={() => viewMode = 'list'}
        class="px-3 py-1.5 rounded-md transition {viewMode === 'list' ? 'bg-gold-200/50 text-gold-700 font-semibold' : 'text-earth-600 hover:text-earth-800'}"
      >
        <svg class="icon w-4 h-4 inline-block mr-1"><use href="/icons.svg#menu"/></svg>
        Daftar
      </button>
    </div>
  </div>

  {#if error}
    <div class="alert-error mb-4">
      <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
      <span>{error}</span>
    </div>
  {/if}

  {#if loading}
    <div class="skeleton-card">
      <div class="skeleton-text"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text w-2/3"></div>
    </div>
  {:else if listings.length === 0}
    <div class="empty-state">
      <svg class="empty-state-icon"><use href="/icons.svg#olive-drop"/></svg>
      <p class="empty-state-title">Belum ada permintaan pickup</p>
      <p class="empty-state-desc">Coba lagi nanti atau perluas area pencarian.</p>
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
        <div class="alert-info mb-4">
          <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#info"/></svg>
          <span>{listings.length - markers.length} permintaan tidak memiliki koordinat lokasi dan tidak muncul di peta.</span>
        </div>
      {/if}

      <!-- Listings below the map -->
      <h2 class="font-semibold font-display text-earth-900 mb-3">Daftar Permintaan</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each listings as listing}
          <div class="order-card">
            <div class="order-card-header mb-2">
              <div>
                <h3 class="order-card-title text-sm">{listing.profiles?.umkm_name || listing.profiles?.full_name || 'UMKM'}</h3>
                <p class="text-xs text-earth-600 flex items-center gap-1 mt-0.5">
                  <svg class="icon w-3 h-3"><use href="/icons.svg#map-pin"/></svg>
                  {listing.city || listing.pickup_address?.slice(0, 30)}
                </p>
              </div>
              <span class="badge-success">Available</span>
            </div>

            <div class="flex gap-4 text-sm mb-2">
              <span class="font-semibold text-earth-900">{listing.quantity_liters}L</span>
              <span class="text-earth-600">{formatRupiah(listing.price_per_liter)}/L</span>
            </div>

            {#if listing.description}
              <p class="text-xs text-earth-600 mb-2 line-clamp-2">{listing.description}</p>
            {/if}

            <div class="order-card-actions mt-2 pt-2">
              {#if listing.available_until}
                <p class="text-[11px] text-earth-500 flex items-center gap-1">
                  <svg class="icon w-3 h-3"><use href="/icons.svg#clock-rotate"/></svg>
                  Hingga {new Date(listing.available_until).toLocaleDateString('id-ID')}
                </p>
              {:else}
                <span></span>
              {/if}
              <button
                id="claim-{listing.id}"
                onclick={() => claimListing(listing)}
                class="btn-primary btn-sm"
                disabled={actionLoading}
              >
                {#if actionLoading}
                  <svg class="icon w-3.5 h-3.5 animate-spin"><use href="/icons.svg#loader"/></svg>
                  Memproses...
                {:else}
                  <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#package"/></svg>
                  Terima Pickup
                {/if}
              </button>
            </div>
          </div>
        {/each}
      </div>

    {/if}

    <!-- List view -->
    {#if viewMode === 'list'}
      <div class="grid gap-4 sm:grid-cols-2">
        {#each listings as listing}
          <div class="order-card">
            <div class="order-card-header mb-3">
              <div>
                <h3 class="order-card-title">{listing.profiles?.umkm_name || listing.profiles?.full_name || 'UMKM'}</h3>
                <p class="text-xs text-earth-600 flex items-center gap-1 mt-0.5">
                  <svg class="icon w-3 h-3"><use href="/icons.svg#map-pin"/></svg>
                  {listing.city || listing.pickup_address?.slice(0, 30)}
                </p>
              </div>
              <span class="badge-success">Available</span>
            </div>

            <div class="flex gap-4 text-sm mb-4">
              <div>
                <p class="stat-label">Jumlah</p>
                <p class="font-semibold font-display text-earth-900">{listing.quantity_liters} L</p>
              </div>
              <div>
                <p class="stat-label">Harga</p>
                <p class="font-semibold font-display text-earth-900">{formatRupiah(listing.price_per_liter)}/L</p>
              </div>
            </div>

            {#if listing.description}
              <p class="text-xs text-earth-600 mb-3">{listing.description}</p>
            {/if}

            <div class="order-card-actions">
              {#if listing.available_until}
                <p class="text-xs text-earth-600 flex items-center gap-1">
                  <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#clock-rotate"/></svg>
                  Tersedia hingga {new Date(listing.available_until).toLocaleDateString('id-ID')}
                </p>
              {:else}
                <span></span>
              {/if}
              <button onclick={() => claimListing(listing)} class="btn-primary btn-sm" disabled={actionLoading}>
                {#if actionLoading}
                  <svg class="icon w-3.5 h-3.5 animate-spin"><use href="/icons.svg#loader"/></svg>
                  Memproses...
                {:else}
                  <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#check"/></svg>
                  Terima Pickup
                {/if}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

{#if confirmListing}
  <ConfirmModal
    title="Terima Pickup"
    message="Terima permintaan pickup <strong>{confirmListing.quantity_liters}L</strong> dari <strong>{confirmListing.profiles?.umkm_name || confirmListing.profiles?.full_name || 'UMKM'}</strong>?"
    confirmText="Ya, Terima"
    cancelText="Batal"
    onconfirm={executeClaim}
    oncancel={() => confirmListing = null}
    loading={actionLoading}
  />
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
