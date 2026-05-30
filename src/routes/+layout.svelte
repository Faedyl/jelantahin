<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { goto } from '$app/navigation';

  let { children } = $props();

  let session = $state(null);
  let loading = $state(true);

  onMount(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      session = s;
      loading = false;
    });

    supabase.auth.onAuthStateChange((_event, s) => {
      session = s;
    });
  });
</script>

{#if loading}
  <div class="flex min-h-screen items-center justify-center">
    <p class="text-stone-400 text-sm">Memuat...</p>
  </div>
{:else}
  <nav class="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
    <a href="/" class="flex items-center gap-2 text-lg font-bold text-jelantah-600">
      <span class="text-2xl">🫒</span>
      Jelantahin
    </a>
    <div class="flex items-center gap-4">
      {#if session}
        <a href="/dashboard" class="text-sm font-medium text-stone-600 hover:text-jelantah-600 transition">Dashboard</a>
        <a href="/logout" class="btn-secondary text-xs py-1.5 px-3">Logout</a>
      {:else}
        <a href="/login" class="text-sm font-medium text-stone-600 hover:text-jelantah-600 transition">Masuk</a>
        <a href="/register" class="btn-primary text-xs py-1.5 px-3">Daftar</a>
      {/if}
    </div>
  </nav>
  <main class="min-h-[calc(100vh-60px)]">
    {@render children()}
  </main>
{/if}
