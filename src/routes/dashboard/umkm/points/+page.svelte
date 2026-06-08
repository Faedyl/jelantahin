<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getPointsBalance, ensurePointsAccount, getRedemptionItems, createRedemptionRequest } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let points = $state(null);
  let items = $state([]);
  let loading = $state(true);
  let redeeming = $state(false);
  let redeemSuccess = $state('');
  let redeemError = $state('');

  // Redemption form
  let selectedItemId = $state('');
  let redeemQty = $state(1);
  let showRedeemModal = $state(false);
  let selectedItem = $state(null);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'umkm') {
      return goto('/dashboard');
    }
    profile = userProfile.data;

    // Ensure points account exists (for users registered before migration)
    await ensurePointsAccount(session.user.id);

    const [pointsRes, itemsRes] = await Promise.all([
      getPointsBalance(session.user.id),
      getRedemptionItems()
    ]);

    points = pointsRes.data || { balance: 0, lifetime_earned: 0 };
    items = itemsRes.data || [];
    loading = false;
  });

  function openRedeem(item) {
    selectedItem = item;
    selectedItemId = item.id;
    redeemQty = 1;
    redeemError = '';
    redeemSuccess = '';
    showRedeemModal = true;
  }

  async function handleRedeem() {
    redeeming = true;
    redeemError = '';
    redeemSuccess = '';

    if (!selectedItem) {
      redeemError = 'Pilih item terlebih dahulu.';
      redeeming = false;
      return;
    }

    const totalPoints = selectedItem.points_required * redeemQty;
    if (totalPoints > points.balance) {
      redeemError = `Poin tidak cukup. Butuh ${totalPoints.toLocaleString('id-ID')}, saldo ${points.balance.toLocaleString('id-ID')}.`;
      redeeming = false;
      return;
    }

    if (redeemQty < 1 || redeemQty > 10) {
      redeemError = 'Jumlah penukaran 1-10.';
      redeeming = false;
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await createRedemptionRequest({
      userId: session.user.id,
      itemId: selectedItem.id,
      pointsUsed: totalPoints,
      quantity: redeemQty,
    });

    redeeming = false;

    if (error) {
      redeemError = 'Gagal menukar poin: ' + error.message;
      return;
    }

    // Refresh balance
    const pointsRes = await getPointsBalance(session.user.id);
    points = pointsRes.data || { balance: 0, lifetime_earned: 0 };

    redeemSuccess = `Berhasil! ${redeemQty}x ${selectedItem.name} akan diproses.`;
    setTimeout(() => { showRedeemModal = false; redeemSuccess = ''; }, 2000);
  }
</script>

<div class="mx-auto max-w-5xl px-4 py-8">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
    <div>
      <h1 class="text-2xl font-bold text-stone-800">🏆 Poin Saya</h1>
      <p class="text-sm text-stone-500">Tukarkan poin kupon Anda dengan berbagai hadiah</p>
    </div>
    <a href="/dashboard/umkm/points/history" class="btn-secondary text-xs px-3 py-1.5">Riwayat Poin</a>
  </div>

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center">
      <p class="text-sm text-stone-400">Memuat...</p>
    </div>
  {:else}
    <!-- Points Balance Card -->
    <div class="bg-gradient-to-br from-jelantah-500 to-jelantah-700 rounded-2xl p-8 text-white shadow-lg mb-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-jelantah-100 text-sm font-medium uppercase tracking-wide">Total Poin Anda</p>
          <p class="text-5xl font-bold mt-2">{points?.balance?.toLocaleString('id-ID') || 0}</p>
          <p class="text-jelantah-100 text-sm mt-1">
            Poin diperoleh: {points?.lifetime_earned?.toLocaleString('id-ID') || 0}
          </p>
        </div>
        <div class="rounded-full bg-white/20 px-4 py-2 text-sm">
          🎯 Tukarkan sekarang
        </div>
      </div>
    </div>

    <!-- How it works -->
    <div class="card mb-8">
      <h2 class="font-semibold text-stone-800 mb-3">Cara Kerja Kupon Poin</h2>
      <div class="grid gap-4 sm:grid-cols-3 text-sm">
        <div class="flex items-start gap-3">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-jelantah-100 text-jelantah-600 font-bold">1</span>
          <p class="text-stone-600">Jual minyak jelantah Anda dan dapatkan poin dari setiap transaksi</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-jelantah-100 text-jelantah-600 font-bold">2</span>
          <p class="text-stone-600">Kumpulkan poin dan pilih hadiah yang tersedia di katalog</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-jelantah-100 text-jelantah-600 font-bold">3</span>
          <p class="text-stone-600">Tukarkan poin Anda — hadiah akan dikirim atau bisa diambil</p>
        </div>
      </div>
    </div>

    <!-- Redemption Catalog -->
    <h2 class="text-xl font-bold text-stone-800 mb-4">🎁 Katalog Hadiah</h2>

    {#if items.length === 0}
      <div class="card text-center py-12">
        <p class="text-4xl mb-3">📦</p>
        <p class="text-stone-500">Belum ada hadiah tersedia saat ini.</p>
        <p class="text-stone-400 text-sm mt-1">Nantikan update katalog hadiah dari kami.</p>
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {#each items as item}
          <div class="card flex flex-col hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center h-32 bg-stone-50 rounded-xl mb-4">
              <span class="text-5xl">🎁</span>
            </div>
            <h3 class="font-semibold text-stone-800">{item.name}</h3>
            {#if item.description}
              <p class="text-xs text-stone-500 mt-1 mb-3 flex-1">{item.description}</p>
            {:else}
              <div class="flex-1"></div>
            {/if}
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
              <span class="text-sm font-bold text-jelantah-600">
                {item.points_required.toLocaleString('id-ID')} poin
              </span>
              <button
                onclick={() => openRedeem(item)}
                class="btn-primary text-xs px-3 py-1.5"
                disabled={points?.balance < item.points_required}
              >
                {points?.balance >= item.points_required ? 'Tukar' : 'Kurang Poin'}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Redemption Modal -->
{#if showRedeemModal && selectedItem}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onclick={() => showRedeemModal = false}>
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-stone-800">Tukar Poin</h2>
        <button onclick={() => showRedeemModal = false} class="text-stone-400 hover:text-stone-600 text-xl leading-none">&times;</button>
      </div>

      <div class="text-center mb-4">
        <span class="text-4xl">🎁</span>
        <p class="font-semibold text-stone-800 mt-2">{selectedItem.name}</p>
        {#if selectedItem.description}
          <p class="text-sm text-stone-500">{selectedItem.description}</p>
        {/if}
      </div>

      <div class="bg-stone-50 rounded-xl p-4 mb-4">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-stone-500">Harga per item</span>
          <span class="font-semibold">{selectedItem.points_required.toLocaleString('id-ID')} poin</span>
        </div>
        <div class="flex justify-between text-sm mb-2">
          <span class="text-stone-500">Jumlah</span>
          <div class="flex items-center gap-2">
            <button onclick={() => redeemQty = Math.max(1, redeemQty - 1)} class="w-7 h-7 rounded-full bg-stone-200 text-stone-600 font-bold flex items-center justify-center hover:bg-stone-300">-</button>
            <span class="font-semibold w-6 text-center">{redeemQty}</span>
            <button onclick={() => redeemQty = Math.min(10, redeemQty + 1)} class="w-7 h-7 rounded-full bg-stone-200 text-stone-600 font-bold flex items-center justify-center hover:bg-stone-300">+</button>
          </div>
        </div>
        <div class="flex justify-between text-sm font-bold pt-2 border-t border-stone-200">
          <span>Total</span>
          <span class="text-jelantah-600">{(selectedItem.points_required * redeemQty).toLocaleString('id-ID')} poin</span>
        </div>
      </div>

      <div class="bg-amber-50 rounded-xl p-3 mb-4 text-xs text-amber-700">
        ⚠️ Saldo Anda: <strong>{points?.balance?.toLocaleString('id-ID') || 0} poin</strong>
        {#if (selectedItem.points_required * redeemQty) > (points?.balance || 0)}
          <span class="block mt-1 text-red-600">Saldo tidak mencukupi!</span>
        {/if}
      </div>

      {#if redeemError}
        <div class="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{redeemError}</div>
      {/if}
      {#if redeemSuccess}
        <div class="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{redeemSuccess}</div>
      {/if}

      <div class="flex gap-3">
        <button onclick={() => showRedeemModal = false} class="btn-secondary flex-1">Batal</button>
        <button
          onclick={handleRedeem}
          class="btn-primary flex-1"
          disabled={redeeming || (selectedItem.points_required * redeemQty) > (points?.balance || 0)}
        >
          {redeeming ? 'Memproses...' : 'Tukar Sekarang'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.bg-gradient-to-br) {
    background-image: linear-gradient(135deg, #059669, #047857, #065f46);
  }
</style>