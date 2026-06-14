<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, updateProfile } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let loading = $state(true);
  let saving = $state(false);

  let bankName = $state('');
  let bankAccount = $state('');
  let bankHolder = $state('');
  let error = $state('');
  let success = $state('');

  const commonBanks = [
    'BCA', 'Mandiri', 'BNI', 'BRI',
    'CIMB Niaga', 'Danamon', 'Permata', 'BSI',
    'Maybank', 'OCBC NISP', 'Bank Mega', 'Bank Panin'
  ];

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const res = await getProfile(session.user.id);
    if (!res.data || res.data.role !== 'umkm') return goto('/dashboard');
    profile = res.data;

    // Pre-fill if already set
    bankName = profile.bank_name || '';
    bankAccount = profile.bank_account || '';
    bankHolder = profile.bank_holder || profile.full_name || '';
    loading = false;
  });

  async function handleSave() {
    error = '';
    success = '';

    if (!bankName.trim()) { error = 'Pilih bank Anda.'; return; }
    if (!bankAccount.trim()) { error = 'Masukkan nomor rekening.'; return; }
    if (!bankHolder.trim()) { error = 'Masukkan nama pemilik rekening.'; return; }

    saving = true;

    const { data: { session } } = await supabase.auth.getSession();
    const { error: err } = await updateProfile(session.user.id, {
      bank_name: bankName.trim(),
      bank_account: bankAccount.trim(),
      bank_holder: bankHolder.trim(),
    });

    saving = false;

    if (err) { error = err.message; return; }
    success = 'Data bank berhasil disimpan! Perusahaan akan melihat rekening ini saat melakukan pembayaran.';
  }
</script>

<div class="page-container-narrow py-8">
  <a href="/dashboard/umkm" class="nav-link mb-4 inline-flex">
    <svg class="icon w-4 h-4"><use href="/icons.svg#arrow-right"/></svg>
    <span>Kembali ke Dashboard</span>
  </a>

  <div class="card p-6">
    <div class="text-center mb-6">
      <svg class="icon w-12 h-12 mx-auto text-gold-500 mb-3"><use href="/icons.svg#bank"/></svg>
      <h1 class="page-title text-xl">Rekening Penerimaan</h1>
      <p class="page-subtitle">
        Perusahaan akan transfer ke rekening ini setelah pickup selesai
      </p>
    </div>

    {#if loading}
      <p class="text-sm text-earth-500 text-center py-8">Memuat...</p>
    {:else}
      {#if error}
        <div class="alert-error mb-4">
          <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
          <span>{error}</span>
        </div>
      {/if}
      {#if success}
        <div class="alert-success mb-4">
          <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg>
          <span>{success}</span>
        </div>
      {/if}

      <div class="alert-info mb-4">
        <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#info"/></svg>
        <div>
          <p class="font-semibold">Aman untuk kamu</p>
          <p class="mt-1">Perusahaan hanya bisa melihat rekening ini <strong>setelah pickup selesai</strong> dan pesanan sudah dikonfirmasi. Data bankmu aman.</p>
        </div>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <label class="input-label">Nama Bank</label>
        <div class="relative mb-4">
          <select class="input" bind:value={bankName} required>
            <option value="">-- Pilih Bank --</option>
            {#each commonBanks as b}
              <option value={b}>{b}</option>
            {/each}
          </select>
        </div>

        <label class="input-label">Nomor Rekening</label>
        <input
          type="text"
          class="input mb-4"
          bind:value={bankAccount}
          placeholder="1234567890"
          required
          inputmode="numeric"
        />

        <label class="input-label">Atas Nama</label>
        <input
          type="text"
          class="input mb-6"
          bind:value={bankHolder}
          placeholder="Nama pemilik rekening"
          required
        />

        <button type="submit" class="btn-primary btn-md w-full" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Rekening'}
        </button>
      </form>

      {#if profile?.bank_name}
        <div class="divider"></div>
        <p class="text-xs text-earth-600 mb-2">Rekening tersimpan saat ini:</p>
        <div class="rounded-lg bg-herb-100 p-4">
          <p class="font-semibold text-earth-800">{profile.bank_name}</p>
          <p class="text-sm font-mono text-earth-700">{profile.bank_account}</p>
          <p class="text-xs text-earth-600">a.n. {profile.bank_holder}</p>
        </div>
      {/if}
    {/if}
  </div>
</div>
