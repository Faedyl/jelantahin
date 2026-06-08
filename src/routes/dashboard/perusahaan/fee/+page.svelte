<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, updatePlatformConfig } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let loading = $state(true);
  let adminFee = $state('');
  let saving = $state(false);
  let error = $state('');
  let success = $state('');

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const res = await getProfile(session.user.id);
    if (!res.data || res.data.role !== 'perusahaan') return goto('/dashboard');
    profile = res.data;

    // Load current admin fee
    const { data: config } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'admin_fee_per_transaction')
      .maybeSingle();

    adminFee = config?.value || '2000';
    loading = false;
  });

  async function handleSave() {
    error = '';
    success = '';

    const fee = parseInt(adminFee);
    if (isNaN(fee) || fee < 0) { error = 'Biaya admin harus angka positif.'; return; }

    saving = true;
    const { error: err } = await updatePlatformConfig('admin_fee_per_transaction', String(fee));
    saving = false;

    if (err) { error = err.message; return; }
    success = '✅ Biaya admin berhasil diperbarui!';
  }

  function formatRupiah(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
  }
</script>

<div class="mx-auto max-w-lg px-4 py-8">
  <a href="/dashboard/perusahaan" class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">
    ← Kembali ke Dashboard
  </a>

  <div class="card">
    <div class="text-center mb-6">
      <span class="text-5xl">💰</span>
      <h1 class="text-xl font-bold text-stone-800 mt-3">Biaya Admin</h1>
      <p class="text-sm text-stone-500">
        Biaya tambahan per transaksi yang dibayar oleh Perusahaan
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

      <div class="rounded-xl bg-amber-50 p-4 text-sm text-amber-700 mb-6">
        <p class="font-semibold">💡 Bagaimana ini bekerja</p>
        <p class="mt-1">Biaya admin ditambahkan ke setiap transaksi pembayaran pickup. Perusahaan membayar:</p>
        <p class="mt-2 font-mono text-xs bg-amber-100 rounded-lg p-2">
          Total Bayar = (Liter × Harga/Liter) + Biaya Admin
        </p>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <label class="block text-sm font-medium text-stone-700 mb-1">Biaya Admin per Transaksi (Rp)</label>
        <input
          type="number"
          class="input-field text-2xl font-bold text-center mb-2"
          bind:value={adminFee}
          placeholder="2000"
          min="0"
        />
        <p class="text-xs text-stone-400 text-center mb-6">
          Saat ini: {formatRupiah(parseInt(adminFee || '0'))} per transaksi
        </p>

        <button type="submit" class="btn-primary w-full" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Biaya Admin'}
        </button>
      </form>

      <!-- Preview -->
      <div class="mt-6 pt-4 border-t border-stone-100">
        <p class="text-xs text-stone-500 mb-2">Pratinjau tampilan di halaman bayar:</p>
        <div class="bg-green-50 rounded-xl p-3 text-sm">
          <div class="flex justify-between">
            <span class="text-stone-600">Subtotal (10L × Rp8.000)</span>
            <span class="font-medium">Rp80.000</span>
          </div>
          <div class="flex justify-between mt-1">
            <span class="text-stone-600">Biaya Admin</span>
            <span class="font-medium">{formatRupiah(parseInt(adminFee || '0'))}</span>
          </div>
          <div class="flex justify-between border-t border-green-200 pt-1 mt-1 font-bold">
            <span>Total</span>
            <span class="text-jelantah-700">{formatRupiah(80000 + parseInt(adminFee || '0'))}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>