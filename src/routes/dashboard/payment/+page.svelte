<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getPaymentConfirmationsForOrder, confirmOrderPayment, getPlatformConfig } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let loading = $state(true);

  // ── Order-based payment (from ?order_id=xxx) ──
  let orderId = $state('');
  let order = $state(null);
  let umkmProfile = $state(null);
  let orderPayments = $state([]);
  let adminFeePercent = $state(0);

  // ── Form state ──
  let bankSenderName = $state('');
  let bankTransferDate = $state(new Date().toISOString().split('T')[0]);
  let bankSubmitting = $state(false);
  let bankError = $state('');
  let bankSuccess = $state('');

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

    if (orderId) {
      // Order-based payment flow — Perusahaan paying for an order
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

    loading = false;
  });

  // ── Bayar untuk order ──
  let subtotal = $derived(
    order ? parseFloat(order.requested_liters || 0) * parseFloat(order.oil_listings?.price_per_liter || 0) : 0
  );
  let adminFeeAmount = $derived(subtotal * (adminFeePercent / 100));
  let totalToPay = $derived(subtotal + adminFeeAmount);

  // Check if already paid
  let alreadyPaid = $derived(
    orderPayments.some(p => p.status === 'confirmed' || p.status === 'paid')
  );

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

  {:else if !orderId}
    <!-- ════════════════════════════════════════════════════════
         NO ORDER SELECTED — direct user to choose an order
         ════════════════════════════════════════════════════════ -->
    <div class="empty-state py-16">
      <svg class="empty-state-icon w-16 h-16"><use href="/icons.svg#credit-card"/></svg>
      <h2 class="empty-state-title">Pilih Pesanan untuk Dibayar</h2>
      <p class="empty-state-desc">
        Silakan pilih pesanan yang sudah selesai dari halaman Pesanan Saya untuk melakukan pembayaran.
      </p>
      <a href="/dashboard/perusahaan/orders" class="btn-primary btn-md mt-4">
        <svg class="icon w-4 h-4"><use href="/icons.svg#package"/></svg>
        Ke Pesanan Saya
      </a>
    </div>

  {:else if !order}
    <div class="empty-state py-16">
      <svg class="empty-state-icon w-16 h-16"><use href="/icons.svg#alert-circle"/></svg>
      <h2 class="empty-state-title">Pesanan Tidak Ditemukan</h2>
      <p class="empty-state-desc">Pesanan dengan ID tersebut tidak ditemukan.</p>
      <a href="/dashboard/perusahaan/orders" class="btn-primary btn-md mt-4">Kembali ke Pesanan</a>
    </div>

  {:else}
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
              <button onclick={() => {
                  const copyText = `${umkmProfile.bank_name || ''} — ${umkmProfile.bank_account} — a.n. ${umkmProfile.bank_holder || ''}`;
                  copyClip(copyText);
                  bankSuccess = 'Data bank disalin!';
                }}
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

      {#if alreadyPaid}
        <div class="alert-success mb-4">
          <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg>
          <span>Pembayaran untuk pesanan ini sudah dilakukan.</span>
        </div>
      {:else}
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
              <span class="text-earth-700 flex items-center gap-1">
                Biaya Admin ({adminFeePercent}%)
                <span class="relative group inline-flex items-center">
                  <svg class="icon w-3.5 h-3.5 text-earth-500 cursor-help"><use href="/icons.svg#info"/></svg>
                  <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-earth-900 text-white text-xs rounded-lg p-2 shadow-lg z-10 text-center">
                    Biaya layanan platform untuk pemrosesan pembayaran dan verifikasi transaksi.
                    <span class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-earth-900"></span>
                  </span>
                </span>
              </span>
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
      {/if}

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
  {/if}
</div>
