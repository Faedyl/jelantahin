<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getUmkmBanks, createUmkmBank, updateUmkmBank, deleteUmkmBank, setPrimaryUmkmBank } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let banks = $state([]);
  let loading = $state(true);

  // ── Form state (add new / edit) ──
  let showForm = $state(false);
  let editingId = $state(null);   // null = adding new, uuid = editing
  let formBankName = $state('');
  let formBankAccount = $state('');
  let formBankHolder = $state('');
  let formSaving = $state(false);
  let formError = $state('');

  // ── Confirmation for delete ──
  let deleteConfirmId = $state(null);
  let deleting = $state(false);

  // ── Feedback ──
  let flash = $state(''); // success message

  const commonBanks = [
    'BCA', 'Mandiri', 'BNI', 'BRI',
    'CIMB Niaga', 'Danamon', 'Permata', 'BSI',
    'Maybank', 'OCBC NISP', 'Bank Mega', 'Bank Panin'
  ];

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!profileData || profileData.role !== 'umkm') return goto('/dashboard');
    profile = profileData;

    await loadBanks(session.user.id);
    loading = false;
  });

  async function loadBanks(umkmId) {
    const res = await getUmkmBanks(umkmId);
    if (res.data) banks = res.data;
  }

  // ── Add new ──
  function openAddForm() {
    editingId = null;
    formBankName = '';
    formBankAccount = '';
    formBankHolder = profile?.full_name || '';
    formError = '';
    showForm = true;
  }

  // ── Edit existing ──
  function openEditForm(bank) {
    editingId = bank.id;
    formBankName = bank.bank_name;
    formBankAccount = bank.bank_account;
    formBankHolder = bank.bank_holder;
    formError = '';
    showForm = true;
  }

  function cancelForm() {
    showForm = false;
    editingId = null;
    formError = '';
  }

  async function handleSave() {
    formError = '';
    if (!formBankName.trim()) { formError = 'Pilih bank.'; return; }
    if (!formBankAccount.trim()) { formError = 'Masukkan nomor rekening.'; return; }
    if (!formBankHolder.trim()) { formError = 'Masukkan nama pemilik rekening.'; return; }

    formSaving = true;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { formError = 'Sesi habis. Silakan login ulang.'; formSaving = false; return; }

    if (editingId) {
      // Update existing
      const { error: err } = await updateUmkmBank(editingId, {
        bank_name: formBankName.trim(),
        bank_account: formBankAccount.trim(),
        bank_holder: formBankHolder.trim(),
      });
      if (err) { formError = err.message; formSaving = false; return; }
      flash = 'Rekening berhasil diperbarui.';
    } else {
      // Create new
      const { error: err } = await createUmkmBank({
        umkm_id: session.user.id,
        bank_name: formBankName.trim(),
        bank_account: formBankAccount.trim(),
        bank_holder: formBankHolder.trim(),
      });
      if (err) { formError = err.message; formSaving = false; return; }
      flash = 'Rekening baru berhasil ditambahkan.';
    }

    formSaving = false;
    showForm = false;
    editingId = null;
    await loadBanks(session.user.id);
  }

  // ── Set primary ──
  async function handleSetPrimary(id) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await setPrimaryUmkmBank(id, session.user.id);
    if (error) { flash = 'Gagal mengubah utama: ' + error.message; return; }
    flash = 'Rekening utama berhasil diubah.';
    await loadBanks(session.user.id);
  }

  // ── Delete ──
  async function handleDelete() {
    const id = deleteConfirmId;
    deleteConfirmId = null;
    if (!id) return;
    deleting = true;
    const { error } = await deleteUmkmBank(id);
    deleting = false;
    if (error) { flash = 'Gagal menghapus: ' + error.message; return; }
    flash = 'Rekening berhasil dihapus.';
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await loadBanks(session.user.id);
  }

  function showAccount(acc) {
    if (!acc) return '';
    return acc.length > 4 ? '•••• ' + acc.slice(-4) : acc;
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

    {#if flash}
      <div class="alert-success mb-4">
        <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg>
        <span>{flash}</span>
      </div>
    {/if}

    <div class="alert-info mb-4">
      <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#info"/></svg>
      <div>
        <p class="font-semibold">Aman untuk kamu</p>
        <p class="mt-1">Perusahaan hanya bisa melihat rekening ini <strong>setelah pickup selesai</strong> dan pesanan sudah dikonfirmasi. Data bankmu aman.</p>
      </div>
    </div>

    {#if loading}
      <p class="text-sm text-earth-500 text-center py-8">Memuat...</p>

    {:else}
      <!-- ─── Daftar Rekening ─── -->
      {#if banks.length > 0}
        <div class="space-y-3 mb-6">
          {#each banks as bank}
            <div class="rounded-lg border border-earth-300/60 p-4 {bank.is_primary ? 'bg-herb-50 border-herb-300' : 'bg-white'}">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="font-semibold text-earth-800">{bank.bank_name}</p>
                    {#if bank.is_primary}
                      <span class="badge-success text-[10px] px-1.5 py-0.5">Utama</span>
                    {/if}
                  </div>
                  <p class="text-sm font-mono text-earth-700 mt-0.5">{bank.bank_account}</p>
                  <p class="text-xs text-earth-600">a.n. {bank.bank_holder}</p>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  {#if !bank.is_primary}
                    <button
                      onclick={() => handleSetPrimary(bank.id)}
                      class="btn-ghost btn-xs"
                      title="Jadikan utama"
                    >
                      <svg class="icon w-3.5 h-3.5 text-gold-600"><use href="/icons.svg#award"/></svg>
                    </button>
                  {/if}
                  <button
                    onclick={() => openEditForm(bank)}
                    class="btn-ghost btn-xs"
                    title="Ubah"
                  >
                    <svg class="icon w-3.5 h-3.5 text-earth-600"><use href="/icons.svg#menu"/></svg>
                  </button>
                  <button
                    onclick={() => deleteConfirmId = bank.id}
                    class="btn-ghost btn-xs"
                    title="Hapus"
                  >
                    <svg class="icon w-3.5 h-3.5 text-red-500"><use href="/icons.svg#x"/></svg>
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state py-6 mb-4">
          <svg class="empty-state-icon w-10 h-10"><use href="/icons.svg#bank"/></svg>
          <p class="empty-state-title">Belum ada rekening</p>
          <p class="empty-state-desc">Tambahkan rekening bank untuk menerima pembayaran dari perusahaan.</p>
        </div>
      {/if}

      <!-- ─── Tombol Tambah ─── -->
      {#if !showForm}
        <button onclick={openAddForm} class="btn-secondary btn-md w-full">
          <svg class="icon w-4 h-4"><use href="/icons.svg#package"/></svg>
          {banks.length > 0 ? 'Tambah Rekening Lain' : 'Tambah Rekening'}
        </button>
      {/if}

      <!-- ─── Form Tambah / Edit ─── -->
      {#if showForm}
        <div class="divider"></div>
        <h3 class="font-semibold text-earth-900 mb-3">
          {editingId ? 'Ubah Rekening' : 'Rekening Baru'}
        </h3>

        {#if formError}
          <div class="alert-error mb-4">
            <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
            <span>{formError}</span>
          </div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <label class="input-label">Nama Bank</label>
          <div class="relative mb-4">
            <select class="input" bind:value={formBankName} required>
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
            bind:value={formBankAccount}
            placeholder="1234567890"
            required
            inputmode="numeric"
          />

          <label class="input-label">Atas Nama</label>
          <input
            type="text"
            class="input mb-6"
            bind:value={formBankHolder}
            placeholder="Nama pemilik rekening"
            required
          />

          <div class="flex gap-3">
            <button type="submit" class="btn-primary btn-md flex-1" disabled={formSaving}>
              {formSaving ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Tambah Rekening')}
            </button>
            <button type="button" onclick={cancelForm} class="btn-secondary btn-md" disabled={formSaving}>
              Batal
            </button>
          </div>
        </form>
      {/if}
    {/if}
  </div>
</div>

<!-- ─── Delete Confirmation Modal ─── -->
{#if deleteConfirmId}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    onclick={() => deleteConfirmId = null}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="w-full max-w-md rounded-xl bg-white p-6 shadow-brand-xl animate-scale-in"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 class="text-lg font-bold font-display text-earth-900 mb-3">Hapus Rekening</h2>
      <p class="text-sm text-earth-700 mb-6">Yakin ingin menghapus rekening ini? Tindakan ini tidak dapat dibatalkan.</p>
      <div class="flex gap-3">
        <button
          onclick={() => deleteConfirmId = null}
          class="btn-secondary btn-md flex-1"
          disabled={deleting}
        >
          Batal
        </button>
        <button
          onclick={handleDelete}
          class="btn-danger btn-md flex-1"
          disabled={deleting}
        >
          {#if deleting}
            <svg class="icon w-4 h-4 animate-spin"><use href="/icons.svg#loader"/></svg>
            Menghapus...
          {:else}
            Ya, Hapus
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
