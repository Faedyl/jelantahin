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
  let successMessage = $state('');

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

    // Build common metadata — these get stored in raw_user_meta_data
    // so the DB trigger handle_new_user() can save them to profiles
    const metadata = {
      role,
      full_name: fullName,
      phone,
      address,
      umkm_name: umkmName || '',
      company_name: companyName || '',
    };

    if (DEV_BYPASS_EMAIL) {
      const res = await fetch('/api/dev-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...metadata })
      });
      const result = await res.json();

      if (result.error) {
        error = result.error;
        loading = false;
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      loading = false;

      if (signInErr) {
        error = 'Akun dibuat, tapi gagal login otomatis: ' + signInErr.message;
        return;
      }

      goto('/dashboard');
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
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

      successMessage = 'Akun berhasil dibuat! Cek email Anda untuk verifikasi.';
      setTimeout(() => goto('/login'), 3000);
    }
  }
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-start justify-center py-12">
  <div class="w-full max-w-narrow px-4 animate-slide-up">
    <!-- Brand header -->
    <div class="text-center mb-8">
      <svg class="mx-auto w-12 h-12 text-gold-500 mb-4" viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <path d="M40 14C50 24 56 34 56 44C56 54 48 60 40 60C32 60 24 54 24 44C24 34 30 24 40 14Z" fill="currentColor"/>
        <ellipse cx="34" cy="44" rx="8" ry="12" fill="white" opacity="0.12" transform="rotate(-20 34 44)"/>
      </svg>
      <h1 class="font-display text-2xl font-bold text-earth-900">Daftar</h1>
      <p class="text-sm text-earth-600 mt-1">Pilih peran Anda untuk memulai</p>
    </div>

    {#if DEV_BYPASS_EMAIL}
      <div class="alert-warning mb-5">
        <svg class="icon w-4 h-4 mt-0.5 shrink-0"><use href="/icons.svg#info"/></svg>
        <span>Dev mode: email OTP bypass aktif — langsung login setelah daftar.</span>
      </div>
    {/if}

    {#if error}
      <div class="alert-error mb-5">
        <svg class="icon w-4 h-4 mt-0.5 shrink-0"><use href="/icons.svg#alert-circle"/></svg>
        <span>{error}</span>
      </div>
    {/if}

    {#if successMessage}
      <div class="alert-success mb-5">
        <svg class="icon w-4 h-4 mt-0.5 shrink-0"><use href="/icons.svg#check"/></svg>
        <span>{successMessage}</span>
      </div>
    {/if}

    <div class="card p-6 sm:p-8">
      {#if step === 1}
        <!-- Role Selection -->
        <div class="grid grid-cols-2 gap-3 mb-6">
          <button
            onclick={() => role = 'umkm'}
            class="rounded-lg border-2 p-5 text-center transition-all duration-200 {role === 'umkm' ? 'border-gold-500 bg-gold-100/50 shadow-brand-sm' : 'border-earth-300 bg-white hover:border-earth-400 hover:shadow-brand-sm'}"
          >
            <svg class="icon w-8 h-8 mx-auto mb-2 {role === 'umkm' ? 'text-gold-600' : 'text-earth-500'}"><use href="/icons.svg#shop"/></svg>
            <p class="text-sm font-semibold text-earth-800">UMKM</p>
            <p class="text-xs text-earth-600 mt-0.5">Penjual minyak jelantah</p>
          </button>
          <button
            onclick={() => role = 'perusahaan'}
            class="rounded-lg border-2 p-5 text-center transition-all duration-200 {role === 'perusahaan' ? 'border-herb-500 bg-herb-100/50 shadow-brand-sm' : 'border-earth-300 bg-white hover:border-earth-400 hover:shadow-brand-sm'}"
          >
            <svg class="icon w-8 h-8 mx-auto mb-2 {role === 'perusahaan' ? 'text-herb-600' : 'text-earth-500'}"><use href="/icons.svg#building"/></svg>
            <p class="text-sm font-semibold text-earth-800">Perusahaan</p>
            <p class="text-xs text-earth-600 mt-0.5">Kolektor / pembeli</p>
          </button>
        </div>
        <button onclick={() => step = 2} class="btn-primary w-full btn-md">Lanjutkan</button>
      {/if}

      {#if step === 2}
        <form onsubmit={handleRegister}>
          <label for="fullName" class="input-label">Nama Lengkap</label>
          <input id="fullName" type="text" class="input mb-4" bind:value={fullName} placeholder="Nama Anda" required />

          {#if role === 'umkm'}
            <label for="umkmName" class="input-label">Nama Usaha (UMKM)</label>
            <input id="umkmName" type="text" class="input mb-4" bind:value={umkmName} placeholder="e.g. Warung Bu Ani" />
          {:else}
            <label for="companyName" class="input-label">Nama Perusahaan</label>
            <input id="companyName" type="text" class="input mb-4" bind:value={companyName} placeholder="e.g. PT Energi Hijau" />
          {/if}

          <label for="email" class="input-label">Email</label>
          <input id="email" type="email" class="input mb-4" bind:value={email} placeholder="contoh@email.com" required autocomplete="email" />

          <label for="phone" class="input-label">No. Telepon</label>
          <input id="phone" type="tel" class="input mb-4" bind:value={phone} placeholder="0812-xxxx-xxxx" />

          <label for="address" class="input-label">Alamat</label>
          <textarea id="address" class="textarea mb-4" bind:value={address} placeholder="Alamat lengkap" rows="2"></textarea>

          <label for="password" class="input-label">Password</label>
          <input id="password" type="password" class="input mb-4" bind:value={password} placeholder="Min 6 karakter" required minlength="6" autocomplete="new-password" />

          <label for="confirmPassword" class="input-label">Konfirmasi Password</label>
          <input id="confirmPassword" type="password" class="input mb-6" bind:value={confirmPassword} placeholder="Ulangi password" required autocomplete="new-password" />

          <div class="flex gap-3">
            <button type="button" onclick={() => step = 1} class="btn-secondary flex-1 btn-md">Kembali</button>
            <button type="submit" class="btn-primary flex-1 btn-md" disabled={loading}>
              {#if loading}
                <svg class="icon w-4 h-4 icon-spin"><use href="/icons.svg#loader"/></svg>
                Memproses...
              {:else}
                Daftar
              {/if}
            </button>
          </div>
        </form>

        <p class="mt-5 text-center text-sm text-earth-600">
          Sudah punya akun?
          <a href="/login" class="font-semibold text-gold-600 hover:text-gold-700 transition-colors">Masuk</a>
        </p>
      {/if}
    </div>
  </div>
</div>
