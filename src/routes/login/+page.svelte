<script>
  import { supabase } from '$lib/supabaseClient.js';
  import { DEV_BYPASS_EMAIL } from '$lib/supabaseClient.js';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleLogin(e) {
    e.preventDefault();
    error = '';
    loading = true;

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    loading = false;

    if (err) {
      error = err.message === 'Invalid login credentials'
        ? 'Email atau password salah.'
        : err.message;
      return;
    }

    goto('/dashboard');
  }
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
  <div class="w-full max-w-narrow px-4 animate-slide-up">
    <!-- Brand header -->
    <div class="text-center mb-8">
      <svg class="mx-auto w-12 h-12 text-gold-500 mb-4" viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <path d="M40 14C50 24 56 34 56 44C56 54 48 60 40 60C32 60 24 54 24 44C24 34 30 24 40 14Z" fill="currentColor"/>
        <ellipse cx="34" cy="44" rx="8" ry="12" fill="white" opacity="0.12" transform="rotate(-20 34 44)"/>
      </svg>
      <h1 class="font-display text-2xl font-bold text-earth-900">Masuk</h1>
      <p class="text-sm text-earth-600 mt-1">Masuk ke akun UMKM atau Perusahaan Anda</p>
    </div>

    {#if DEV_BYPASS_EMAIL}
      <div class="alert-warning mb-5">
        <svg class="icon w-4 h-4 mt-0.5 shrink-0"><use href="/icons.svg#info"/></svg>
        <span>Dev mode: email OTP bypass aktif. Akun baru langsung bisa login tanpa verifikasi email.</span>
      </div>
    {/if}

    {#if error}
      <div class="alert-error mb-5">
        <svg class="icon w-4 h-4 mt-0.5 shrink-0"><use href="/icons.svg#alert-circle"/></svg>
        <span>{error}</span>
      </div>
    {/if}

    <div class="card p-6 sm:p-8">
      <form onsubmit={handleLogin}>
        <label for="email" class="input-label">Email</label>
        <input
          id="email"
          type="email"
          class="input mb-5"
          bind:value={email}
          placeholder="contoh@email.com"
          required
          autocomplete="email"
        />

        <label for="password" class="input-label">Password</label>
        <input
          id="password"
          type="password"
          class="input mb-6"
          bind:value={password}
          placeholder="••••••••"
          required
          autocomplete="current-password"
        />

        <button type="submit" class="btn-primary w-full btn-md" disabled={loading}>
          {#if loading}
            <svg class="icon w-4 h-4 icon-spin"><use href="/icons.svg#loader"/></svg>
            Memproses...
          {:else}
            Masuk
          {/if}
        </button>
      </form>
    </div>

    <p class="mt-6 text-center text-sm text-earth-600">
      Belum punya akun?
      <a href="/register" class="font-semibold text-gold-600 hover:text-gold-700 transition-colors">Daftar di sini</a>
    </p>
  </div>
</div>
