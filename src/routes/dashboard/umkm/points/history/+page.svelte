<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getPointEarnings, getRedemptionRequests, getPointsBalance } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let points = $state(null);
  let earnings = $state([]);
  let redemptions = $state([]);
  let loading = $state(true);
  let tab = $state('earnings');

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'umkm') {
      return goto('/dashboard');
    }
    profile = userProfile.data;

    const [pointsRes, earningsRes, redemptionsRes] = await Promise.all([
      getPointsBalance(session.user.id),
      getPointEarnings(session.user.id),
      getRedemptionRequests(session.user.id),
    ]);

    points = pointsRes.data;
    earnings = earningsRes.data || [];
    redemptions = redemptionsRes.data || [];
    loading = false;
  });

  function statusBadge(s) {
    const map = { 'pending':'badge-warning','approved':'badge-info','rejected':'badge-danger','fulfilled':'badge-success','cancelled':'badge-default' };
    return map[s] || 'badge-default';
  }
</script>

<div class="page-container py-8">
  <!-- Header -->
  <div class="page-header flex flex-wrap items-center justify-between gap-4">
    <div>
      <a href="/dashboard/umkm/points" class="text-sm text-gold-600 hover:text-gold-700 mb-1 inline-block">← Kembali ke Poin</a>
      <h1 class="page-title">Riwayat Poin</h1>
    </div>
    {#if points}
      <div class="text-right">
        <p class="text-xs text-earth-600">Saldo Poin</p>
        <p class="text-xl font-bold text-gold-600">{points.balance?.toLocaleString('id-ID') || 0}</p>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center">
      <p class="text-sm text-earth-600">Memuat...</p>
    </div>
  {:else}
    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-earth-200 rounded-lg p-1">
      <button
        onclick={() => tab = 'earnings'}
        class="flex-1 rounded-lg py-2 text-sm font-medium transition {tab === 'earnings' ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-600 hover:text-earth-800'}"
      >
        Poin Masuk
      </button>
      <button
        onclick={() => tab = 'redemptions'}
        class="flex-1 rounded-lg py-2 text-sm font-medium transition {tab === 'redemptions' ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-600 hover:text-earth-800'}"
      >
        Penukaran
      </button>
    </div>

    {#if tab === 'earnings'}
      <div class="card p-5">
        <h2 class="font-semibold text-earth-900 mb-4">Riwayat Perolehan Poin</h2>
        {#if earnings.length === 0}
          <p class="text-sm text-earth-600 text-center py-8">Belum ada poin yang diperoleh. Mulai dengan menjual minyak jelantah!</p>
        {:else}
          <div class="space-y-3">
            {#each earnings as entry}
              <div class="flex items-center justify-between border-b border-earth-200/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p class="text-sm font-medium text-earth-900">
                    {#if entry.source === 'transaction'}
                      <svg class="icon w-4 h-4 text-herb-500 shrink-0"><use href="/icons.svg#check"/></svg>
                      Dari transaksi
                    {:else if entry.source === 'bonus'}
                      <svg class="icon w-4 h-4 text-gold-500 shrink-0"><use href="/icons.svg#award"/></svg>
                      Poin bonus
                    {:else if entry.source === 'referral'}
                      <svg class="icon w-4 h-4 text-blue-700 shrink-0"><use href="/icons.svg#user"/></svg>
                      Poin referal
                    {:else}
                      <svg class="icon w-4 h-4 text-earth-500 shrink-0"><use href="/icons.svg#info"/></svg>
                      {entry.source}
                    {/if}
                  </p>
                  {#if entry.description}
                    <p class="text-xs text-earth-600">{entry.description}</p>
                  {/if}
                  <p class="text-xs text-earth-600 mt-0.5">
                    {new Date(entry.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                </div>
                <span class="font-semibold text-herb-600">+{entry.points.toLocaleString('id-ID')}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if tab === 'redemptions'}
      <div class="card p-5">
        <h2 class="font-semibold text-earth-900 mb-4">Riwayat Penukaran Poin</h2>
        {#if redemptions.length === 0}
          <p class="text-sm text-earth-600 text-center py-8">Belum ada penukaran poin.</p>
        {:else}
          <div class="space-y-3">
            {#each redemptions as redemption}
              <div class="flex items-center justify-between border-b border-earth-200/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p class="text-sm font-medium text-earth-900">
                    <svg class="icon w-4 h-4 text-gold-500 shrink-0"><use href="/icons.svg#award"/></svg>
                    {redemption.redemption_items?.name || 'Hadiah'}
                    {#if redemption.quantity > 1}
                      <span class="text-earth-600">x{redemption.quantity}</span>
                    {/if}
                  </p>
                  <p class="text-xs text-earth-600">
                    {new Date(redemption.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                  {#if redemption.admin_notes}
                    <p class="text-xs text-earth-600 mt-0.5">Catatan: {redemption.admin_notes}</p>
                  {/if}
                </div>
                <div class="text-right">
                  <span class="font-semibold text-red-500">-{redemption.points_used.toLocaleString('id-ID')}</span>
                  <br>
                  <span class="{statusBadge(redemption.status)} text-xs mt-1 inline-block">{redemption.status}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
