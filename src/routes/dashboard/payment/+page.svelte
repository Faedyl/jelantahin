<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getActivePaymentBanks, createPaymentConfirmation, getPaymentConfirmations } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let banks = $state([]);
  let confirmations = $state([]);
  let loading = $state(true);
  let tab = $state('banks'); // Default to Pilih Bank

  // ── Pilih Bank state ──
  let selectedBank = $state(null);
  let bankAmount = $state('');
  let bankSenderName = $state('');
  let bankSenderBank = $state('');
  let bankTransferDate = $state(new Date().toISOString().split('T')[0]);
  let bankSubmitting = $state(false);
  let bankError = $state('');
  let bankSuccess = $state('');

  // ── Manual Transfer state ──
  let selectedBankId = $state('');
  let amount = $state('');
  let transferDate = $state(new Date().toISOString().split('T')[0]);
  let senderName = $state('');
  let senderBank = $state('');
  let notes = $state('');
  let proofImageUrl = $state('');
  let submitting = $state(false);
  let formError = $state('');
  let formSuccess = $state('');

  // ── Bank icons mapping ──
  const bankIcons = {
    'BCA': '🏦',
    'Mandiri': '🏛️',
    'BNI': '🏢',
    'BRI': '🏗️',
    'CIMB Niaga': '🏬',
    'Danamon': '🏤',
    'Permata': '💎',
    'BSI': '🕌',
    'Maybank': '🌿',
    'OCBC': '🔶',
    'Panin': '🔵',
    'UOB': '🟣',
  };

  function getBankIcon(name) {
    return bankIcons[name] || '🏦';
  }

  // ── Color themes per bank ──
  const bankColors = {
    'BCA': { bg: 'from-blue-600 to-blue-800', text: 'text-white', badge: 'bg-blue-100 text-blue-700' },
    'Mandiri': { bg: 'from-yellow-500 to-yellow-700', text: 'text-white', badge: 'bg-yellow-100 text-yellow-700' },
    'BNI': { bg: 'from-orange-500 to-orange-700', text: 'text-white', badge: 'bg-orange-100 text-orange-700' },
    'BRI': { bg: 'from-blue-700 to-blue-900', text: 'text-white', badge: 'bg-blue-100 text-blue-700' },
    'CIMB Niaga': { bg: 'from-red-600 to-red-800', text: 'text-white', badge: 'bg-red-100 text-red-700' },
    'Danamon': { bg: 'from-green-600 to-green-800', text: 'text-white', badge: 'bg-green-100 text-green-700' },
    'Permata': { bg: 'from-purple-500 to-purple-700', text: 'text-white', badge: 'bg-purple-100 text-purple-700' },
    'BSI': { bg: 'from-emerald-600 to-emerald-800', text: 'text-white', badge: 'bg-emerald-100 text-emerald-700' },
  };

  function getBankColor(name) {
    return bankColors[name] || { bg: 'from-stone-500 to-stone-700', text: 'text-white', badge: 'bg-stone-100 text-stone-700' };
  }

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data) return goto('/dashboard');
    profile = userProfile.data;

    const [banksRes, confirmationsRes] = await Promise.all([
      getActivePaymentBanks(),
      getPaymentConfirmations(session.user.id),
    ]);

    banks = banksRes.data || [];
    confirmations = confirmationsRes.data || [];
    loading = false;
  });

  // ── Pilih Bank: Select bank ──
  function selectBank(bank) {
    selectedBank = bank;
    bankError = '';
    bankSuccess = '';
    // Pre-fill sender info
    bankSenderName = profile?.full_name || '';
  }

  function backToBanks() {
    selectedBank = null;
    bankError = '';
    bankSuccess = '';
  }

  // ── Pilih Bank: Confirm transfer ──
  async function handleBankConfirm() {
    bankError = '';
    bankSuccess = '';

    if (!bankAmount || parseFloat(bankAmount) <= 0) {
      bankError = 'Masukkan jumlah transfer.';
      return;
    }
    if (!bankSenderName.trim()) {
      bankError = 'Masukkan nama pengirim.';
      return;
    }

    bankSubmitting = true;

    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await createPaymentConfirmation({
      transaction_id: null,
      user_id: session.user.id,
      bank_id: selectedBank.id,
      amount: parseFloat(bankAmount),
      transfer_date: bankTransferDate,
      sender_name: bankSenderName,
      sender_bank: bankSenderBank || selectedBank.bank_name,
      proof_image_url: null,
      notes: `Pembayaran via ${selectedBank.bank_name} — ${new Date().toLocaleDateString('id-ID')}`,
    });

    bankSubmitting = false;

    if (error) {
      bankError = 'Gagal: ' + error.message;
      return;
    }

    bankSuccess = `✅ Konfirmasi pembayaran via ${selectedBank.bank_name} berhasil dikirim!`;

    // Refresh history
    const confirmationsRes = await getPaymentConfirmations(session.user.id);
    confirmations = confirmationsRes.data || [];

    // Reset after 2s
    setTimeout(() => {
      selectedBank = null;
      bankAmount = '';
      bankSenderName = profile?.full_name || '';
      bankSenderBank = '';
      bankTransferDate = new Date().toISOString().split('T')[0];
    }, 2000);
  }

  // ── Manual Transfer handlers ──
  async function handleManualSubmit(e) {
    e.preventDefault();
    submitting = true;
    formError = '';
    formSuccess = '';

    if (!selectedBankId) {
      formError = 'Pilih bank tujuan.';
      submitting = false;
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      formError = 'Masukkan jumlah transfer.';
      submitting = false;
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await createPaymentConfirmation({
      transaction_id: null,
      user_id: session.user.id,
      bank_id: selectedBankId,
      amount: parseFloat(amount),
      transfer_date: transferDate,
      sender_name: senderName || null,
      sender_bank: senderBank || null,
      proof_image_url: proofImageUrl || null,
      notes: notes || null,
    });

    submitting = false;

    if (error) {
      formError = 'Gagal: ' + error.message;
      return;
    }

    formSuccess = '✅ Konfirmasi berhasil dikirim!';

    // Reset
    selectedBankId = '';
    amount = '';
    transferDate = new Date().toISOString().split('T')[0];
    senderName = '';
    senderBank = '';
    proofImageUrl = '';
    notes = '';

    const confirmationsRes = await getPaymentConfirmations(session.user.id);
    confirmations = confirmationsRes.data || [];
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text);
  }

  function statusBadge(s) {
    const map = { 'pending':'badge-yellow','confirmed':'badge-green','rejected':'badge-red' };
    return map[s] || 'badge-stone';
  }

  function formatRupiah(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
  }
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-stone-800">💳 Pembayaran</h1>
      <p class="text-sm text-stone-500">Transfer ke bank tujuan, konfirmasi pembayaran Anda</p>
    </div>
  </div>

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center">
      <p class="text-sm text-stone-400">Memuat...</p>
    </div>
  {:else}
    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1 overflow-x-auto">
      <button
        onclick={() => tab = 'banks'}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition {tab === 'banks' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}"
      >
        🏦 Pilih Bank
      </button>
      <button
        onclick={() => tab = 'manual'}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition {tab === 'manual' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}"
      >
        📋 Form Manual
      </button>
      <button
        onclick={() => tab = 'history'}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition {tab === 'history' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}"
      >
        📄 Riwayat
      </button>
    </div>

    {#if tab === 'banks'}
      <!-- ════════════════════════════════════════════════════
           TAB: PILIH BANK
           ════════════════════════════════════════════════════ -->

      {#if selectedBank}
        <!-- ── Bank Detail + Konfirmasi ── -->
        <button onclick={backToBanks} class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">
          ← Kembali ke daftar bank
        </button>

        <div class="card overflow-hidden">
          <!-- Bank Header -->
          <div class="bg-gradient-to-r {getBankColor(selectedBank.bank_name).bg} -mx-6 -mt-6 px-6 pt-6 pb-8 mb-6">
            <div class="flex items-center gap-4">
              <span class="text-5xl">{getBankIcon(selectedBank.bank_name)}</span>
              <div class="{getBankColor(selectedBank.bank_name).text}">
                <p class="text-lg font-bold">Transfer ke {selectedBank.bank_name}</p>
                <p class="opacity-80 text-sm">a.n. {selectedBank.account_name}</p>
              </div>
            </div>
          </div>

          <!-- Account Number -->
          <div class="bg-stone-50 rounded-xl p-5 mb-6 text-center">
            <p class="text-xs text-stone-500 mb-2">Nomor Rekening</p>
            <p class="text-3xl font-bold text-stone-800 tracking-widest font-mono mb-3">
              {selectedBank.account_number}
            </p>
            <button
              onclick={() => { copyToClipboard(selectedBank.account_number); bankSuccess = '📋 Nomor rekening disalin!'; }}
              class="btn-secondary text-sm px-4 py-2"
            >
              📋 Salin Nomor Rekening
            </button>
          </div>

          {#if bankError}
            <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{bankError}</div>
          {/if}
          {#if bankSuccess}
            <div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{bankSuccess}</div>
          {/if}

          <!-- Confirmation Form -->
          <h3 class="font-semibold text-stone-800 mb-4">Konfirmasi Pembayaran</h3>

          <div class="grid gap-4 sm:grid-cols-2 mb-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Jumlah Transfer (Rp)</label>
              <input
                type="number"
                class="input-field text-lg font-semibold"
                bind:value={bankAmount}
                placeholder="100000"
                min="1"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Tanggal Transfer</label>
              <input type="date" class="input-field" bind:value={bankTransferDate} />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 mb-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Nama Pengirim</label>
              <input type="text" class="input-field" bind:value={bankSenderName} placeholder="Nama Anda" />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Bank Asal (opsional)</label>
              <input type="text" class="input-field" bind:value={bankSenderBank} placeholder="BCA / Mandiri / dll" />
            </div>
          </div>

          <button
            onclick={handleBankConfirm}
            class="btn-primary w-full mt-2"
            disabled={bankSubmitting}
          >
            {bankSubmitting ? 'Mengirim...' : '✅ Konfirmasi Pembayaran'}
          </button>
        </div>

      {:else}
        <!-- ── Grid Bank ── -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {#each banks as bank}
            <button
              onclick={() => selectBank(bank)}
              class="card flex flex-col items-center justify-center py-8 hover:shadow-md hover:border-jelantah-300 transition-all text-center group"
            >
              <span class="text-5xl mb-3 group-hover:scale-110 transition-transform">{getBankIcon(bank.bank_name)}</span>
              <p class="font-bold text-stone-800 text-lg">{bank.bank_name}</p>
              <p class="text-xs text-stone-400 mt-1">a.n. {bank.account_name}</p>
              <span class="text-xs font-mono text-stone-500 mt-1">•••• {bank.account_number.slice(-4)}</span>
            </button>
          {/each}
        </div>

        {#if banks.length === 0}
          <div class="card text-center py-12">
            <p class="text-5xl mb-4">🏦</p>
            <p class="text-stone-500">Belum ada bank tersedia.</p>
            <p class="text-sm text-stone-400 mt-1">
              Admin akan menambahkan rekening bank melalui menu Dashboard → Kelola Bank.
            </p>
          </div>
        {/if}
      {/if}

    {:else if tab === 'manual'}
      <!-- ════════════════════════════════════════════════════
           TAB: FORM MANUAL
           ════════════════════════════════════════════════════ -->

      <div class="card">
        <div class="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
          <p class="font-semibold">🏦 Sudah transfer?</p>
          <p class="mt-1">Isi form ini jika kamu sudah transfer dan ingin mengirim bukti + catatan tambahan.</p>
        </div>

        {#if formError}
          <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>
        {/if}
        {#if formSuccess}
          <div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{formSuccess}</div>
        {/if}

        <form onsubmit={handleManualSubmit}>
          <label class="block text-sm font-medium text-stone-700 mb-1">Bank Tujuan</label>
          <select class="input-field mb-4" bind:value={selectedBankId} required>
            <option value="">-- Pilih Bank --</option>
            {#each banks as bank}
              <option value={bank.id}>
                {bank.bank_name} — a.n. {bank.account_name} ({bank.account_number})
              </option>
            {/each}
          </select>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Jumlah Transfer (Rp)</label>
              <input type="number" class="input-field" bind:value={amount} placeholder="100000" min="1" />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Tanggal Transfer</label>
              <input type="date" class="input-field" bind:value={transferDate} />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Nama Pengirim</label>
              <input type="text" class="input-field" bind:value={senderName} placeholder="Nama di rekening" />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Bank Pengirim</label>
              <input type="text" class="input-field" bind:value={senderBank} placeholder="BCA, Mandiri, dll" />
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-stone-700 mb-1">URL Bukti Transfer (opsional)</label>
            <input type="url" class="input-field" bind:value={proofImageUrl} placeholder="Link gambar/invoice" />
            <p class="text-xs text-stone-400 mt-1">Upload ke layanan gambar, tempel link-nya di sini</p>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-stone-700 mb-1">Catatan (opsional)</label>
            <textarea class="input-field" bind:value={notes} placeholder="Pesanan #xxx" rows="2"></textarea>
          </div>

          <button type="submit" class="btn-secondary w-full mt-6" disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Konfirmasi'}
          </button>
        </form>
      </div>

    {:else if tab === 'history'}
      <!-- ════════════════════════════════════════════════════
           TAB: RIWAYAT
           ════════════════════════════════════════════════════ -->
      <div class="card">
        <h2 class="font-semibold text-stone-800 mb-4">Riwayat Pembayaran</h2>
        {#if confirmations.length === 0}
          <p class="text-sm text-stone-400 text-center py-8">Belum ada riwayat pembayaran.</p>
        {:else}
          <div class="space-y-3">
            {#each confirmations as conf}
              <div class="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p class="text-sm font-medium text-stone-800">
                    <span>{getBankIcon(conf.payment_banks?.bank_name || '')}</span>
                    {conf.payment_banks?.bank_name || 'Bank'}
                    {#if conf.sender_bank?.startsWith('Midtrans')}
                      <span class="text-xs text-stone-400">(via Midtrans)</span>
                    {/if}
                  </p>
                  <p class="text-xs text-stone-500">
                    {conf.sender_name || ''}
                    {#if conf.transfer_date} • {new Date(conf.transfer_date).toLocaleDateString('id-ID')}{/if}
                  </p>
                  {#if conf.notes}
                    <p class="text-xs text-stone-400 mt-0.5 truncate max-w-xs">{conf.notes}</p>
                  {/if}
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold text-stone-800">{formatRupiah(conf.amount)}</p>
                  <span class="{statusBadge(conf.status)} text-xs mt-1 inline-block">{conf.status}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>