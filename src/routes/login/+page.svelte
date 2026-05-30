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

<div class="mx-auto mt-16 max-w-md px-4">
  <div class="card">
    <div class="text-center mb-6">
      <span class="text-4xl">🫒</span>
      <h1 class="mt-3 text-xl font-bold text-stone-800">Masuk ke Jelantahin</h1>
      <p class="mt-1 text-sm text-stone-500">Masuk ke akun UMKM atau Perusahaan Anda</p>
    </div>

    {#if DEV_BYPASS_EMAIL}
      <div class="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
        ⚡ Dev mode: email OTP bypass aktif. Akun baru langsung bisa login tanpa verifikasi email.
      </div>
    {/if}

    {#if error}
      <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
    {/if}

    <form onsubmit={handleLogin}>
      <label class="block text-sm font-medium text-stone-700 mb-1">Email</label>
      <input type="email" class="input-field mb-4" bind:value={email} placeholder="contoh@email.com" required />

      <label class="block text-sm font-medium text-stone-700 mb-1">Password</label>
      <input type="password" class="input-field mb-6" bind:value={password} placeholder="••••••••" required />

      <button type="submit" class="btn-primary w-full" disabled={loading}>
        {loading ? 'Memproses...' : 'Masuk'}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-stone-500">
      Belum punya akun?
      <a href="/register" class="font-medium text-jelantah-600 hover:text-jelantah-700">Daftar di sini</a>
    </p>
  </div>
</div>