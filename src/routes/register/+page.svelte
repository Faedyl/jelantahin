<script>
  import { supabase } from '$lib/supabaseClient.js';
  import { DEV_BYPASS_EMAIL } from '$lib/supabaseClient.js';
  import { goto } from '$app/navigation';

  let step = $state(1);
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let role = $state('umkm');
  let fullName = $state('');
  let umkmName = $state('');
  let companyName = $state('');
  let phone = $state('');
  let address = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleRegister(e) {
    e.preventDefault();
    error = '';

    if (password !== confirmPassword) {
      error = 'Password tidak cocok.';
      return;
    }
    if (password.length < 6) {
      error = 'Password minimal 6 karakter.';
      return;
    }

    loading = true;

    if (DEV_BYPASS_EMAIL) {
      // ── Dev bypass: create user via Admin API (no email) ──
      const res = await fetch('/api/dev-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, fullName })
      });
      const result = await res.json();

      if (result.error) {
        error = result.error;
        loading = false;
        return;
      }

      // User created — now sign in with password
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      loading = false;

      if (signInErr) {
        error = 'Akun dibuat, tapi gagal login otomatis: ' + signInErr.message;
        return;
      }

      goto('/dashboard');
    } else {
      // ── Normal flow: signup triggers email OTP ──
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, full_name: fullName }
        }
      });

      loading = false;

      if (err) {
        error = err.message;
        return;
      }

      if (data?.user?.identities?.length === 0) {
        error = 'Email sudah terdaftar. Silakan login.';
        return;
      }

      // Show success — user must check email
      error = ''; // repurpose error as success display
      // We keep error empty but show a success banner inline
      // (handled by the template below with a success flag)
      showSuccess('Akun berhasil dibuat! Cek email Anda untuk verifikasi.');
    }
  }

  let successMessage = $state('');

  function showSuccess(msg) {
    successMessage = msg;
    setTimeout(() => goto('/login'), 3000);
  }

  // Pre-fill phone + address back into the server-created profile
  // (runs after redirect if needed — kept for future use)
</script>

<div class="mx-auto mt-8 max-w-md px-4 pb-16">
  <div class="card">
    <div class="text-center mb-6">
      <span class="text-4xl">🫒</span>
      <h1 class="mt-3 text-xl font-bold text-stone-800">Daftar Jelantahin</h1>
      <p class="mt-1 text-sm text-stone-500">Pilih peran Anda untuk memulai</p>
    </div>

    {#if DEV_BYPASS_EMAIL}
      <div class="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
        ⚡ Dev mode: email OTP bypass aktif — langsung login setelah daftar.
      </div>
    {/if}

    {#if error}
      <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
    {/if}
    {#if successMessage}
      <div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{successMessage}</div>
    {/if}

    {#if step === 1}
      <div class="grid grid-cols-2 gap-3 mb-6">
        <button onclick={() => role = 'umkm'}
          class="rounded-xl border-2 p-4 text-center transition {role === 'umkm' ? 'border-jelantah-400 bg-jelantah-50' : 'border-stone-200 hover:border-stone-300'}">
          <span class="text-2xl">🏪</span>
          <p class="mt-1 text-sm font-semibold text-stone-800">UMKM</p>
          <p class="text-xs text-stone-500">Penjual minyak jelantah</p>
        </button>
        <button onclick={() => role = 'perusahaan'}
          class="rounded-xl border-2 p-4 text-center transition {role === 'perusahaan' ? 'border-blue-400 bg-blue-50' : 'border-stone-200 hover:border-stone-300'}">
          <span class="text-2xl">🏭</span>
          <p class="mt-1 text-sm font-semibold text-stone-800">Perusahaan</p>
          <p class="text-xs text-stone-500">Kolektor / pembeli</p>
        </button>
      </div>
      <button onclick={() => step = 2} class="btn-primary w-full">Lanjutkan</button>
    {/if}

    {#if step === 2}
      <form onsubmit={handleRegister}>
        <label class="block text-sm font-medium text-stone-700 mb-1">Nama Lengkap</label>
        <input type="text" class="input-field mb-3" bind:value={fullName} placeholder="Nama Anda" required />

        {#if role === 'umkm'}
          <label class="block text-sm font-medium text-stone-700 mb-1">Nama Usaha (UMKM)</label>
          <input type="text" class="input-field mb-3" bind:value={umkmName} placeholder="e.g. Warung Bu Ani" />
        {:else}
          <label class="block text-sm font-medium text-stone-700 mb-1">Nama Perusahaan</label>
          <input type="text" class="input-field mb-3" bind:value={companyName} placeholder="e.g. PT Energi Hijau" />
        {/if}

        <label class="block text-sm font-medium text-stone-700 mb-1">Email</label>
        <input type="email" class="input-field mb-3" bind:value={email} placeholder="contoh@email.com" required />

        <label class="block text-sm font-medium text-stone-700 mb-1">No. Telepon</label>
        <input type="tel" class="input-field mb-3" bind:value={phone} placeholder="0812-xxxx-xxxx" />

        <label class="block text-sm font-medium text-stone-700 mb-1">Alamat</label>
        <textarea class="input-field mb-3" bind:value={address} placeholder="Alamat lengkap" rows="2"></textarea>

        <label class="block text-sm font-medium text-stone-700 mb-1">Password</label>
        <input type="password" class="input-field mb-3" bind:value={password} placeholder="Min 6 karakter" required minlength="6" />

        <label class="block text-sm font-medium text-stone-700 mb-1">Konfirmasi Password</label>
        <input type="password" class="input-field mb-6" bind:value={confirmPassword} placeholder="Ulangi password" required />

        <div class="flex gap-3">
          <button type="button" onclick={() => step = 1} class="btn-secondary flex-1">Kembali</button>
          <button type="submit" class="btn-primary flex-1" disabled={loading}>
            {loading ? 'Memproses...' : 'Daftar'}
          </button>
        </div>
      </form>

      <p class="mt-4 text-center text-sm text-stone-500">
        Sudah punya akun?
        <a href="/login" class="font-medium text-jelantah-600 hover:text-jelantah-700">Masuk</a>
      </p>
    {/if}
  </div>
</div>