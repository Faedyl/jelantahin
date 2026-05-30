<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let profile = $state(null);
  let loading = $state(true);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    const { data } = await getProfile(session.user.id);
    if (data) profile = data;
    loading = false;
  });
</script>

{#if loading}
  <div class="flex min-h-[40vh] items-center justify-center">
    <p class="text-stone-400 text-sm">Memuat...</p>
  </div>
<!-- Profile not found — show fallback -->
  <div class="mx-auto max-w-md px-4 py-16 text-center">
    <div class="text-5xl mb-4">🫒</div>
    <h2 class="text-xl font-bold text-stone-800 mb-2">Profil belum tersedia</h2>
    <p class="text-sm text-stone-500 mb-6">
      Akun Anda belum memiliki profil. Silakan daftar ulang atau hubungi admin untuk membuat profil.
    </p>
    <a href="/register" class="btn-primary inline-block px-6 py-2">Daftar Sekarang</a>
  </div>
{:else if profile}
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div class="flex items-center gap-4 mb-8">
      <div class="flex h-14 w-14 items-center justify-center rounded-full bg-jelantah-100 text-2xl">
        {profile.role === 'umkm' ? '🏪' : '🏭'}
      </div>
      <div>
        <h1 class="text-2xl font-bold text-stone-800">
          {profile.role === 'umkm' ? profile.umkm_name || profile.full_name : profile.company_name || profile.full_name}
        </h1>
        <p class="text-sm text-stone-500">
          {profile.role === 'umkm' ? 'UMKM — Penjual Minyak Jelantah' : 'Perusahaan — Kolektor Minyak Jelantah'}
        </p>
      </div>
    </div>

    <!-- role-based dashboard redirect -->
    {#if profile.role === 'umkm'}
      <a href="/dashboard/umkm" class="btn-primary w-full justify-center mb-4">Buka Dashboard UMKM</a>
    {:else}
      <a href="/dashboard/perusahaan" class="btn-primary w-full justify-center mb-4">Buka Dashboard Perusahaan</a>
    {/if}

    <div class="card">
      <h2 class="font-semibold text-stone-800 mb-3">Profil Saya</h2>
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between"><dt class="text-stone-500">Nama</dt><dd>{profile.full_name}</dd></div>
        {#if profile.phone}<div class="flex justify-between"><dt class="text-stone-500">Telepon</dt><dd>{profile.phone}</dd></div>{/if}
        {#if profile.address}<div class="flex justify-between"><dt class="text-stone-500">Alamat</dt><dd class="text-right max-w-xs">{profile.address}</dd></div>{/if}
        {#if profile.umkm_name}<div class="flex justify-between"><dt class="text-stone-500">Nama Usaha</dt><dd>{profile.umkm_name}</dd></div>{/if}
        {#if profile.umkm_type}<div class="flex justify-between"><dt class="text-stone-500">Jenis UMKM</dt><dd>{profile.umkm_type}</dd></div>{/if}
        {#if profile.company_name}<div class="flex justify-between"><dt class="text-stone-500">Perusahaan</dt><dd>{profile.company_name}</dd></div>{/if}
        {#if profile.company_nib}<div class="flex justify-between"><dt class="text-stone-500">NIB</dt><dd>{profile.company_nib}</dd></div>{/if}
      </dl>
    </div>
  </div>
{/if}
