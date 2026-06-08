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
    const map = { 'pending':'badge-yellow','approved':'badge-blue','rejected':'badge-red','fulfilled':'badge-green','cancelled':'badge-stone' };
    return map[s] || 'badge-stone';
  }
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div>
      <a href="/dashboard/umkm/points" class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-1 inline-block">← Kembali ke Poin</a>
      <h1 class="text-2xl font-bold text-stone-800">Riwayat Poin</h1>
    </div>
    {#if points}
      <div class="text-right">
        <p class="text-xs text-stone-500">Saldo Poin</p>
        <p class="text-xl font-bold text-jelantah-600">{points.balance?.toLocaleString('id-ID') || 0}</p>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="flex min-h-[30vh] items-center justify-center">
      <p class="text-sm text-stone-400">Memuat...</p>
    </div>
  {:else}
    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1">
      <button
        onclick={() => tab = 'earnings'}
        class="flex-1 rounded-lg py-2 text-sm font-medium transition {tab === 'earnings' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}"
      >
        Poin Masuk
      </button>
      <button
        onclick={() => tab = 'redemptions'}
        class="flex-1 rounded-lg py-2 text-sm font-medium transition {tab === 'redemptions' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}"
      >
        Penukaran
      </button>
    </div>

    {#if tab === 'earnings'}
      <div class="card">
        <h2 class="font-semibold text-stone-800 mb-4">Riwayat Perolehan Poin</h2>
        {#if earnings.length === 0}
          <p class="text-sm text-stone-400 text-center py-8">Belum ada poin yang diperoleh. Mulai dengan menjual minyak jelantah!</p>
        {:else}
          <div class="space-y-3">
            {#each earnings as entry}
              <div class="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p class="text-sm font-medium text-stone-800">
                    {#if entry.source === 'transaction'}
                      ✅ Dari transaksi
                    {:else if entry.source === 'bonus'}
                      🎁 Poin bonus
                    {:else if entry.source === 'referral'}
                      👥 Poin referal
                    {:else}
                      📝 {entry.source}
                    {/if}
                  </p>
                  {#if entry.description}
                    <p class="text-xs text-stone-500">{entry.description}</p>
                  {/if}
                  <p class="text-xs text-stone-400 mt-0.5">
                    {new Date(entry.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                </div>
                <span class="font-semibold text-green-600">+{entry.points.toLocaleString('id-ID')}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if tab === 'redemptions'}
      <div class="card">
        <h2 class="font-semibold text-stone-800 mb-4">Riwayat Penukaran Poin</h2>
        {#if redemptions.length === 0}
          <p class="text-sm text-stone-400 text-center py-8">Belum ada penukaran poin.</p>
        {:else}
          <div class="space-y-3">
            {#each redemptions as redemption}
              <div class="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p class="text-sm font-medium text-stone-800">
                    🎁 {redemption.redemption_items?.name || 'Hadiah'}
                    {#if redemption.quantity > 1}
                      <span class="text-stone-500">x{redemption.quantity}</span>
                    {/if}
                  </p>
                  <p class="text-xs text-stone-500">
                    {new Date(redemption.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                  {#if redemption.admin_notes}
                    <p class="text-xs text-stone-400 mt-0.5">Catatan: {redemption.admin_notes}</p>
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