<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getActivePaymentBanks, createPaymentConfirmation, getPaymentConfirmations, getPaymentConfirmationsForOrder, confirmOrderPayment } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let profile = $state(null);
  let banks = $state([]);
  let confirmations = $state([]);
  let loading = $state(true);
  let tab = $state('banks');

  // ── Order-based payment (from ?order_id=xxx) ──
  let orderId = $state('');
  let order = $state(null);
  let umkmProfile = $state(null);
  let orderPayments = $state([]);
  let payingForOrder = $state(false);

  // ── Pilih Bank state ──
  let selectedBank = $state(null);
  let bankAmount = $state('');
  let bankSenderName = $state('');
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
  let proofImageUrl = $state('');
  let notes = $state('');
  let submitting = $state(false);
  let formError = $state('');
  let formSuccess = $state('');

  const bankIcons = {
    'BCA': '🏦', 'Mandiri': '🏛️', 'BNI': '🏢', 'BRI': '🏗️',
    'CIMB Niaga': '🏬', 'Danamon': '🏤', 'Permata': '💎', 'BSI': '🕌',
    'Maybank': '🌿', 'OCBC': '🔶', 'Panin': '🔵', 'UOB': '🟣',
  };

  function getBankIcon(name) { return bankIcons[name] || '🏦'; }

  const bankColors = {
    'BCA': { bg: 'from-blue-600 to-blue-800', text: 'text-white' },
    'Mandiri': { bg: 'from-yellow-500 to-yellow-700', text: 'text-white' },
    'BNI': { bg: 'from-orange-500 to-orange-700', text: 'text-white' },
    'BRI': { bg: 'from-blue-700 to-blue-900', text: 'text-white' },
    'CIMB Niaga': { bg: 'from-red-600 to-red-800', text: 'text-white' },
    'Danamon': { bg: 'from-green-600 to-green-800', text: 'text-white' },
    'Permata': { bg: 'from-purple-500 to-purple-700', text: 'text-white' },
    'BSI': { bg: 'from-emerald-600 to-emerald-800', text: 'text-white' },
  };

  function getBankColor(name) { return bankColors[name] || { bg: 'from-stone-500 to-stone-700', text: 'text-white' }; }

  function formatRupiah(v) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
  }

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data) return goto('/dashboard');
    profile = userProfile.data;

    // Check for order_id in URL
    const params = new URLSearchParams(window.location.search);
    orderId = params.get('order_id') || '';

    const [banksRes] = await Promise.all([
      getActivePaymentBanks(),
    ]);

    banks = banksRes.data || [];

    if (orderId) {
      // Order-based payment flow — Perusahaan paying for an order
      payingForOrder = true;
      tab = 'order-pay';

      const { data: orderData } = await supabase
        .from('orders')
        .select('*, oil_listings(*)')
        .eq('id', orderId)
        .single();

      order = orderData;

      if (orderData) {
        // Get UMKM bank details
        const { data: umkmData } = await supabase
          .from('profiles')
          .select('full_name, umkm_name, bank_name, bank_account, bank_holder')
          .eq('id', orderData.umkm_id)
          .single();

        umkmProfile = umkmData;

        // Get existing payments for this order
        const paymentsRes = await getPaymentConfirmationsForOrder(orderId);
        orderPayments = paymentsRes.data || [];
      }
    }

    // Get user's payment history
    const confirmationsRes = await getPaymentConfirmations(session.user.id);
    confirmations = confirmationsRes.data || [];

    loading = false;
  });

  // ── Bayar untuk order ──
  async function handleOrderPayment() {
    bankError = '';
    bankSuccess = '';

    if (!selectedBank) { bankError = 'Pilih bank tujuan.'; return; }
    if (!bankAmount || parseFloat(bankAmount) <= 0) { bankError = 'Masukkan jumlah.'; return; }
    if (!bankSenderName.trim()) { bankError = 'Masukkan nama pengirim.'; return; }

    bankSubmitting = true;
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await confirmOrderPayment({
      orderId: orderId,
      userId: session.user.id,
      bankId: selectedBank.id,
      amount: parseFloat(bankAmount),
      senderName: bankSenderName,
    });

    bankSubmitting = false;

    if (error) { bankError = 'Gagal: ' + error.message; return; }

    bankSuccess = `✅ Pembayaran untuk pesanan #${orderId.slice(0,8)} berhasil dikonfirmasi!`;

    // Refresh payments
    const paymentsRes = await getPaymentConfirmationsForOrder(orderId);
    orderPayments = paymentsRes.data || [];

    // Refresh user history
    const confirmationsRes = await getPaymentConfirmations(session.user.id);
    confirmations = confirmationsRes.data || [];
  }

  // ── Pilih Bank: select ──
  function selectBank(bank) {
    selectedBank = bank;
    bankError = '';
    bankSuccess = '';
    bankSenderName = profile?.full_name || '';
  }

  function backToBanks() { selectedBank = null; bankError = ''; bankSuccess = ''; }

  // ── Manual transfer ──
  async function handleManualSubmit(e) {
    e.preventDefault();
    submitting = true; formError = ''; formSuccess = '';
    if (!selectedBankId) { formError = 'Pilih bank.'; submitting = false; return; }
    if (!amount || parseFloat(amount) <= 0) { formError = 'Masukkan jumlah.'; submitting = false; return; }

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await createPaymentConfirmation({
      order_id: orderId || null,
      transaction_id: null,
      user_id: session.user.id,
      bank_id: selectedBankId,
      amount: parseFloat(amount),
      transfer_date: transferDate,
      sender_name: senderName || null,
      sender_bank: senderBank || null,
      proof_image_url: proofImageUrl || null,
      notes: notes || (orderId ? `Bayar pesanan #${orderId.slice(0,8)}` : null),
    });

    submitting = false;
    if (error) { formError = 'Gagal: ' + error.message; return; }
    formSuccess = '✅ Konfirmasi berhasil dikirim!';
    selectedBankId = ''; amount = ''; senderName = ''; senderBank = ''; proofImageUrl = ''; notes = '';

    const confirmationsRes = await getPaymentConfirmations(session.user.id);
    confirmations = confirmationsRes.data || [];
  }

  function copyClip(t) { navigator.clipboard?.writeText(t); }

  function statusBadge(s) {
    const map = { 'pending':'badge-yellow','confirmed':'badge-green','rejected':'badge-red' };
    return map[s] || 'badge-stone';
  }
</script>

<div class="mx-auto max-w-4xl px-4 py-8">

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center"><p class="text-stone-400">Memuat...</p></div>

  {:else if payingForOrder && order}
    <!-- ════════════════════════════════════════════════════════
         ORDER-BASED PAYMENT (Perusahaan pays UMKM)
         ════════════════════════════════════════════════════════ -->

    <a href="/dashboard/perusahaan/orders" class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">
      ← Kembali ke Pesanan
    </a>

    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-stone-800">💳 Bayar UMKM</h1>
        <p class="text-sm text-stone-500">Konfirmasi pembayaran pickup minyak jelantah</p>
      </div>
    </div>

    <!-- Order Summary -->
    <div class="card mb-6">
      <h2 class="font-semibold text-stone-800 mb-3">📋 Ringkasan Pesanan</h2>
      <div class="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <p class="text-stone-500">ID Pesanan</p>
          <p class="font-medium text-stone-800 font-mono">#{order.id.slice(0,8)}</p>
        </div>
        <div>
          <p class="text-stone-500">Jumlah Minyak</p>
          <p class="font-medium text-stone-800">{order.requested_liters} L</p>
        </div>
        <div>
          <p class="text-stone-500">Total Harga</p>
          <p class="font-medium text-jelantah-600 text-lg font-bold">
            {formatRupiah(parseFloat(order.requested_liters || 0) * parseFloat(order.oil_listings?.price_per_liter || 0))}
          </p>
        </div>
      </div>
    </div>

    <!-- UMKM Bank Detail -->
    <div class="card mb-6">
      <h2 class="font-semibold text-stone-800 mb-3">🏪 Transfer ke UMKM</h2>

      <div class="rounded-xl bg-green-50 p-5 mb-4">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-3xl">🏪</span>
          <div>
            <p class="font-semibold text-stone-800">{umkmProfile?.umkm_name || umkmProfile?.full_name || 'UMKM'}</p>
            <p class="text-xs text-stone-500">Penerima pembayaran</p>
          </div>
        </div>

        {#if umkmProfile?.bank_account}
          <div class="bg-white rounded-xl p-4">
            <p class="text-xs text-stone-500 mb-1">Bank Tujuan</p>
            <p class="font-semibold text-stone-800 text-lg">{umkmProfile.bank_name || '-'}</p>
            <div class="flex items-center justify-between mt-2">
              <div>
                <p class="text-xs text-stone-500">Nomor Rekening</p>
                <p class="text-xl font-bold font-mono tracking-wider text-stone-800">{umkmProfile.bank_account}</p>
              </div>
              <button onclick={() => { copyClip(umkmProfile.bank_account); bankSuccess = '📋 Disalin!'; }}
                class="btn-secondary text-xs px-3 py-2">📋 Salin</button>
            </div>
            <p class="text-sm text-stone-600 mt-2">a.n. <strong>{umkmProfile.bank_holder}</strong></p>
          </div>
        {:else}
          <div class="bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
            ⚠️ UMKM ini belum mengatur rekening bank. Hubungi UMKM untuk info pembayaran.
          </div>
        {/if}
      </div>

      {#if bankError}
        <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{bankError}</div>
      {/if}
      {#if bankSuccess}
        <div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{bankSuccess}</div>
      {/if}

      <h3 class="font-semibold text-stone-800 mb-4">Konfirmasi Pembayaran</h3>

      <div class="grid gap-4 sm:grid-cols-2 mb-4">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Jumlah Transfer (Rp)</label>
          <input type="number" class="input-field text-lg font-semibold" bind:value={bankAmount}
            placeholder={String(parseInt(order.requested_liters || 0) * parseInt(order.oil_listings?.price_per_liter || 0))} />
          <p class="text-xs text-stone-400 mt-1">Total: {formatRupiah(parseFloat(order.requested_liters || 0) * parseFloat(order.oil_listings?.price_per_liter || 0))}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Tanggal Transfer</label>
          <input type="date" class="input-field" bind:value={bankTransferDate} />
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-stone-700 mb-1">Nama Pengirim</label>
        <input type="text" class="input-field" bind:value={bankSenderName} placeholder={profile?.full_name || ''} />
      </div>

      <button onclick={handleOrderPayment} class="btn-primary w-full" disabled={bankSubmitting}>
        {bankSubmitting ? 'Mengirim...' : '✅ Konfirmasi Pembayaran ke UMKM'}
      </button>

      <!-- Existing payments for this order -->
      {#if orderPayments.length > 0}
        <div class="mt-6 pt-4 border-t border-stone-100">
          <p class="text-sm font-medium text-stone-700 mb-2">Riwayat Pembayaran Pesanan Ini:</p>
          {#each orderPayments as p}
            <div class="flex items-center justify-between bg-stone-50 rounded-lg p-3 mb-2 text-sm">
              <div>
                <p class="text-stone-600">{p.sender_name || 'Perusahaan'}</p>
                <p class="text-xs text-stone-400">{new Date(p.created_at).toLocaleDateString('id-ID')}</p>
              </div>
              <div class="text-right">
                <p class="font-semibold">{formatRupiah(p.amount)}</p>
                <span class="{statusBadge(p.status)} text-xs">{p.status}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else}
    <!-- ════════════════════════════════════════════════════════
         GENERAL PAYMENT (no order_id — Pilih Bank + Manual)
         ════════════════════════════════════════════════════════ -->

    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-stone-800">💳 Pembayaran</h1>
        <p class="text-sm text-stone-500">Transfer ke bank tujuan, konfirmasi pembayaran</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1 overflow-x-auto">
      <button onclick={() => tab = 'banks'}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition {tab === 'banks' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}">
        🏦 Pilih Bank
      </button>
      <button onclick={() => tab = 'manual'}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition {tab === 'manual' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}">
        📋 Form Manual
      </button>
      <button onclick={() => tab = 'history'}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition {tab === 'history' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}">
        📄 Riwayat
      </button>
    </div>

    {#if tab === 'banks'}
      {#if selectedBank}
        <!-- ── Bank Detail + Konfirmasi ── -->
        <button onclick={backToBanks} class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">← Kembali</button>

        <div class="card overflow-hidden">
          <div class="bg-gradient-to-r {getBankColor(selectedBank.bank_name).bg} -mx-6 -mt-6 px-6 pt-6 pb-8 mb-6">
            <div class="flex items-center gap-4">
              <span class="text-5xl">{getBankIcon(selectedBank.bank_name)}</span>
              <div class="{getBankColor(selectedBank.bank_name).text}">
                <p class="text-lg font-bold">Transfer ke {selectedBank.bank_name}</p>
                <p class="opacity-80 text-sm">a.n. {selectedBank.account_name}</p>
              </div>
            </div>
          </div>

          <div class="bg-stone-50 rounded-xl p-5 mb-6 text-center">
            <p class="text-xs text-stone-500 mb-2">Nomor Rekening</p>
            <p class="text-3xl font-bold text-stone-800 tracking-widest font-mono mb-3">{selectedBank.account_number}</p>
            <button onclick={() => { copyClip(selectedBank.account_number); bankSuccess = '📋 Disalin!'; }}
              class="btn-secondary text-sm px-4 py-2">📋 Salin</button>
          </div>

          {#if bankError}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{bankError}</div>{/if}
          {#if bankSuccess}<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{bankSuccess}</div>{/if}

          <h3 class="font-semibold text-stone-800 mb-4">Konfirmasi Pembayaran</h3>
          <div class="grid gap-4 sm:grid-cols-2 mb-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Jumlah (Rp)</label>
              <input type="number" class="input-field text-lg font-semibold" bind:value={bankAmount} placeholder="100000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Tanggal</label>
              <input type="date" class="input-field" bind:value={bankTransferDate} />
            </div>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-stone-700 mb-1">Nama Pengirim</label>
            <input type="text" class="input-field" bind:value={bankSenderName} placeholder="Nama Anda" />
          </div>
          <button onclick={async () => {
            bankError = ''; bankSuccess = '';
            if (!bankAmount || parseFloat(bankAmount) <= 0) { bankError = 'Masukkan jumlah.'; return; }
            bankSubmitting = true;
            const { data: { session } } = await supabase.auth.getSession();
            const { error } = await createPaymentConfirmation({
              order_id: null, transaction_id: null, user_id: session.user.id,
              bank_id: selectedBank.id, amount: parseFloat(bankAmount),
              transfer_date: bankTransferDate, sender_name: bankSenderName || null,
              sender_bank: null, notes: null,
            });
            bankSubmitting = false;
            if (error) { bankError = error.message; return; }
            bankSuccess = '✅ Konfirmasi berhasil!';
            const r = await getPaymentConfirmations(session.user.id);
            confirmations = r.data || [];
          }} class="btn-primary w-full" disabled={bankSubmitting}>
            {bankSubmitting ? 'Mengirim...' : '✅ Konfirmasi Pembayaran'}
          </button>
        </div>

      {:else}
        <!-- ── Grid Bank ── -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {#each banks as bank}
            <button onclick={() => selectBank(bank)}
              class="card flex flex-col items-center justify-center py-8 hover:shadow-md hover:border-jelantah-300 transition-all text-center group">
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
            <p class="text-sm text-stone-400 mt-1">Admin akan menambahkan melalui Dashboard → Kelola Bank.</p>
          </div>
        {/if}
      {/if}

    {:else if tab === 'manual'}
      <div class="card">
        <div class="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
          <p class="font-semibold">🏦 Sudah transfer?</p>
          <p class="mt-1">Isi form ini jika sudah transfer dan ingin kirim bukti + catatan.</p>
        </div>
        {#if formError}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>{/if}
        {#if formSuccess}<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{formSuccess}</div>{/if}
        <form onsubmit={handleManualSubmit}>
          <label class="block text-sm font-medium text-stone-700 mb-1">Bank Tujuan</label>
          <select class="input-field mb-4" bind:value={selectedBankId}>
            <option value="">-- Pilih Bank --</option>
            {#each banks as bank}
              <option value={bank.id}>{bank.bank_name} — a.n. {bank.account_name}</option>
            {/each}
          </select>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Jumlah (Rp)</label>
              <input type="number" class="input-field" bind:value={amount} placeholder="100000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Tanggal</label>
              <input type="date" class="input-field" bind:value={transferDate} />
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Nama Pengirim</label>
              <input type="text" class="input-field" bind:value={senderName} placeholder="Nama Anda" />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1">Bank Pengirim</label>
              <input type="text" class="input-field" bind:value={senderBank} placeholder="BCA, Mandiri" />
            </div>
          </div>
          <div class="mt-4">
            <label class="block text-sm font-medium text-stone-700 mb-1">URL Bukti Transfer</label>
            <input type="url" class="input-field" bind:value={proofImageUrl} placeholder="Link gambar/invoice" />
          </div>
          <div class="mt-4">
            <label class="block text-sm font-medium text-stone-700 mb-1">Catatan</label>
            <textarea class="input-field" bind:value={notes} placeholder="Pesanan #xxx" rows="2"></textarea>
          </div>
          <button type="submit" class="btn-secondary w-full mt-6" disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Konfirmasi'}
          </button>
        </form>
      </div>

    {:else if tab === 'history'}
      <div class="card">
        <h2 class="font-semibold text-stone-800 mb-4">Riwayat Pembayaran</h2>
        {#if confirmations.length === 0}
          <p class="text-sm text-stone-400 text-center py-8">Belum ada riwayat.</p>
        {:else}
          <div class="space-y-3">
            {#each confirmations as conf}
              <div class="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p class="text-sm font-medium text-stone-800">
                    {getBankIcon(conf.payment_banks?.bank_name || '')} {conf.payment_banks?.bank_name || 'Bank'}
                    {#if conf.order_id}
                      <span class="text-xs text-stone-400">— Pesanan #{conf.order_id.slice(0,8)}</span>
                    {/if}
                  </p>
                  <p class="text-xs text-stone-500">
                    {conf.sender_name || ''} • {conf.transfer_date ? new Date(conf.transfer_date).toLocaleDateString('id-ID') : ''}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold">{formatRupiah(conf.amount)}</p>
                  <span class="{statusBadge(conf.status)} text-xs">{conf.status}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>