<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, createListing } from '$lib/supabase.js';
  import { reverseGeocode } from '$lib/geocode.js';
  import { goto } from '$app/navigation';
  import Map from '$lib/Map.svelte';

  let profile = $state(null);
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state('');
  let success = $state('');

  let quantity = $state('');
  let condition = $state('minim_ampas');
  let pickupAddress = $state('');
  let city = $state('');
  let pickupDate = $state('');
  let negotiationNote = $state('');
  let selectedFileName = $state('');
  let latitude = $state(null);
  let longitude = $state(null);
  let showMap = $state(false);
  let geocoding = $state(false);
  let lastGeocodedLat = $state(null);
  let lastGeocodedLng = $state(null);

  // Auto-fill address from map pin via reverse geocoding
  // Only fires when lat/lng change to coordinates we haven't geocoded yet
  $effect(() => {
    const lat = latitude;
    const lng = longitude;
    if (lat == null || lng == null) return;
    // Already geocoded for these exact coordinates — skip (prevents loop)
    if (lat === lastGeocodedLat && lng === lastGeocodedLng) return;
    // Debounce: cancel if user drags pin rapidly
    const timer = setTimeout(async () => {
      geocoding = true;
      const result = await reverseGeocode(lat, lng);
      if (result) {
        pickupAddress = result.address;
        if (!city) city = result.city;
      }
      lastGeocodedLat = lat;
      lastGeocodedLng = lng;
      geocoding = false;
    }, 500);
    return () => clearTimeout(timer);
  });

  const conditionLabels = {
    minim_ampas: 'Minim Ampas',
    ada_ampas: 'Ada Ampas',
    tercampur_air: 'Tercampur Air'
  };

  const conditionDescriptions = {
    minim_ampas: 'Minyak relatif mudah disaring',
    ada_ampas: 'Minyak memiliki sisa gorengan',
    tercampur_air: 'Minyak perlu proses tambahan'
  };

  const conditionPrices = {
    minim_ampas: 5000,
    ada_ampas: 4000,
    tercampur_air: 3000
  };

  let pricePerLiter = $derived(conditionPrices[condition]);
  let totalEstimate = $derived((parseFloat(quantity) || 0) * pricePerLiter);

  onMount(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);

    if (!userProfile.data || userProfile.data.role !== 'umkm') {
      return goto('/dashboard');
    }

    profile = userProfile.data;

    // Pre-fill address from profile if available
    pickupAddress = userProfile.data.address || '';

    // Auto-detect city via browser geolocation (silent fallback if denied)
    if (!city && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          // The $effect on latitude/longitude handles reverse geocoding
        },
        () => {
          // Permission denied or unavailable — silent fallback
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    }

    loading = false;
  });

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    selectedFileName = file ? file.name : '';
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    error = '';
    success = '';

    const qty = parseFloat(quantity);

    if (!qty || qty <= 0) {
      error = 'Jumlah minyak jelantah harus diisi dengan benar.';
      return;
    }

    if (!pickupAddress.trim()) {
      error = 'Alamat penjemputan harus diisi.';
      return;
    }

    if (!pickupDate) {
      error = 'Jadwal pickup harus dipilih.';
      return;
    }

    submitting = true;

    const finalDescription = [
      `Kondisi jelantah: ${conditionLabels[condition]}`,
      `Estimasi harga: ${formatRupiah(pricePerLiter)}/liter`,
      `Total estimasi: ${formatRupiah(totalEstimate)}`,
      negotiationNote ? `Catatan negosiasi: ${negotiationNote}` : null,
      selectedFileName ? `Foto contoh: ${selectedFileName}` : null
    ]
      .filter(Boolean)
      .join('\n');

    const { error: err } = await createListing({
      umkm_id: profile.id,
      quantity_liters: qty,
      price_per_liter: pricePerLiter,
      description: finalDescription,
      pickup_address: pickupAddress,
      city: city || null,
      latitude: latitude,
      longitude: longitude,
      available_until: new Date(`${pickupDate}T23:59:00`).toISOString()
    });

    submitting = false;

    if (err) {
      error = err.message;
      return;
    }

    success = 'Permintaan pickup minyak jelantah berhasil diajukan!';
    setTimeout(() => goto('/dashboard/umkm/history'), 1500);
  }
</script>

{#if loading}
  <div class="page-container py-8">
    <p class="text-sm text-earth-600">Memuat data...</p>
  </div>
{:else}
  <div class="page-container py-8">
    <a
      href="/dashboard/umkm"
      class="mb-4 inline-block text-sm text-gold-600 hover:text-gold-700"
    >
      ← Kembali ke Dashboard
    </a>

    <div class="card p-4 sm:p-6">
      <div class="mb-6 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 rounded-t-lg bg-gradient-to-br from-gold-600 to-gold-800 p-5">
        <p class="text-sm font-semibold text-gold-200">Jelantahin</p>
        <h1 class="mt-1 text-2xl font-bold text-white">Ajukan Pickup Jelantah</h1>
        <p class="mt-1 text-sm text-gold-200">Jelantahmu, cuanmu.</p>
      </div>

      {#if error}
        <div class="alert-error mb-4">{error}</div>
      {/if}

      {#if success}
        <div class="alert-success mb-4">{success}</div>
      {/if}

      <form onsubmit={handleSubmit}>
        <div class="mb-4">
          <label class="input-label">
            Jumlah minyak jelantah *
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            class="input"
            bind:value={quantity}
            placeholder="Contoh: 10"
            required
          />
          <p class="input-hint">
            Masukkan jumlah minyak jelantah dalam satuan liter.
          </p>
        </div>

        <div class="mb-4">
          <label class="input-label mb-2">
            Kondisi minyak jelantah *
          </label>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              class={`rounded-lg border p-3 text-left text-sm transition ${
                condition === 'minim_ampas'
                  ? 'border-gold-600 bg-herb-100 text-gold-700'
                  : 'border-earth-300/60 bg-white text-earth-700 hover:bg-earth-100'
              }`}
              onclick={() => (condition = 'minim_ampas')}
            >
              <span class="block font-semibold">Minim Ampas</span>
              <span class="text-xs">{conditionDescriptions.minim_ampas}</span>
            </button>

            <button
              type="button"
              class={`rounded-lg border p-3 text-left text-sm transition ${
                condition === 'ada_ampas'
                  ? 'border-gold-600 bg-herb-100 text-gold-700'
                  : 'border-earth-300/60 bg-white text-earth-700 hover:bg-earth-100'
              }`}
              onclick={() => (condition = 'ada_ampas')}
            >
              <span class="block font-semibold">Ada Ampas</span>
              <span class="text-xs">{conditionDescriptions.ada_ampas}</span>
            </button>

            <button
              type="button"
              class={`rounded-lg border p-3 text-left text-sm transition ${
                condition === 'tercampur_air'
                  ? 'border-gold-600 bg-herb-100 text-gold-700'
                  : 'border-earth-300/60 bg-white text-earth-700 hover:bg-earth-100'
              }`}
              onclick={() => (condition = 'tercampur_air')}
            >
              <span class="block font-semibold">Tercampur Air</span>
              <span class="text-xs">{conditionDescriptions.tercampur_air}</span>
            </button>
          </div>
        </div>

        <div class="mb-4 rounded-lg bg-herb-100 p-4">
          <div class="flex items-center justify-between text-sm text-earth-700">
            <span>Harga estimasi per liter</span>
            <span class="font-semibold text-earth-900">{formatRupiah(pricePerLiter)}</span>
          </div>

          <div class="mt-3 flex items-center justify-between border-t border-herb-200 pt-3">
            <span class="text-sm font-semibold text-earth-800">Total estimasi cuan</span>
            <span class="text-xl font-bold text-gold-700">{formatRupiah(totalEstimate)}</span>
          </div>
        </div>

        <div class="mb-4">
          <label class="input-label">
            Upload foto minyak
          </label>
          <input
            type="file"
            accept="image/*"
            class="input"
            onchange={handleFileChange}
          />

          {#if selectedFileName}
            <p class="mt-1 text-xs text-herb-700">Foto dipilih: {selectedFileName}</p>
          {:else}
            <p class="input-hint">
              Untuk prototype, foto hanya disimpan sebagai nama file.
            </p>
          {/if}
        </div>

        <div class="mb-4">
          <label class="input-label">
            Alamat pickup *
          </label>
          <textarea
            class="input"
            bind:value={pickupAddress}
            placeholder="Masukkan alamat lengkap penjemputan"
            rows="2"
            required
          ></textarea>
        </div>

        <!-- Map location picker -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label class="input-label">Lokasi di Peta</label>
            <button
              type="button"
              onclick={() => showMap = !showMap}
              class="text-xs text-gold-600 hover:text-gold-700"
            >
              {showMap ? 'Sembunyikan peta' : 'Tandai di peta'}
            </button>
          </div>

          {#if showMap}
            <div class="mb-2">
              <Map
                pickerMode={true}
                height="300px"
                zoom={15}
                bind:latitude
                bind:longitude
              />
            </div>
          {/if}

          {#if geocoding}
            <p class="text-xs text-gold-600 flex items-center gap-1">
              <svg class="icon w-4 h-4 icon-spin text-gold-500"><use href="/icons.svg#loader"/></svg>
              <span>Mengambil alamat dari lokasi peta...</span>
            </p>
          {:else if latitude != null && longitude != null}
            <p class="text-xs text-herb-700 flex items-center gap-1">
              <svg class="icon w-4 h-4 text-herb-500"><use href="/icons.svg#check"/></svg>
              Lokasi ditandai
              <span class="text-earth-600">
                ({latitude.toFixed(5)}, {longitude.toFixed(5)})
              </span>
            </p>
          {:else if !showMap}
            <p class="text-xs text-earth-600">
              Klik "Tandai di peta" untuk menentukan lokasi penjemputan.
            </p>
          {/if}
        </div>

        <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="input-label">Kota</label>
            <input
              type="text"
              class="input"
              bind:value={city}
              placeholder="Contoh: Samarinda"
            />
          </div>

          <div>
            <label class="input-label">
              Jadwal pickup *
            </label>
            <input
              type="date"
              class="input"
              bind:value={pickupDate}
              required
            />
          </div>
        </div>

        <div class="mb-6">
          <label class="input-label">
            Catatan negosiasi harga
          </label>
          <textarea
            class="input"
            bind:value={negotiationNote}
            placeholder="Contoh: Harga bisa dinego jika pickup dilakukan hari ini."
            rows="3"
          ></textarea>
          <p class="input-hint">
            Bagian ini menjadi versi prototype dari fitur chat diskusi harga dengan pengolah.
          </p>
        </div>

        <button type="submit" class="btn-primary btn-lg w-full" disabled={submitting}>
          {submitting ? 'Mengajukan...' : 'Ajukan Pickup'}
        </button>
      </form>
    </div>
  </div>
{/if}
