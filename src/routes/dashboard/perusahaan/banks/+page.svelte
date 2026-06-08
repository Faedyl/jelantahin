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

<div class="mx-auto max-w-4xl px-4 py-8">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-2xl font-bold text-stone-800">🏦 Kelola Rekening Bank</h1>
      <p class="text-sm text-stone-500">Atur rekening bank untuk pembayaran manual (gratis)</p>
    </div>
    <button onclick={openNew} class="btn-primary">+ Tambah Bank</button>
  </div>

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center">
      <p class="text-sm text-stone-400">Memuat...</p>
    </div>
  {:else}
    {#if formError}
      <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>
    {/if}
    {#if formSuccess}
      <div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{formSuccess}</div>
    {/if}

    <!-- Bank List -->
    <div class="space-y-4 mb-8">
      {#if banks.length === 0}
        <div class="card text-center py-12">
          <p class="text-4xl mb-3">🏦</p>
          <p class="text-stone-500">Belum ada rekening bank.</p>
          <p class="text-stone-400 text-sm mt-1">Tambahkan rekening bank untuk metode pembayaran manual.</p>
        </div>
      {:else}
        {#each banks as bank}
          <div class="card flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span class="text-3xl">🏦</span>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-stone-800">{bank.bank_name}</h3>
                  {#if !bank.is_active}
                    <span class="badge-stone text-xs">Nonaktif</span>
                  {/if}
                </div>
                <p class="text-sm text-stone-600 font-mono">{bank.account_number}</p>
                <p class="text-xs text-stone-500">a.n. {bank.account_name}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                onclick={() => toggleActive(bank)}
                class="btn-secondary text-xs px-2 py-1"
              >
                {bank.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button
                onclick={() => openEdit(bank)}
                class="btn-secondary text-xs px-2 py-1"
              >
                ✏️ Edit
              </button>
              <button
                onclick={() => handleDelete(bank.id)}
                class="btn-danger text-xs px-2 py-1"
              >
                🗑️
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Add/Edit Form Modal -->
    {#if showForm}
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onclick={() => showForm = false}>
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onclick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-stone-800">
              {editingId ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
            </h2>
            <button onclick={() => showForm = false} class="text-stone-400 hover:text-stone-600 text-xl leading-none">&times;</button>
          </div>

          <form onsubmit={handleSubmit}>
            <label class="block text-sm font-medium text-stone-700 mb-1">Nama Bank</label>
            <input type="text" class="input-field mb-3" bind:value={bankName} placeholder="e.g. BCA, Mandiri, BNI" required />

            <label class="block text-sm font-medium text-stone-700 mb-1">Nomor Rekening</label>
            <input type="text" class="input-field mb-3" bind:value={accountNumber} placeholder="1234567890" required />

            <label class="block text-sm font-medium text-stone-700 mb-1">Atas Nama</label>
            <input type="text" class="input-field mb-3" bind:value={accountName} placeholder="Nama pemilik rekening" required />

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-stone-700 mb-1">Urutan</label>
                <input type="number" class="input-field" bind:value={sortOrder} placeholder="0" />
              </div>
              <div class="flex items-end pb-2">
                <label class="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                  <input type="checkbox" bind:checked={isActive} class="w-4 h-4 text-jelantah-500 rounded" />
                  Aktif
                </label>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button type="button" onclick={() => showForm = false} class="btn-secondary flex-1">Batal</button>
              <button type="submit" class="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Bank'}
              </button>
            </div>
          </form>
        </div>
      </div>
    {/if}
  {/if}
</div>