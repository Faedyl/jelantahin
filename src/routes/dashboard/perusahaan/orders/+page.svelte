<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile, getOrdersAsPerusahaan, updateOrder, createTransaction } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let orders = $state([]);
  let loading = $state(true);
  let actionLoading = $state(false);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const userProfile = await getProfile(session.user.id);
    if (!userProfile.data || userProfile.data.role !== 'perusahaan') return goto('/dashboard');
    profile = userProfile.data;

    const res = await getOrdersAsPerusahaan(session.user.id);
    orders = res.data || [];
    loading = false;
  });

  async function updateOrderStatus(orderId, newStatus) {
    actionLoading = true;
    await updateOrder(orderId, { status: newStatus });

    if (newStatus === 'completed') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        await createTransaction({
          order_id: orderId,
          actual_liters: parseFloat(order.requested_liters),
          total_price: parseFloat(order.requested_liters) * parseFloat(order.oil_listings?.price_per_liter || 0),
          payment_method: null
        });
      }
    }

    orders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    actionLoading = false;
  }

  function statusBadge(s) {
    const map = { 'pending':'badge-yellow','confirmed':'badge-blue','picked_up':'badge-green','completed':'badge-green','cancelled':'badge-red' };
    return map[s] || 'badge-stone';
  }

  function nextActions(status) {
    if (status === 'pending') return [{ label: 'Konfirmasi', status: 'confirmed', cls: 'btn-primary' }];
    if (status === 'confirmed') return [{ label: 'Sudah Dijemput', status: 'picked_up', cls: 'btn-primary' }];
    if (status === 'picked_up') return [{ label: 'Selesaikan', status: 'completed', cls: 'btn-primary' }, { label: 'Batalkan', status: 'cancelled', cls: 'btn-danger' }];
    return [];
  }
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <a href="/dashboard/perusahaan" class="text-sm text-jelantah-600 hover:text-jelantah-700 mb-4 inline-block">← Kembali ke Dashboard</a>
  <h1 class="text-xl font-bold text-stone-800 mb-6">Pesanan Saya</h1>

  {#if loading}
    <p class="text-stone-400 text-sm">Memuat...</p>
  {:else if orders.length === 0}
    <div class="card text-center py-12">
      <p class="text-stone-400">Belum ada pesanan.</p>
      <a href="/dashboard/perusahaan/browse" class="text-sm text-jelantah-600 hover:text-jelantah-700 mt-2 inline-block">Cari listing minyak →</a>
    </div>
  {:else}
    <div class="space-y-4">
      {#each orders as order}
        <div class="card">
          <div class="flex items-start justify-between mb-3">
            <div>
              <p class="font-semibold text-stone-800">
                {order.requested_liters}L — {order.oil_listings?.city || 'Alamat UMKM'}
              </p>
              <p class="text-xs text-stone-500">
                #{order.id.slice(0,8)} • Dibuat {new Date(order.created_at).toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
              </p>
              {#if order.pickup_date}
                <p class="text-xs text-stone-500">Jadwal jemput: {new Date(order.pickup_date).toLocaleDateString('id-ID')}</p>
              {/if}
              {#if order.notes}
                <p class="text-xs text-stone-500 mt-1">Catatan: {order.notes}</p>
              {/if}
            </div>
            <span class="{statusBadge(order.status)}">{order.status}</span>
          </div>

          {#if order.oil_listings}
            <div class="rounded-lg bg-stone-50 p-3 text-xs text-stone-600 mb-3">
              <p>📍 {order.oil_listings.pickup_address}</p>
              <p>💰 Rp {Number(order.oil_listings.price_per_liter).toLocaleString('id-ID')}/L — Total estimasi: Rp {(parseFloat(order.requested_liters) * parseFloat(order.oil_listings.price_per_liter)).toLocaleString('id-ID')}</p>
            </div>
          {/if}

          <div class="flex gap-2">
            {#each nextActions(order.status) as action}
              <button onclick={() => updateOrderStatus(order.id, action.status)} class={action.cls + ' text-xs py-1.5 px-3'} disabled={actionLoading}>
                {action.label}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>