<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getMyListings, getOrdersAsUmkm } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import Map from '$lib/Map.svelte';

  let profile = $state(null);
  let listings = $state([]);
  let orders = $state([]);
  let tab = $state('listings');
  let loading = $state(true);

  let showRewardModal = $state(false);
  let rewardMessage = $state('');

  function setTab(value) {
    tab = value;
  }

  let listingMarkers = $derived(
    listings
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((l) => ({
        lat: Number(l.latitude),
        lng: Number(l.longitude),
        popup: `<p style="font-size:12px;margin:0;">${l.quantity_liters}L — Rp ${Number(
          l.price_per_liter
        ).toLocaleString('id-ID')}/L</p><p style="font-size:11px;color:#78716c;margin:2px 0;">${
          l.city || l.pickup_address?.slice(0, 30) || ''
        } • ${statusLabel(l.status)}</p>`
      }))
  );

  let completedOrders = $derived(orders.filter((order) => order.status === 'completed'));

  let totalLiters = $derived(
    completedOrders.reduce((total, order) => {
      return total + Number(order.requested_liters || 0);
    }, 0)
  );

  let totalCuan = $derived(
    completedOrders.reduce((total, order) => {
      const liters = Number(order.requested_liters || 0);
      const price = Number(order.oil_listings?.price_per_liter || 0);
      return total + liters * price;
    }, 0)
  );

  let rewardPoints = $derived(totalLiters * 10);

  const rewardOptions = [
    {
      id: 1,
      title: 'Voucher Diskon Pickup',
      description: 'Potongan biaya layanan pickup untuk transaksi berikutnya.',
      points: 100,
      type: 'voucher'
    },
    {
      id: 2,
      title: 'Voucher UMKM Partner',
      description: 'Voucher belanja untuk kebutuhan usaha UMKM.',
      points: 150,
      type: 'voucher'
    },
    {
      id: 3,
      title: 'Sertifikat Kontribusi Lingkungan',
      description: 'Sertifikat digital sebagai bukti kontribusi pengurangan limbah minyak.',
      points: 50,
      type: 'certificate'
    }
  ];

  const trackingSteps = [
    { key: 'pending', label: 'Menunggu' },
    { key: 'confirmed', label: 'Dikonfirmasi' },
    { key: 'picked_up', label: 'Dijemput' },
    { key: 'completed', label: 'Selesai' }
  ];

  onMount(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);

    if (!userProfile.data || userProfile.data.role !== 'umkm') {
      return goto('/dashboard');
    }

    profile = userProfile.data;

    const [listingsRes, ordersRes] = await Promise.all([
      getMyListings(session.user.id),
      getOrdersAsUmkm(session.user.id)
    ]);

    listings = listingsRes.data || [];
    orders = ordersRes.data || [];
    loading = false;
  });

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  function statusBadge(status) {
    const map = {
      available: 'badge-green',
      claimed: 'badge-blue',
      completed: 'badge-green',
      cancelled: 'badge-red',
      pending: 'badge-yellow',
      confirmed: 'badge-blue',
      picked_up: 'badge-green'
    };

    return map[status] || 'badge-stone';
  }

  function statusLabel(status) {
    const map = {
      available: 'Tersedia',
      claimed: 'Diproses Pengolah',
      pending: 'Menunggu Konfirmasi',
      confirmed: 'Dikonfirmasi',
      picked_up: 'Sudah Dijemput',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    };

    return map[status] || status;
  }

  function stepIndex(status) {
    if (status === 'cancelled') return -1;
    return trackingSteps.findIndex((step) => step.key === status);
  }

  function openRewardModal() {
    rewardMessage = '';
    showRewardModal = true;
  }

  function closeRewardModal() {
    showRewardModal = false;
    rewardMessage = '';
  }

  function redeemReward(reward) {
    if (rewardPoints < reward.points) {
      rewardMessage = `Poin belum cukup untuk menukar ${reward.title}. Dibutuhkan ${reward.points} poin.`;
      return;
    }

    rewardMessage = `${reward.title} berhasil ditukar! Untuk prototype, data penukaran belum disimpan ke database.`;
  }
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <a
    href="/dashboard/umkm"
    class="mb-4 inline-block text-sm text-jelantah-600 hover:text-jelantah-700"
  >
    ← Kembali ke Dashboard
  </a>

  <h1 class="mb-6 text-xl font-bold text-stone-800">Riwayat & Listing</h1>

  <div class="mb-6 grid gap-3 sm:grid-cols-3">
    <div class="card">
      <p class="text-xs text-stone-500">Total Jelantah Tersalurkan</p>
      <p class="mt-1 text-2xl font-bold text-stone-800">{totalLiters} L</p>
      <p class="mt-1 text-xs text-stone-400">Dihitung dari pickup yang selesai</p>
    </div>

    <div class="card">
      <p class="text-xs text-stone-500">Total Cuan</p>
      <p class="mt-1 text-2xl font-bold text-jelantah-700">{formatRupiah(totalCuan)}</p>
      <p class="mt-1 text-xs text-stone-400">Estimasi hasil penyaluran jelantah</p>
    </div>

    <div class="card">
      <p class="text-xs text-stone-500">Poin Reward</p>
      <p class="mt-1 text-2xl font-bold text-yellow-600">{rewardPoints} poin</p>
      <p class="mt-1 text-xs text-stone-400">1 liter = 10 poin</p>
    </div>
  </div>

  <div class="card mb-6 bg-gradient-to-br from-green-50 to-yellow-50">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-semibold text-jelantah-700">Reward Jelantahin</p>
        <h2 class="mt-1 text-lg font-bold text-stone-800">Tukar poin jadi manfaat</h2>
        <p class="mt-1 text-sm text-stone-600">
          Poin dari minyak jelantah yang berhasil disalurkan dapat ditukar menjadi voucher
          atau sertifikat kontribusi lingkungan.
        </p>
      </div>

      <div class="flex gap-2">
        <button onclick={openRewardModal} class="btn-primary px-3 py-2 text-xs">
          Tukar Reward
        </button>

        <button
          onclick={openRewardModal}
          class="rounded-lg border border-jelantah-600 px-3 py-2 text-xs font-semibold text-jelantah-700 hover:bg-green-50"
        >
          Lihat Sertifikat
        </button>
      </div>
    </div>
  </div>

  <div class="relative z-20 mb-6 flex gap-2">
    <button
      type="button"
      onclick={() => setTab('listings')}
      class={`rounded-lg px-4 py-2 text-sm ${
        tab === 'listings'
          ? 'bg-jelantah-100 font-semibold text-jelantah-700'
          : 'text-stone-500 hover:bg-stone-100'
      }`}
    >
      Listing
    </button>

    <button
      type="button"
      onclick={() => setTab('orders')}
      class={`rounded-lg px-4 py-2 text-sm ${
        tab === 'orders'
          ? 'bg-jelantah-100 font-semibold text-jelantah-700'
          : 'text-stone-500 hover:bg-stone-100'
      }`}
    >
      Pesanan
    </button>
  </div>

  {#if loading}
    <p class="text-sm text-stone-400">Memuat...</p>
  {:else if tab === 'listings'}
    {#if listingMarkers.length > 0}
      <div class="card mb-4 p-2">
        <Map markers={listingMarkers} height="280px" zoom={12} />
      </div>
    {/if}

    <div class="card">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-semibold text-stone-800">Semua Listing ({listings.length})</h2>
        <a href="/dashboard/umkm/listing" class="text-sm text-jelantah-600 hover:text-jelantah-700">
          + Baru
        </a>
      </div>

      {#if listings.length === 0}
        <p class="text-sm text-stone-400">Belum ada listing.</p>
      {:else}
        <div class="divide-y divide-stone-100">
          {#each listings as listing}
            <div class="flex items-center justify-between py-3">
              <div>
                <p class="text-sm font-medium text-stone-800">
                  {listing.quantity_liters}L @ Rp {Number(listing.price_per_liter).toLocaleString(
                    'id-ID'
                  )}/L
                </p>
                <p class="text-xs text-stone-500">
                  {listing.city || listing.pickup_address?.slice(0, 30)}
                  •
                  {new Date(listing.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>

              <span class={statusBadge(listing.status)}>
                {statusLabel(listing.status)}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="card">
      <h2 class="mb-4 font-semibold text-stone-800">Riwayat Pesanan ({orders.length})</h2>

      {#if orders.length === 0}
        <p class="text-sm text-stone-400">Belum ada pesanan.</p>
      {:else}
        <div class="divide-y divide-stone-100">
          {#each orders as order}
            <div class="py-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-stone-800">
                    Pesanan #{order.id.slice(0, 8)} — {order.requested_liters}L
                  </p>

                  <p class="text-xs text-stone-500">
                    {new Date(order.created_at).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {#if order.pickup_date}
                      • Jemput: {new Date(order.pickup_date).toLocaleDateString('id-ID')}
                    {/if}
                  </p>

                  {#if order.oil_listings}
                    <p class="mt-1 text-xs text-stone-500">
                      Total estimasi:
                      {formatRupiah(
                        Number(order.requested_liters || 0) *
                          Number(order.oil_listings.price_per_liter || 0)
                      )}
                    </p>
                  {/if}
                </div>

                <span class={statusBadge(order.status)}>
                  {statusLabel(order.status)}
                </span>
              </div>

              {#if order.status !== 'cancelled'}
                <div class="mt-4 rounded-2xl bg-stone-50 p-4">
                  <div class="grid grid-cols-4 gap-2">
                    {#each trackingSteps as step, index}
                      <div class="text-center">
                        <div
                          class={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            index <= stepIndex(order.status)
                              ? 'bg-jelantah-600 text-white'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {index + 1}
                        </div>

                        <p
                          class={`text-[11px] ${
                            index <= stepIndex(order.status)
                              ? 'font-semibold text-jelantah-700'
                              : 'text-stone-400'
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    {/each}
                  </div>
                </div>
              {:else}
                <div class="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  Pickup ini telah dibatalkan.
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if showRewardModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-jelantah-600">Reward Jelantahin</p>
          <h2 class="text-xl font-bold text-stone-800">Tukar Poin Reward</h2>
          <p class="mt-1 text-sm text-stone-500">
            Kamu memiliki
            <span class="font-semibold text-yellow-600">{rewardPoints} poin</span>.
          </p>
        </div>

        <button
          type="button"
          onclick={closeRewardModal}
          class="rounded-lg px-3 py-1 text-sm text-stone-500 hover:bg-stone-100"
        >
          ✕
        </button>
      </div>

      {#if rewardMessage}
        <div
          class={`mb-4 rounded-lg p-3 text-sm ${
            rewardMessage.includes('berhasil')
              ? 'bg-green-50 text-green-700'
              : 'bg-yellow-50 text-yellow-700'
          }`}
        >
          {rewardMessage}
        </div>
      {/if}

      <div class="grid gap-3">
        {#each rewardOptions as reward}
          <div class="rounded-xl border border-stone-200 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-semibold text-stone-800">{reward.title}</h3>

                  {#if reward.type === 'certificate'}
                    <span
                      class="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700"
                    >
                      Sertifikat
                    </span>
                  {:else}
                    <span
                      class="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-700"
                    >
                      Voucher
                    </span>
                  {/if}
                </div>

                <p class="mt-1 text-sm text-stone-500">{reward.description}</p>
                <p class="mt-2 text-xs font-semibold text-stone-600">
                  Butuh {reward.points} poin
                </p>
              </div>

              <button
                type="button"
                onclick={() => redeemReward(reward)}
                class={`rounded-lg px-4 py-2 text-xs font-semibold ${
                  rewardPoints >= reward.points
                    ? 'bg-jelantah-600 text-white hover:bg-jelantah-700'
                    : 'bg-stone-100 text-stone-400'
                }`}
              >
                {rewardPoints >= reward.points ? 'Tukar' : 'Poin Kurang'}
              </button>
            </div>
          </div>
        {/each}
      </div>

      <div class="mt-5 rounded-xl bg-green-50 p-4 text-sm text-stone-600">
        <p class="font-semibold text-jelantah-700">Catatan Prototype</p>
        <p class="mt-1">
          Pada versi prototype, penukaran reward belum disimpan ke database. Fitur ini
          dibuat untuk menunjukkan alur bahwa poin dari penyaluran minyak jelantah dapat
          ditukar menjadi voucher atau sertifikat kontribusi lingkungan.
        </p>
      </div>
    </div>
  </div>
{/if}