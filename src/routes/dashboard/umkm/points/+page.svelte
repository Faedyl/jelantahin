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

<div class="page-container py-8">
  <!-- Header -->
  <div class="page-header flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="page-title flex items-center gap-2">
        <svg class="icon w-6 h-6 text-gold-500"><use href="/icons.svg#award"/></svg>
        Poin Saya
      </h1>
      <p class="page-subtitle">Tukarkan poin kupon Anda dengan berbagai hadiah</p>
    </div>
    <a href="/dashboard/umkm/points/history" class="btn-secondary btn-sm">Riwayat Poin</a>
  </div>

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center">
      <div class="skeleton-card w-full max-w-md">
        <div class="skeleton-text"></div>
        <div class="skeleton-text w-1/2"></div>
      </div>
    </div>
  {:else}
    <!-- Points Balance Card -->
    <div class="rounded-xl bg-gradient-to-br from-gold-500 to-gold-700 p-8 text-white shadow-brand-lg mb-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-gold-100 text-sm font-medium uppercase tracking-wide">Total Poin Anda</p>
          <p class="text-5xl font-bold font-display mt-2">{points?.balance?.toLocaleString('id-ID') || 0}</p>
          <p class="text-gold-100 text-sm mt-1">
            Poin diperoleh: {points?.lifetime_earned?.toLocaleString('id-ID') || 0}
          </p>
        </div>
        <div class="rounded-full bg-white/20 px-4 py-2 text-sm flex items-center gap-1">
          <svg class="icon w-4 h-4"><use href="/icons.svg#award"/></svg>
          Tukarkan sekarang
        </div>
      </div>
    </div>

    <!-- How it works -->
    <!-- Redemption Catalog -->
    <h2 class="text-xl font-bold font-display text-earth-900 mb-4 flex items-center gap-2">
      <svg class="icon w-5 h-5 text-gold-500"><use href="/icons.svg#package"/></svg>
      Katalog Hadiah
    </h2>

    {#if items.length === 0}
      <div class="empty-state">
        <svg class="empty-state-icon"><use href="/icons.svg#package"/></svg>
        <p class="empty-state-title">Belum ada hadiah tersedia saat ini</p>
        <p class="empty-state-desc">Nantikan update katalog hadiah dari kami.</p>
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {#each items as item}
          <div class="card-hover flex flex-col p-5">
            <div class="flex items-center justify-center h-32 bg-earth-200 rounded-lg mb-4">
              <svg class="icon w-12 h-12 text-earth-500"><use href="/icons.svg#package"/></svg>
            </div>
            <h3 class="font-semibold text-earth-800">{item.name}</h3>
            {#if item.description}
              <p class="text-xs text-earth-600 mt-1 mb-3 flex-1">{item.description}</p>
            {:else}
              <div class="flex-1"></div>
            {/if}
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-earth-300/50">
              <span class="text-sm font-bold text-gold-600">
                {item.points_required.toLocaleString('id-ID')} poin
              </span>
              <button
                onclick={() => openRedeem(item)}
                class="btn-primary btn-sm"
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
    <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-brand-xl animate-scale-in" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold font-display text-earth-900">Tukar Poin</h2>
        <button onclick={() => showRedeemModal = false} class="btn-ghost btn-sm">
          <svg class="icon w-4 h-4"><use href="/icons.svg#x"/></svg>
        </button>
      </div>

      <div class="text-center mb-4">
        <svg class="icon w-12 h-12 mx-auto text-earth-500"><use href="/icons.svg#package"/></svg>
        <p class="font-semibold text-earth-800 mt-2">{selectedItem.name}</p>
        {#if selectedItem.description}
          <p class="text-sm text-earth-600">{selectedItem.description}</p>
        {/if}
      </div>

      <div class="card-flat p-4 mb-4">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-earth-600">Harga per item</span>
          <span class="font-semibold">{selectedItem.points_required.toLocaleString('id-ID')} poin</span>
        </div>
        <div class="flex justify-between text-sm mb-2">
          <span class="text-earth-600">Jumlah</span>
          <div class="flex items-center gap-2">
            <button onclick={() => redeemQty = Math.max(1, redeemQty - 1)} class="btn-ghost btn-sm w-7 h-7 p-0 flex items-center justify-center rounded-full bg-earth-200 hover:bg-earth-300 font-bold">-</button>
            <span class="font-semibold w-6 text-center">{redeemQty}</span>
            <button onclick={() => redeemQty = Math.min(10, redeemQty + 1)} class="btn-ghost btn-sm w-7 h-7 p-0 flex items-center justify-center rounded-full bg-earth-200 hover:bg-earth-300 font-bold">+</button>
          </div>
        </div>
        <div class="flex justify-between text-sm font-bold pt-2 border-t border-earth-300/50">
          <span>Total</span>
          <span class="text-gold-600">{(selectedItem.points_required * redeemQty).toLocaleString('id-ID')} poin</span>
        </div>
      </div>

      <div class="alert-warning mb-4">
        <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
        <div>
          <span>Saldo Anda: <strong>{points?.balance?.toLocaleString('id-ID') || 0} poin</strong></span>
          {#if (selectedItem.points_required * redeemQty) > (points?.balance || 0)}
            <span class="block mt-1 text-red-700">Saldo tidak mencukupi!</span>
          {/if}
        </div>
      </div>

      {#if redeemError}
        <div class="alert-error mb-3">
          <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
          <span>{redeemError}</span>
        </div>
      {/if}
      {#if redeemSuccess}
        <div class="alert-success mb-3">
          <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#check"/></svg>
          <span>{redeemSuccess}</span>
        </div>
      {/if}

      <div class="flex gap-3">
        <button onclick={() => showRedeemModal = false} class="btn-secondary btn-md flex-1">Batal</button>
        <button
          onclick={handleRedeem}
          class="btn-primary btn-md flex-1"
          disabled={redeeming || (selectedItem.points_required * redeemQty) > (points?.balance || 0)}
        >
          {redeeming ? 'Memproses...' : 'Tukar Sekarang'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.bg-gradient-to-br.from-gold-500.to-gold-700) {
    background-image: linear-gradient(135deg, #D4A40D, #AD8B0C, #8A6F0A);
  }
</style>
