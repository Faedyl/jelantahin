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
    success = 'Persentase biaya admin berhasil diperbarui!';
  }

  function formatRupiah(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
  }
</script>

<div class="page-container-narrow py-8">
  <a href="/dashboard/perusahaan" class="nav-link mb-4 inline-flex">
    <svg class="icon w-4 h-4"><use href="/icons.svg#arrow-right"/></svg>
    <span>Kembali ke Dashboard</span>
  </a>

  <div class="card p-6">
    <div class="text-center mb-6">
      <svg class="icon w-12 h-12 mx-auto text-gold-500 mb-3"><use href="/icons.svg#credit-card"/></svg>
      <h1 class="page-title text-xl">Biaya Admin (%)</h1>
      <p class="page-subtitle">
        Persentase biaya admin dari subtotal transaksi
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

      <div class="alert-info mb-6">
        <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#info"/></svg>
        <div>
          <p class="font-semibold">Cara kerja</p>
          <p class="mt-1">Biaya admin dihitung sebagai persentase dari subtotal pesanan.</p>
          <p class="mt-2 font-mono text-xs bg-gold-100 rounded-lg p-2">
            Biaya Admin = Subtotal × (Persentase / 100)<br>
            Total Bayar = Subtotal + Biaya Admin
          </p>
        </div>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <label class="input-label text-center">Persentase Biaya Admin (%)</label>
        <div class="relative mb-2">
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            class="input text-3xl font-bold text-center pr-12"
            bind:value={adminFeePercent}
            placeholder="2.5"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-earth-500">%</span>
        </div>
        <p class="text-xs text-earth-500 text-center mb-6">
          Saat ini: {adminFeePercent || '0'}%
        </p>

        <button type="submit" class="btn-primary btn-md w-full" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>

      <!-- Preview -->
      <div class="divider"></div>
      <p class="text-xs text-earth-600 mb-2">Pratinjau:</p>
      <div class="rounded-lg bg-herb-100 p-3 text-sm">
        <div class="flex justify-between">
          <span class="text-earth-700">Subtotal ({previewLiters}L × {formatRupiah(previewPricePerLiter)})</span>
          <span class="font-medium">{formatRupiah(previewSubtotal)}</span>
        </div>
        <div class="flex justify-between mt-1">
          <span class="text-earth-700">Biaya Admin ({adminFeePercent || '0'}%)</span>
          <span class="font-medium">{formatRupiah(previewAdminFee)}</span>
        </div>
        <div class="flex justify-between border-t border-herb-200 pt-1 mt-1 font-bold">
          <span>Total</span>
          <span class="text-gold-700">{formatRupiah(previewTotal)}</span>
        </div>
      </div>
      <p class="text-xs text-earth-500 mt-2 text-center">
        Berdasarkan simulasi {previewLiters}L @ {formatRupiah(previewPricePerLiter)}/L
      </p>
    {/if}
  </div>
</div>
