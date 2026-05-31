<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, createListing } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

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
    pickupAddress = userProfile.data.address || '';
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
  <div class="mx-auto max-w-lg px-4 py-8">
    <p class="text-sm text-stone-500">Memuat data...</p>
  </div>
{:else}
  <div class="mx-auto max-w-2xl px-4 py-8">
    <a
      href="/dashboard/umkm"
      class="mb-4 inline-block text-sm text-jelantah-600 hover:text-jelantah-700"
    >
      ← Kembali ke Dashboard
    </a>

    <div class="card overflow-hidden">
      <div class="mb-6 rounded-2xl bg-gradient-to-br from-green-50 to-yellow-50 p-5">
        <p class="text-sm font-semibold text-jelantah-600">Jelantahin</p>
        <h1 class="mt-1 text-2xl font-bold text-stone-800">Ajukan Pickup Jelantah</h1>
        <p class="mt-1 text-sm text-stone-600">Jelantahmu, cuanmu.</p>
      </div>

      {#if error}
        <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      {/if}

      {#if success}
        <div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      {/if}

      <form onsubmit={handleSubmit}>
        <div class="mb-4">
          <label class="mb-1 block text-sm font-medium text-stone-700">
            Jumlah minyak jelantah *
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            class="input-field"
            bind:value={quantity}
            placeholder="Contoh: 10"
            required
          />
          <p class="mt-1 text-xs text-stone-500">
            Masukkan jumlah minyak jelantah dalam satuan liter.
          </p>
        </div>

        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium text-stone-700">
            Kondisi minyak jelantah *
          </label>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              class={`rounded-xl border p-3 text-left text-sm transition ${
                condition === 'minim_ampas'
                  ? 'border-jelantah-600 bg-green-50 text-jelantah-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
              onclick={() => (condition = 'minim_ampas')}
            >
              <span class="block font-semibold">Minim Ampas</span>
              <span class="text-xs">{conditionDescriptions.minim_ampas}</span>
            </button>

            <button
              type="button"
              class={`rounded-xl border p-3 text-left text-sm transition ${
                condition === 'ada_ampas'
                  ? 'border-jelantah-600 bg-green-50 text-jelantah-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
              onclick={() => (condition = 'ada_ampas')}
            >
              <span class="block font-semibold">Ada Ampas</span>
              <span class="text-xs">{conditionDescriptions.ada_ampas}</span>
            </button>

            <button
              type="button"
              class={`rounded-xl border p-3 text-left text-sm transition ${
                condition === 'tercampur_air'
                  ? 'border-jelantah-600 bg-green-50 text-jelantah-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
              onclick={() => (condition = 'tercampur_air')}
            >
              <span class="block font-semibold">Tercampur Air</span>
              <span class="text-xs">{conditionDescriptions.tercampur_air}</span>
            </button>
          </div>
        </div>

        <div class="mb-4 rounded-2xl bg-green-50 p-4">
          <div class="flex items-center justify-between text-sm text-stone-600">
            <span>Harga estimasi per liter</span>
            <span class="font-semibold text-stone-800">{formatRupiah(pricePerLiter)}</span>
          </div>

          <div class="mt-3 flex items-center justify-between border-t border-green-100 pt-3">
            <span class="text-sm font-semibold text-stone-700">Total estimasi cuan</span>
            <span class="text-xl font-bold text-jelantah-700">{formatRupiah(totalEstimate)}</span>
          </div>
        </div>

        <div class="mb-4">
          <label class="mb-1 block text-sm font-medium text-stone-700">
            Upload foto minyak
          </label>
          <input
            type="file"
            accept="image/*"
            class="input-field"
            onchange={handleFileChange}
          />

          {#if selectedFileName}
            <p class="mt-1 text-xs text-green-700">Foto dipilih: {selectedFileName}</p>
          {:else}
            <p class="mt-1 text-xs text-stone-500">
              Untuk prototype, foto hanya disimpan sebagai nama file.
            </p>
          {/if}
        </div>

        <div class="mb-4">
          <label class="mb-1 block text-sm font-medium text-stone-700">
            Alamat pickup *
          </label>
          <textarea
            class="input-field"
            bind:value={pickupAddress}
            placeholder="Masukkan alamat lengkap penjemputan"
            rows="2"
            required
          ></textarea>
        </div>

        <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-stone-700">Kota</label>
            <input
              type="text"
              class="input-field"
              bind:value={city}
              placeholder="Contoh: Samarinda"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-stone-700">
              Jadwal pickup *
            </label>
            <input
              type="date"
              class="input-field"
              bind:value={pickupDate}
              required
            />
          </div>
        </div>

        <div class="mb-6">
          <label class="mb-1 block text-sm font-medium text-stone-700">
            Catatan negosiasi harga
          </label>
          <textarea
            class="input-field"
            bind:value={negotiationNote}
            placeholder="Contoh: Harga bisa dinego jika pickup dilakukan hari ini."
            rows="3"
          ></textarea>
          <p class="mt-1 text-xs text-stone-500">
            Bagian ini menjadi versi prototype dari fitur chat diskusi harga dengan pengolah.
          </p>
        </div>

        <button type="submit" class="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Mengajukan...' : 'Ajukan Pickup'}
        </button>
      </form>
    </div>
  </div>
{/if}