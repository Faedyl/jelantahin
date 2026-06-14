<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getActivePaymentBanks, createPaymentConfirmation, getPaymentConfirmations, getPaymentConfirmationsForOrder, confirmOrderPayment, getPlatformConfig } from '$lib/supabase.js';
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
  let adminFeePercent = $state(0);

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
        // Get admin fee
        const { data: feeData } = await getPlatformConfig('admin_fee_percentage');
        adminFeePercent = parseFloat(feeData?.value || '0');

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
  let subtotal = $derived(
    order ? parseFloat(order.requested_liters || 0) * parseFloat(order.oil_listings?.price_per_liter || 0) : 0
  );
  let adminFeeAmount = $derived(subtotal * (adminFeePercent / 100));
  let totalToPay = $derived(subtotal + adminFeeAmount);

  async function handleOrderPayment() {
    bankError = '';
    bankSuccess = '';

    if (!bankSenderName.trim()) { bankError = 'Masukkan nama pengirim.'; return; }
    if (totalToPay <= 0) { bankError = 'Jumlah pembayaran tidak valid.'; return; }

    bankSubmitting = true;
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await confirmOrderPayment({
      orderId: orderId,
      userId: session.user.id,
      bankId: null,
      amount: totalToPay,
      senderName: bankSenderName,
      adminFee: adminFeeAmount,
    });

    bankSubmitting = false;

    if (error) { bankError = 'Gagal: ' + error.message; return; }

    bankSuccess = `Pembayaran untuk pesanan #${orderId.slice(0,8)} berhasil dikonfirmasi!`;

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
    formSuccess = 'Konfirmasi berhasil dikirim!';
    selectedBankId = ''; amount = ''; senderName = ''; senderBank = ''; proofImageUrl = ''; notes = '';

    const confirmationsRes = await getPaymentConfirmations(session.user.id);
    confirmations = confirmationsRes.data || [];
  }

  function copyClip(t) { navigator.clipboard?.writeText(t); }

  function statusBadge(s) {
    const map = { 'pending':'badge-warning','confirmed':'badge-success','rejected':'badge-danger' };
    return map[s] || 'badge-default';
  }
</script>

<div class="page-container py-8">

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center">
      <div class="skeleton-card w-full max-w-md">
        <div class="skeleton-text"></div>
        <div class="skeleton-text w-2/3"></div>
      </div>
    </div>

  {:else if payingForOrder && order}
    <!-- ════════════════════════════════════════════════════════
         ORDER-BASED PAYMENT (Perusahaan pays UMKM)
         ════════════════════════════════════════════════════════ -->

    <a href="/dashboard/perusahaan/orders" class="nav-link mb-4 inline-flex">
      <svg class="icon w-4 h-4"><use href="/icons.svg#arrow-right"/></svg>
      <span>Kembali ke Pesanan</span>
    </a>

    <div class="page-header flex items-center justify-between">
      <div>
        <h1 class="page-title flex items-center gap-2">
          <svg class="icon w-6 h-6"><use href="/icons.svg#credit-card"/></svg>
          Bayar UMKM
        </h1>
        <p class="page-subtitle">Konfirmasi pembayaran pickup minyak jelantah</p>
      </div>
    </div>

    <!-- Order Summary -->
    <div class="card p-5 mb-6">
      <h2 class="font-semibold text-earth-900 mb-3 flex items-center gap-1">
        <svg class="icon w-4 h-4"><use href="/icons.svg#menu"/></svg>
        Ringkasan Pesanan
      </h2>
      <div class="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <p class="text-earth-600">ID Pesanan</p>
          <p class="font-medium text-earth-800 font-mono">#{order.id.slice(0,8)}</p>
        </div>
        <div>
          <p class="text-earth-600">Jumlah Minyak</p>
          <p class="font-medium text-earth-800">{order.requested_liters} L</p>
        </div>
        <div>
          <p class="text-earth-600">Total Harga</p>
          <p class="font-medium text-gold-600 text-lg font-bold">
            {formatRupiah(parseFloat(order.requested_liters || 0) * parseFloat(order.oil_listings?.price_per_liter || 0))}
          </p>
        </div>
      </div>
    </div>

    <!-- UMKM Bank Detail -->
    <div class="card p-5 mb-6">
      <h2 class="font-semibold text-earth-900 mb-3 flex items-center gap-1">
        <svg class="icon w-4 h-4"><use href="/icons.svg#shop"/></svg>
        Transfer ke UMKM
      </h2>

      <div class="rounded-lg bg-herb-100 p-5 mb-4">
        <div class="flex items-center gap-3 mb-3">
          <svg class="icon w-8 h-8 text-herb-600"><use href="/icons.svg#shop"/></svg>
          <div>
            <p class="font-semibold text-earth-800">{umkmProfile?.umkm_name || umkmProfile?.full_name || 'UMKM'}</p>
            <p class="text-xs text-earth-600">Penerima pembayaran</p>
          </div>
        </div>

        {#if umkmProfile?.bank_account}
          <div class="bg-white rounded-lg p-4">
            <p class="text-xs text-earth-600 mb-1">Bank Tujuan</p>
            <p class="font-semibold text-earth-800 text-lg">{umkmProfile.bank_name || '-'}</p>
            <div class="flex items-center justify-between mt-2">
              <div>
                <p class="text-xs text-earth-600">Nomor Rekening</p>
                <p class="text-xl font-bold font-mono tracking-wider text-earth-800">{umkmProfile.bank_account}</p>
              </div>
              <button onclick={() => { copyClip(umkmProfile.bank_account); bankSuccess = 'Disalin!'; }}
                class="btn-secondary btn-sm">
                <svg class="icon w-3.5 h-3.5"><use href="/icons.svg#menu"/></svg>
                Salin
              </button>
            </div>
            <p class="text-sm text-earth-700 mt-2">a.n. <strong>{umkmProfile.bank_holder}</strong></p>
          </div>
        {:else}
          <div class="alert-warning">
            <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
            <span>UMKM ini belum mengatur rekening bank. Hubungi UMKM untuk info pembayaran.</span>
          </div>
        {/if}
      </div>

      {#if bankError}
        <div class="alert-error mb-4">
          <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
          <span>{bankError}</span>
        </div>
      {/if}
      {#if bankSuccess}
        <div class="alert-success mb-4">
          <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg>
          <span>{bankSuccess}</span>
        </div>
      {/if}

      <h3 class="font-semibold text-earth-900 mb-4">Konfirmasi Pembayaran</h3>

      <!-- Fixed amount display with admin fee breakdown -->
      <div class="rounded-lg bg-herb-100 p-4 mb-4">
        <p class="text-xs text-earth-600 uppercase tracking-wide mb-2 text-center">Rincian Pembayaran</p>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-earth-700">Subtotal ({order.requested_liters}L × {formatRupiah(order.oil_listings?.price_per_liter || 0)})</span>
            <span class="font-medium text-earth-800">{formatRupiah(subtotal)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-earth-700">Biaya Admin ({adminFeePercent}%)</span>
            <span class="font-medium text-earth-800">{formatRupiah(adminFeeAmount)}</span>
          </div>
          <div class="flex justify-between border-t border-herb-200 pt-2 mt-2">
            <span class="font-semibold text-earth-800">Total yang Harus Dibayar</span>
            <span class="text-xl font-bold text-gold-700">{formatRupiah(totalToPay)}</span>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <label class="input-label">Tanggal Transfer</label>
        <input type="date" class="input" bind:value={bankTransferDate} />
      </div>

      <div class="mb-4">
        <label class="input-label">Nama Pengirim</label>
        <input type="text" class="input" bind:value={bankSenderName} placeholder={profile?.full_name || ''} />
      </div>

      <button onclick={handleOrderPayment} class="btn-primary btn-md w-full" disabled={bankSubmitting}>
        {bankSubmitting ? 'Mengirim...' : 'Konfirmasi Pembayaran ke UMKM'}
        <svg class="icon w-4 h-4"><use href="/icons.svg#arrow-right"/></svg>
      </button>

      <!-- Existing payments for this order -->
      {#if orderPayments.length > 0}
        <div class="divider"></div>
        <p class="text-sm font-medium text-earth-700 mb-2">Riwayat Pembayaran Pesanan Ini:</p>
        {#each orderPayments as p}
          <div class="flex items-center justify-between bg-earth-200 rounded-lg p-3 mb-2 text-sm">
            <div>
              <p class="text-earth-700">{p.sender_name || 'Perusahaan'}</p>
              <p class="text-xs text-earth-600">{new Date(p.created_at).toLocaleDateString('id-ID')}</p>
            </div>
            <div class="text-right">
              <p class="font-semibold">{formatRupiah(p.amount)}</p>
              <span class="{statusBadge(p.status)} text-xs">{p.status}</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>

  {:else}
    <!-- ════════════════════════════════════════════════════════
         GENERAL PAYMENT (no order_id — Pilih Bank + Manual)
         ════════════════════════════════════════════════════════ -->

    <div class="page-header">
      <h1 class="page-title flex items-center gap-2">
        <svg class="icon w-6 h-6"><use href="/icons.svg#credit-card"/></svg>
        Pembayaran
      </h1>
      <p class="page-subtitle">Transfer ke bank tujuan, konfirmasi pembayaran</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-earth-200 rounded-lg p-1 overflow-x-auto">
      <button onclick={() => tab = 'banks'}
        class="btn-ghost btn-sm {tab === 'banks' ? 'nav-link-active' : ''}">
        <svg class="icon w-4 h-4"><use href="/icons.svg#bank"/></svg>
        Pilih Bank
      </button>
      <button onclick={() => tab = 'manual'}
        class="btn-ghost btn-sm {tab === 'manual' ? 'nav-link-active' : ''}">
        <svg class="icon w-4 h-4"><use href="/icons.svg#menu"/></svg>
        Form Manual
      </button>
      <button onclick={() => tab = 'history'}
        class="btn-ghost btn-sm {tab === 'history' ? 'nav-link-active' : ''}">
        <svg class="icon w-4 h-4"><use href="/icons.svg#credit-card"/></svg>
        Riwayat
      </button>
    </div>

    {#if tab === 'banks'}
      {#if selectedBank}
        <!-- ── Bank Detail + Konfirmasi ── -->
        <button onclick={backToBanks} class="nav-link mb-4 inline-flex">
          <svg class="icon w-4 h-4"><use href="/icons.svg#arrow-right"/></svg>
          <span>Kembali</span>
        </button>

        <div class="card overflow-hidden p-6">
          <div class="rounded-lg bg-herb-100 p-5 mb-6 text-center">
            <svg class="icon w-12 h-12 mx-auto text-herb-600 mb-2"><use href="/icons.svg#bank"/></svg>
            <p class="text-lg font-bold text-earth-800">Transfer ke {selectedBank.bank_name}</p>
            <p class="text-sm text-earth-600">a.n. {selectedBank.account_name}</p>
          </div>

          <div class="card-flat p-5 mb-6 text-center">
            <p class="text-xs text-earth-600 mb-2">Nomor Rekening</p>
            <p class="text-3xl font-bold text-earth-800 tracking-widest font-mono mb-3">{selectedBank.account_number}</p>
            <button onclick={() => { copyClip(selectedBank.account_number); bankSuccess = 'Disalin!'; }}
              class="btn-secondary btn-md">
              <svg class="icon w-4 h-4"><use href="/icons.svg#menu"/></svg>
              Salin
            </button>
          </div>

          {#if bankError}<div class="alert-error mb-4"><svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg><span>{bankError}</span></div>{/if}
          {#if bankSuccess}<div class="alert-success mb-4"><svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg><span>{bankSuccess}</span></div>{/if}

          <h3 class="font-semibold text-earth-900 mb-4">Konfirmasi Pembayaran</h3>
          <div class="grid gap-4 sm:grid-cols-2 mb-4">
            <div>
              <label class="input-label">Jumlah (Rp)</label>
              <input type="number" class="input text-lg font-semibold" bind:value={bankAmount} placeholder="100000" />
            </div>
            <div>
              <label class="input-label">Tanggal</label>
              <input type="date" class="input" bind:value={bankTransferDate} />
            </div>
          </div>
          <div class="mb-4">
            <label class="input-label">Nama Pengirim</label>
            <input type="text" class="input" bind:value={bankSenderName} placeholder="Nama Anda" />
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
            bankSuccess = 'Konfirmasi berhasil!';
            const r = await getPaymentConfirmations(session.user.id);
            confirmations = r.data || [];
          }} class="btn-primary btn-md w-full" disabled={bankSubmitting}>
            {bankSubmitting ? 'Mengirim...' : 'Konfirmasi Pembayaran'}
          </button>
        </div>

      {:else}
        <!-- ── Grid Bank ── -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {#each banks as bank}
            <button onclick={() => selectBank(bank)}
              class="card-hover flex flex-col items-center justify-center py-8 text-center">
              <svg class="icon w-10 h-10 text-gold-500 mb-3 group-hover:scale-110 transition-transform"><use href="/icons.svg#bank"/></svg>
              <p class="font-bold text-earth-800 text-lg">{bank.bank_name}</p>
              <p class="text-xs text-earth-600 mt-1">a.n. {bank.account_name}</p>
              <span class="text-xs font-mono text-earth-600 mt-1">•••• {bank.account_number.slice(-4)}</span>
            </button>
          {/each}
        </div>
        {#if banks.length === 0}
          <div class="empty-state">
            <svg class="empty-state-icon"><use href="/icons.svg#bank"/></svg>
            <p class="empty-state-title">Belum ada bank tersedia</p>
            <p class="empty-state-desc">Admin akan menambahkan melalui Dashboard → Kelola Bank.</p>
          </div>
        {/if}
      {/if}

    {:else if tab === 'manual'}
      <div class="card p-5">
        <div class="alert-info mb-6">
          <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#bank"/></svg>
          <div>
            <p class="font-semibold">Sudah transfer?</p>
            <p class="mt-1">Isi form ini jika sudah transfer dan ingin kirim bukti + catatan.</p>
          </div>
        </div>
        {#if formError}<div class="alert-error mb-4"><svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg><span>{formError}</span></div>{/if}
        {#if formSuccess}<div class="alert-success mb-4"><svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg><span>{formSuccess}</span></div>{/if}
        <form onsubmit={handleManualSubmit}>
          <label class="input-label">Bank Tujuan</label>
          <select class="input mb-4" bind:value={selectedBankId}>
            <option value="">-- Pilih Bank --</option>
            {#each banks as bank}
              <option value={bank.id}>{bank.bank_name} — a.n. {bank.account_name}</option>
            {/each}
          </select>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="input-label">Jumlah (Rp)</label>
              <input type="number" class="input" bind:value={amount} placeholder="100000" />
            </div>
            <div>
              <label class="input-label">Tanggal</label>
              <input type="date" class="input" bind:value={transferDate} />
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label class="input-label">Nama Pengirim</label>
              <input type="text" class="input" bind:value={senderName} placeholder="Nama Anda" />
            </div>
            <div>
              <label class="input-label">Bank Pengirim</label>
              <input type="text" class="input" bind:value={senderBank} placeholder="BCA, Mandiri" />
            </div>
          </div>
          <div class="mt-4">
            <label class="input-label">URL Bukti Transfer</label>
            <input type="url" class="input" bind:value={proofImageUrl} placeholder="Link gambar/invoice" />
          </div>
          <div class="mt-4">
            <label class="input-label">Catatan</label>
            <textarea class="textarea" bind:value={notes} placeholder="Pesanan #xxx" rows="2"></textarea>
          </div>
          <button type="submit" class="btn-secondary btn-md w-full mt-6" disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Konfirmasi'}
          </button>
        </form>
      </div>

    {:else if tab === 'history'}
      <div class="card p-5">
        <h2 class="font-semibold text-earth-900 mb-4">Riwayat Pembayaran</h2>
        {#if confirmations.length === 0}
          <div class="empty-state py-8">
            <svg class="empty-state-icon"><use href="/icons.svg#credit-card"/></svg>
            <p class="empty-state-title">Belum ada riwayat</p>
            <p class="empty-state-desc">Pembayaran akan muncul setelah Anda melakukan konfirmasi.</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each confirmations as conf}
              <div class="flex items-center justify-between border-b border-earth-300/50 pb-3 last:border-0 last:pb-0">
                <div>
                  <p class="text-sm font-medium text-earth-800 flex items-center gap-1">
                    <svg class="icon w-4 h-4 text-earth-600"><use href="/icons.svg#bank"/></svg>
                    {conf.payment_banks?.bank_name || 'Bank'}
                    {#if conf.order_id}
                      <span class="text-xs text-earth-500">— Pesanan #{conf.order_id.slice(0,8)}</span>
                    {/if}
                  </p>
                  <p class="text-xs text-earth-600">
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
