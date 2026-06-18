<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, updateProfile } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let success = $state('');

  // Form fields
  let fullName = $state('');
  let phone = $state('');
  let address = $state('');
  let umkmName = $state('');
  let umkmType = $state('');
  let companyName = $state('');
  let companyNib = $state('');

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const { data } = await getProfile(session.user.id);
    if (!data) { loading = false; return; }
    profile = data;

    // Populate form
    fullName = data.full_name || '';
    phone = data.phone || '';
    address = data.address || '';
    umkmName = data.umkm_name || '';
    umkmType = data.umkm_type || '';
    companyName = data.company_name || '';
    companyNib = data.company_nib || '';

    loading = false;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    success = '';

    if (!fullName.trim()) {
      error = 'Nama lengkap wajib diisi.';
      return;
    }

    saving = true;

    const updates = {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
    };

    if (profile.role === 'umkm') {
      updates.umkm_name = umkmName.trim() || null;
      updates.umkm_type = umkmType.trim() || null;
      // Clear Perusahaan fields
      updates.company_name = null;
      updates.company_nib = null;
    } else {
      updates.company_name = companyName.trim() || null;
      updates.company_nib = companyNib.trim() || null;
      // Clear UMKM fields
      updates.umkm_name = null;
      updates.umkm_type = null;
    }

    const { error: err } = await updateProfile(profile.id, updates);
    saving = false;

    if (err) {
      error = 'Gagal menyimpan: ' + err.message;
      return;
    }

    success = 'Profil berhasil diperbarui!';

    // Refresh local profile
    profile = { ...profile, ...updates };

    // Clear success after 3s
    setTimeout(() => { success = ''; }, 3000);
  }
</script>

<div class="page-container py-8">
  <!-- Header -->
  <div class="flex flex-wrap items-start justify-between gap-4 mb-8">
    <div class="flex items-center gap-4">
      <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-gold-200/70 text-gold-600">
        <svg class="icon w-7 h-7"><use href="/icons.svg#user"/></svg>
      </div>
      <div>
        <h1 class="page-title">Edit Profil</h1>
        <p class="page-subtitle">
          {#if profile}
            {profile.role === 'umkm' ? 'UMKM — Penjual Minyak Jelantah' : 'Perusahaan — Kolektor Minyak Jelantah'}
          {/if}
        </p>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center">
      <svg class="icon w-8 h-8 text-gold-500 icon-spin"><use href="/icons.svg#loader"/></svg>
    </div>

  {:else if !profile}
    <div class="empty-state">
      <svg class="empty-state-icon"><use href="/icons.svg#user"/></svg>
      <h2 class="empty-state-title">Profil tidak ditemukan</h2>
      <p class="empty-state-desc mb-6">Silakan daftar ulang atau hubungi admin.</p>
      <a href="/register" class="btn-primary btn-md">Daftar Sekarang</a>
    </div>

  {:else}
    <div class="max-w-2xl">
      {#if error}
        <div class="alert-error mb-5">
          <svg class="icon w-4 h-4 mt-0.5 shrink-0"><use href="/icons.svg#alert-circle"/></svg>
          <span>{error}</span>
        </div>
      {/if}

      {#if success}
        <div class="alert-success mb-5">
          <svg class="icon w-4 h-4 mt-0.5 shrink-0"><use href="/icons.svg#check"/></svg>
          <span>{success}</span>
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="card p-6 sm:p-8 space-y-4">
        <!-- Nama Lengkap -->
        <div>
          <label for="fullName" class="input-label">Nama Lengkap</label>
          <input id="fullName" type="text" class="input" bind:value={fullName} placeholder="Nama Anda" required />
        </div>

        <!-- No. Telepon -->
        <div>
          <label for="phone" class="input-label">No. Telepon</label>
          <input id="phone" type="tel" class="input" bind:value={phone} placeholder="0812-xxxx-xxxx" />
        </div>

        <!-- Alamat -->
        <div>
          <label for="address" class="input-label">Alamat</label>
          <textarea id="address" class="textarea" bind:value={address} placeholder="Alamat lengkap" rows="2"></textarea>
        </div>

        <!-- Role-specific fields -->
        {#if profile.role === 'umkm'}
          <hr class="border-earth-200" />
          <p class="text-sm font-semibold text-earth-800 font-display">Informasi UMKM</p>

          <div>
            <label for="umkmName" class="input-label">Nama Usaha</label>
            <input id="umkmName" type="text" class="input" bind:value={umkmName} placeholder="e.g. Warung Bu Ani" />
          </div>

          <div>
            <label for="umkmType" class="input-label">Jenis Usaha</label>
            <input id="umkmType" type="text" class="input" bind:value={umkmType} placeholder="e.g. Rumah Makan, Catering, Industri Rumah" />
          </div>
        {:else}
          <hr class="border-earth-200" />
          <p class="text-sm font-semibold text-earth-800 font-display">Informasi Perusahaan</p>

          <div>
            <label for="companyName" class="input-label">Nama Perusahaan</label>
            <input id="companyName" type="text" class="input" bind:value={companyName} placeholder="e.g. PT Energi Hijau" />
          </div>

          <div>
            <label for="companyNib" class="input-label">NIB (Nomor Induk Berusaha)</label>
            <input id="companyNib" type="text" class="input" bind:value={companyNib} placeholder="e.g. 9120201234567" />
          </div>
        {/if}

        <div class="flex gap-3 pt-2">
          <a href="/dashboard" class="btn-secondary flex-1 btn-md text-center">Batal</a>
          <button type="submit" class="btn-primary flex-1 btn-md" disabled={saving}>
            {#if saving}
              <svg class="icon w-4 h-4 icon-spin"><use href="/icons.svg#loader"/></svg>
              Menyimpan...
            {:else}
              Simpan Perubahan
            {/if}
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>
