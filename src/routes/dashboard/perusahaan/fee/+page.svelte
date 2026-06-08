<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, updatePlatformConfig } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let loading = $state(true);
  let adminFeePercent = $state('');
  let saving = $state(false);
  let error = $state('');
  let success = $state('');

  // Preview values
  let previewSubtotal = 80000;
  let previewLiters = 10;
  let previewPricePerLiter = 8000;

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const res = await getProfile(session.user.id);
    if (!res.data || res.data.role !== 'perusahaan') return goto('/dashboard');
    profile = res.data;

    // Load current admin fee percentage
    const { data: config } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'admin_fee_percentage')
      .maybeSingle();

    adminFeePercent = config?.value || '2.5';
    loading = false;
  });

  let previewAdminFee = $derived(previewSubtotal * (parseFloat(adminFeePercent || '0') / 100));
  let previewTotal = $derived(previewSubtotal + previewAdminFee);

  async function handleSave() {
    error = '';
    success = '';

    const pct = parseFloat(adminFeePercent);
    if (isNaN(pct) || pct < 0 || pct > 100) { error = 'Persentase harus antara 0 - 100.'; return; }

    saving = true;
    const { error: err } = await updatePlatformConfig('admin_fee_percentage', String(pct));
    saving = false;

    if (err) { error = err.message; return; }
    success = '✅ Persentase biaya admin berhasil diperbarui!';
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
      <h1 class="text-xl font-bold text-stone-800 mt-3">Biaya Admin (%)</h1>
      <p class="text-sm text-stone-500">
        Persentase biaya admin dari subtotal transaksi
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
        <p class="font-semibold">💡 Cara kerja</p>
        <p class="mt-1">Biaya admin dihitung sebagai persentase dari subtotal pesanan.</p>
        <p class="mt-2 font-mono text-xs bg-amber-100 rounded-lg p-2">
          Biaya Admin = Subtotal × (Persentase / 100)<br>
          Total Bayar = Subtotal + Biaya Admin
        </p>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <label class="block text-sm font-medium text-stone-700 mb-1">Persentase Biaya Admin (%)</label>
        <div class="relative mb-2">
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            class="input-field text-3xl font-bold text-center pr-8"
            bind:value={adminFeePercent}
            placeholder="2.5"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-stone-400">%</span>
        </div>
        <p class="text-xs text-stone-400 text-center mb-6">
          Saat ini: {adminFeePercent || '0'}%
        </p>

        <button type="submit" class="btn-primary w-full" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>

      <!-- Preview -->
      <div class="mt-6 pt-4 border-t border-stone-100">
        <p class="text-xs text-stone-500 mb-2">Pratinjau:</p>
        <div class="bg-green-50 rounded-xl p-3 text-sm">
          <div class="flex justify-between">
            <span class="text-stone-600">Subtotal ({previewLiters}L × {formatRupiah(previewPricePerLiter)})</span>
            <span class="font-medium">{formatRupiah(previewSubtotal)}</span>
          </div>
          <div class="flex justify-between mt-1">
            <span class="text-stone-600">Biaya Admin ({adminFeePercent || '0'}%)</span>
            <span class="font-medium">{formatRupiah(previewAdminFee)}</span>
          </div>
          <div class="flex justify-between border-t border-green-200 pt-1 mt-1 font-bold">
            <span>Total</span>
            <span class="text-jelantah-700">{formatRupiah(previewTotal)}</span>
          </div>
        </div>
        <p class="text-xs text-stone-400 mt-2 text-center">
          Berdasarkan simulasi {previewLiters}L @ {formatRupiah(previewPricePerLiter)}/L
        </p>
      </div>
    {/if}
  </div>
</div>