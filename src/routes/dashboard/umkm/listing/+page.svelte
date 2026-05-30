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
  let pricePerLiter = $state('');
  let description = $state('');
  let pickupAddress = $state('');
  let city = $state('');
  let availableUntil = $state('');

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'umkm') return goto('/dashboard');
    profile = userProfile.data;
    pickupAddress = userProfile.data.address || '';
    loading = false;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    submitting = true;

    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerLiter);

    if (!qty || qty <= 0) { error = 'Jumlah liter harus diisi.'; submitting = false; return; }
    if (price < 0) { error = 'Harga tidak valid.'; submitting = false; return; }

    const { error: err } = await createListing({
      umkm_id: profile.id,
      quantity_liters: qty,
      price_per_liter: price,
      description,
      pickup_address: pickupAddress,
      city: city || null,
      available_until: availableUntil ? new Date(availableUntil).toISOString() : null
    });

    submitting = false;
    if (err) { error = err.message; return; }

    success = 'Listing berhasil dibuat!';
    setTimeout(() => goto('/dashboard/umkm'), 1500);
  }
</script>

<div class="mx-auto max-w-lg px-4 py-8">
  <a href="/dashboard/umkm" class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">← Kembali ke Dashboard</a>

  <div class="card">
    <h1 class="text-xl font-bold text-stone-800 mb-1">Tambah Listing Minyak</h1>
    <p class="text-sm text-stone-500 mb-6">Jual minyak jelantah Anda ke perusahaan kolektor</p>

    {#if error}
      <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
    {/if}
    {#if success}
      <div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
    {/if}

    <form onsubmit={handleSubmit}>
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Jumlah (Liter) *</label>
          <input type="number" step="0.1" min="0.1" class="input-field" bind:value={quantity} placeholder="e.g. 5" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Harga per Liter *</label>
          <input type="number" step="100" min="0" class="input-field" bind:value={pricePerLiter} placeholder="e.g. 8000" required />
        </div>
      </div>

      <label class="block text-sm font-medium text-stone-700 mb-1">Deskripsi</label>
      <textarea class="input-field mb-4" bind:value={description} placeholder="Kualitas minyak, kondisi, dll." rows="2"></textarea>

      <label class="block text-sm font-medium text-stone-700 mb-1">Alamat Penjemputan *</label>
      <textarea class="input-field mb-3" bind:value={pickupAddress} placeholder="Alamat lengkap" rows="2" required></textarea>

      <div class="grid grid-cols-2 gap-3 mb-6">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Kota</label>
          <input type="text" class="input-field" bind:value={city} placeholder="e.g. Jakarta Selatan" />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Tersedia Hingga</label>
          <input type="date" class="input-field" bind:value={availableUntil} />
        </div>
      </div>

      <button type="submit" class="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Menyimpan...' : 'Buat Listing'}
      </button>
    </form>
  </div>
</div>