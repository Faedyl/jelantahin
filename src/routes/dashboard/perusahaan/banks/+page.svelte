<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getAllPaymentBanks, createPaymentBank, updatePaymentBank, deletePaymentBank } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let banks = $state([]);
  let loading = $state(true);

  // Form state
  let showForm = $state(false);
  let editingId = $state(null);
  let bankName = $state('');
  let accountNumber = $state('');
  let accountName = $state('');
  let sortOrder = $state(0);
  let isActive = $state(true);
  let submitting = $state(false);
  let formError = $state('');
  let formSuccess = $state('');

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'perusahaan') {
      return goto('/dashboard');
    }
    profile = userProfile.data;

    await loadBanks();
    loading = false;
  });

  async function loadBanks() {
    const res = await getAllPaymentBanks();
    banks = res.data || [];
  }

  function resetForm() {
    editingId = null;
    bankName = '';
    accountNumber = '';
    accountName = '';
    sortOrder = 0;
    isActive = true;
    formError = '';
    formSuccess = '';
  }

  function openEdit(bank) {
    editingId = bank.id;
    bankName = bank.bank_name;
    accountNumber = bank.account_number;
    accountName = bank.account_name;
    sortOrder = bank.sort_order;
    isActive = bank.is_active;
    formError = '';
    formSuccess = '';
    showForm = true;
  }

  function openNew() {
    resetForm();
    showForm = true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    submitting = true;
    formError = '';

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      formError = 'Semua field harus diisi.';
      submitting = false;
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (editingId) {
      const { error } = await updatePaymentBank(editingId, {
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        sort_order: sortOrder,
        is_active: isActive,
      });
      if (error) {
        formError = 'Gagal update: ' + error.message;
        submitting = false;
        return;
      }
      formSuccess = 'Bank berhasil diperbarui.';
    } else {
      const { error } = await createPaymentBank({
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        sort_order: sortOrder,
        is_active: isActive,
      });
      if (error) {
        formError = 'Gagal menambah: ' + error.message;
        submitting = false;
        return;
      }
      formSuccess = 'Bank berhasil ditambahkan.';
    }

    submitting = false;
    await loadBanks();
    setTimeout(() => { showForm = false; resetForm(); }, 1500);
  }

  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus rekening bank ini?')) return;
    const { error } = await deletePaymentBank(id);
    if (error) {
      formError = 'Gagal menghapus: ' + error.message;
      return;
    }
    await loadBanks();
  }

  async function toggleActive(bank) {
    await updatePaymentBank(bank.id, { is_active: !bank.is_active });
    await loadBanks();
  }
</script>

<div class="page-container py-8">
  <div class="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="page-title flex items-center gap-2">
        <svg class="icon w-6 h-6"><use href="/icons.svg#bank"/></svg>
        Kelola Rekening Bank
      </h1>
      <p class="page-subtitle">Atur rekening bank untuk pembayaran manual (gratis)</p>
    </div>
    <button onclick={openNew} class="btn-primary btn-md">
      <svg class="icon w-4 h-4"><use href="/icons.svg#bank"/></svg>
      Tambah Bank
    </button>
  </div>

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center">
      <div class="skeleton-card w-full max-w-md">
        <div class="skeleton-text"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text w-2/3"></div>
      </div>
    </div>
  {:else}
    {#if formError}
      <div class="alert-error mb-4">
        <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
        <span>{formError}</span>
      </div>
    {/if}
    {#if formSuccess}
      <div class="alert-success mb-4">
        <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg>
        <span>{formSuccess}</span>
      </div>
    {/if}

    <!-- Bank List -->
    <div class="space-y-4 mb-8">
      {#if banks.length === 0}
        <div class="empty-state">
          <svg class="empty-state-icon"><use href="/icons.svg#bank"/></svg>
          <p class="empty-state-title">Belum ada rekening bank</p>
          <p class="empty-state-desc">Tambahkan rekening bank untuk metode pembayaran manual.</p>
        </div>
      {:else}
        {#each banks as bank}
          <div class="card p-4 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <svg class="icon w-8 h-8 text-gold-500"><use href="/icons.svg#bank"/></svg>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-earth-800">{bank.bank_name}</h3>
                  {#if !bank.is_active}
                    <span class="badge-default text-xs">Nonaktif</span>
                  {/if}
                </div>
                <p class="text-sm text-earth-700 font-mono">{bank.account_number}</p>
                <p class="text-xs text-earth-600">a.n. {bank.account_name}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                onclick={() => toggleActive(bank)}
                class="btn-secondary btn-sm"
              >
                {bank.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button
                onclick={() => openEdit(bank)}
                class="btn-secondary btn-sm"
              >
                Edit
              </button>
              <button
                onclick={() => handleDelete(bank.id)}
                class="btn-danger btn-sm"
              >
                <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#x"/></svg>
                Hapus
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Add/Edit Form Modal -->
    {#if showForm}
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onclick={() => showForm = false}>
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-brand-xl animate-scale-in" onclick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold font-display text-earth-900">
              {editingId ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
            </h2>
            <button onclick={() => showForm = false} class="btn-ghost btn-sm">
              <svg class="icon w-4 h-4"><use href="/icons.svg#x"/></svg>
            </button>
          </div>

          <form onsubmit={handleSubmit}>
            <label class="input-label">Nama Bank</label>
            <input type="text" class="input mb-3" bind:value={bankName} placeholder="e.g. BCA, Mandiri, BNI" required />

            <label class="input-label">Nomor Rekening</label>
            <input type="text" class="input mb-3" bind:value={accountNumber} placeholder="1234567890" required />

            <label class="input-label">Atas Nama</label>
            <input type="text" class="input mb-3" bind:value={accountName} placeholder="Nama pemilik rekening" required />

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="input-label">Urutan</label>
                <input type="number" class="input" bind:value={sortOrder} placeholder="0" />
              </div>
              <div class="flex items-end pb-2">
                <label class="flex items-center gap-2 text-sm text-earth-700 cursor-pointer">
                  <input type="checkbox" bind:checked={isActive} class="w-4 h-4 text-gold-500 rounded" />
                  Aktif
                </label>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button type="button" onclick={() => showForm = false} class="btn-secondary btn-md flex-1">Batal</button>
              <button type="submit" class="btn-primary btn-md flex-1" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Bank'}
              </button>
            </div>
          </form>
        </div>
      </div>
    {/if}
  {/if}
</div>
