<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { getProfile } from '$lib/supabase.js';
  import { goto, onNavigate } from '$app/navigation';

  let { children } = $props();

  let session = $state(null);
  let userRole = $state(null);
  let loading = $state(true);
  let sidebarOpen = $state(false);

  // View transitions for page navigation
  onNavigate(() => {
    if (document.startViewTransition) {
      return new Promise(resolve => {
        document.startViewTransition(resolve);
      });
    }
  });

  onMount(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      session = s;
      if (s) {
        const { data: profile } = await getProfile(s.user.id);
        userRole = profile?.role || null;
      }
      loading = false;
    });

    supabase.auth.onAuthStateChange(async (_event, s) => {
      session = s;
      if (s) {
        const { data: profile } = await getProfile(s.user.id);
        userRole = profile?.role || null;
      } else {
        userRole = null;
      }
    });
  });

  function closeSidebar() {
    sidebarOpen = false;
  }
</script>

<!-- Hidden SVG icon sprite (available globally) -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <use href="/icons.svg#olive-drop" />
  <use href="/icons.svg#shop" />
  <use href="/icons.svg#building" />
  <use href="/icons.svg#credit-card" />
  <use href="/icons.svg#award" />
  <use href="/icons.svg#clock-rotate" />
  <use href="/icons.svg#map-pin" />
  <use href="/icons.svg#package" />
  <use href="/icons.svg#message-circle" />
  <use href="/icons.svg#log-out" />
  <use href="/icons.svg#search" />
  <use href="/icons.svg#user" />
  <use href="/icons.svg#bank" />
  <use href="/icons.svg#trending-up" />
  <use href="/icons.svg#arrow-right" />
  <use href="/icons.svg#chevron-down" />
  <use href="/icons.svg#x" />
  <use href="/icons.svg#check" />
  <use href="/icons.svg#alert-circle" />
  <use href="/icons.svg#menu" />
  <use href="/icons.svg#info" />
  <use href="/icons.svg#loader" />
</svg>

{#if loading}
  <div class="flex min-h-screen items-center justify-center bg-earth-200">
    <div class="flex flex-col items-center gap-3">
      <svg class="icon w-10 h-10 text-gold-500 icon-spin" aria-hidden="true">
        <use href="/icons.svg#loader"/>
      </svg>
      <p class="text-sm text-earth-600 font-body">Memuat...</p>
    </div>
  </div>
{:else}
  <!-- ═══ Navigation ═══ -->
  <nav class="sticky top-0 z-30 border-b border-earth-300/60 bg-white/90 backdrop-blur-md">
    <div class="page-container flex h-16 items-center justify-between">
      <!-- Left: Logo -->
      <a href="/" class="flex items-center gap-2.5 group">
        <svg class="w-8 h-8 text-gold-500" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 4C21 8 24 14 24 19C24 24 20 28 16 28C12 28 8 24 8 19C8 14 11 8 16 4Z" fill="currentColor"/>
          <ellipse cx="13" cy="18" rx="4" ry="6" fill="white" opacity="0.12" transform="rotate(-20 13 18)"/>
        </svg>
        <span class="font-display text-lg font-bold text-earth-900 group-hover:text-gold-600 transition-colors">
          Jelantahin
        </span>
      </a>

      <!-- Center: Desktop nav -->
      <div class="hidden md:flex items-center gap-1">
        {#if session}
          <a href="/dashboard" class="nav-link">
            <svg class="icon w-4 h-4"><use href="/icons.svg#trending-up"/></svg>
            Beranda
          </a>
          {#if userRole === 'perusahaan'}
          <a href="/dashboard/payment" class="nav-link">
            <svg class="icon w-4 h-4"><use href="/icons.svg#credit-card"/></svg>
            Bayar
          </a>
          {/if}
        {:else}
          <a href="/" class="nav-link">Beranda</a>
        {/if}
      </div>

      <!-- Right: Auth buttons -->
      <div class="flex items-center gap-3">
        {#if session}
          <a href="/logout" class="btn-ghost btn-sm hidden sm:inline-flex">
            <svg class="icon w-4 h-4"><use href="/icons.svg#log-out"/></svg>
            Keluar
          </a>
        {:else}
          <a href="/login" class="btn-ghost btn-sm hidden sm:inline-flex">Masuk</a>
          <a href="/register" class="btn-primary btn-sm">Daftar</a>
        {/if}

        <!-- Mobile menu trigger -->
        <button
          onclick={() => sidebarOpen = true}
          class="btn-ghost btn-sm md:hidden"
          aria-label="Buka menu"
        >
          <svg class="icon w-5 h-5"><use href="/icons.svg#menu"/></svg>
        </button>
      </div>
    </div>
  </nav>

  <!-- ═══ Main Content ═══ -->
  <main class="min-h-[calc(100vh-4rem)] bg-earth-200">
    {@render children()}
  </main>

  <!-- ═══ Footer ═══ -->
  <footer class="border-t border-earth-300/60 bg-white py-8">
    <div class="page-container">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <svg class="w-6 h-6 text-gold-500" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 4C21 8 24 14 24 19C24 24 20 28 16 28C12 28 8 24 8 19C8 14 11 8 16 4Z" fill="currentColor"/>
          </svg>
          <span class="text-sm font-semibold text-earth-700">Jelantahin</span>
        </div>
        <p class="text-xs text-earth-600">
          &copy; 2026 Jelantahin. Mendaur ulang minyak jelantah untuk Indonesia.
        </p>
      </div>
    </div>
  </footer>

  <!-- ═══ Mobile Sidebar Overlay ═══ -->
  {#if sidebarOpen}
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden animate-fade-in"
      onclick={closeSidebar}
      role="presentation"
    ></div>

    <!-- Sidebar panel -->
    <div class="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-brand-xl md:hidden animate-slide-up">
      <div class="flex items-center justify-between p-4 border-b border-earth-300/60">
        <a href="/" class="flex items-center gap-2" onclick={closeSidebar}>
          <svg class="w-7 h-7 text-gold-500" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 4C21 8 24 14 24 19C24 24 20 28 16 28C12 28 8 24 8 19C8 14 11 8 16 4Z" fill="currentColor"/>
          </svg>
          <span class="font-display font-bold text-earth-900">Jelantahin</span>
        </a>
        <button onclick={closeSidebar} class="btn-ghost btn-sm" aria-label="Tutup menu">
          <svg class="icon w-5 h-5"><use href="/icons.svg#x"/></svg>
        </button>
      </div>

      <div class="p-4 space-y-1">
        {#if session}
          <a href="/dashboard" class="nav-link w-full" onclick={closeSidebar}>
            <svg class="icon w-4 h-4"><use href="/icons.svg#trending-up"/></svg>
            Beranda
          </a>
          {#if userRole === 'perusahaan'}
          <a href="/dashboard/payment" class="nav-link w-full" onclick={closeSidebar}>
            <svg class="icon w-4 h-4"><use href="/icons.svg#credit-card"/></svg>
            Pembayaran
          </a>
          {/if}
          <hr class="divider my-3" />
          <a href="/logout" class="nav-link w-full text-danger" onclick={closeSidebar}>
            <svg class="icon w-4 h-4"><use href="/icons.svg#log-out"/></svg>
            Keluar
          </a>
        {:else}
          <a href="/login" class="nav-link w-full" onclick={closeSidebar}>Masuk</a>
          <a href="/register" class="btn-primary btn-sm w-full mt-3" onclick={closeSidebar}>Daftar</a>
        {/if}
      </div>
    </div>
  {/if}
{/if}
