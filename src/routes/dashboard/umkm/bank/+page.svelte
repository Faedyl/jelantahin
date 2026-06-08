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
    success = '✅ Data bank berhasil disimpan! Perusahaan akan melihat rekening ini saat melakukan pembayaran.';
  }
</script>

<div class="mx-auto max-w-lg px-4 py-8">
  <a href="/dashboard/umkm" class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">
    ← Kembali ke Dashboard
  </a>

  <div class="card">
    <div class="text-center mb-6">
      <span class="text-5xl">🏦</span>
      <h1 class="text-xl font-bold text-stone-800 mt-3">Rekening Penerimaan</h1>
      <p class="text-sm text-stone-500">
        Perusahaan akan transfer ke rekening ini setelah pickup selesai
      </p>
    </div>

    {#if loading}
      <p class="text-stone-400 text-sm text-center py-8">Memuat...</p>
    {:else}
      {#if error}
        <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      {/if}
      {#if success}
        <div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
      {/if}

      <div class="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
        <p class="font-semibold">🔒 Aman untuk kamu</p>
        <p class="mt-1">Perusahaan hanya bisa melihat rekening ini <strong>setelah pickup selesai</strong> dan pesanan sudah dikonfirmasi. Data bankmu aman.</p>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <label class="block text-sm font-medium text-stone-700 mb-1">Nama Bank</label>
        <div class="relative mb-4">
          <select class="input-field" bind:value={bankName} required>
            <option value="">-- Pilih Bank --</option>
            {#each commonBanks as b}
              <option value={b}>{b}</option>
            {/each}
          </select>
        </div>

        <label class="block text-sm font-medium text-stone-700 mb-1">Nomor Rekening</label>
        <input
          type="text"
          class="input-field mb-4"
          bind:value={bankAccount}
          placeholder="1234567890"
          required
          inputmode="numeric"
        />

        <label class="block text-sm font-medium text-stone-700 mb-1">Atas Nama</label>
        <input
          type="text"
          class="input-field mb-6"
          bind:value={bankHolder}
          placeholder="Nama pemilik rekening"
          required
        />

        <button type="submit" class="btn-primary w-full" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Rekening'}
        </button>
      </form>

      {#if profile?.bank_name}
        <div class="mt-6 pt-4 border-t border-stone-100">
          <p class="text-xs text-stone-500 mb-2">Rekening tersimpan saat ini:</p>
          <div class="rounded-xl bg-green-50 p-3">
            <p class="font-semibold text-stone-800">{profile.bank_name}</p>
            <p class="text-sm font-mono text-stone-700">{profile.bank_account}</p>
            <p class="text-xs text-stone-500">a.n. {profile.bank_holder}</p>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>