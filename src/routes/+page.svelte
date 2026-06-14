<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { goto } from '$app/navigation';

  let session = $state(null);
  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  });

  function handleStart() {
    goto(session ? '/dashboard' : '/register');
  }
</script>

<!-- ═══ Hero ═══ -->
<section class="relative overflow-hidden bg-gradient-to-b from-earth-100 to-earth-200">
  <!-- Decorative background elements -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <svg class="absolute -top-60 -right-60 w-[300px] sm:w-[500px] lg:w-[600px] text-gold-500/5 animate-float-slow" viewBox="0 0 200 200" fill="currentColor">
      <path d="M100 10C140 50 180 80 180 120C180 160 140 190 100 190C60 190 20 160 20 120C20 80 60 50 100 10Z"/>
    </svg>
    <svg class="absolute -bottom-40 -left-40 w-[200px] sm:w-[300px] lg:w-[400px] text-herb-500/5 animate-float-slower" viewBox="0 0 200 200" fill="currentColor">
      <path d="M100 10C140 50 180 80 180 120C180 160 140 190 100 190C60 190 20 160 20 120C20 80 60 50 100 10Z"/>
    </svg>
    <!-- Floating particle droplets -->
    <svg class="absolute top-1/4 right-1/4 w-3 h-3 sm:w-4 sm:h-4 text-gold-400/20 animate-drift-up" style="animation-delay: 0s; left: 20%;" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 5 10 5 16C5 19.866 8.134 23 12 23C15.866 23 19 19.866 19 16C19 10 12 2 12 2Z"/>
    </svg>
    <svg class="absolute top-1/4 right-1/4 w-2 h-2 sm:w-3 sm:h-3 text-herb-400/20 animate-drift-up" style="animation-delay: 1.5s; left: 50%;" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 5 10 5 16C5 19.866 8.134 23 12 23C15.866 23 19 19.866 19 16C19 10 12 2 12 2Z"/>
    </svg>
    <svg class="absolute top-1/4 right-1/4 w-3 h-3 sm:w-4 sm:h-4 text-gold-400/20 animate-drift-up" style="animation-delay: 3s; left: 35%;" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 5 10 5 16C5 19.866 8.134 23 12 23C15.866 23 19 19.866 19 16C19 10 12 2 12 2Z"/>
    </svg>
    <svg class="absolute top-1/4 right-1/4 w-2 h-2 sm:w-3 sm:h-3 text-herb-400/20 animate-drift-up" style="animation-delay: 4.5s; left: 65%;" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 5 10 5 16C5 19.866 8.134 23 12 23C15.866 23 19 19.866 19 16C19 10 12 2 12 2Z"/>
    </svg>
    <svg class="absolute top-1/4 right-1/4 w-2 h-2 sm:w-3 sm:h-3 text-gold-400/20 animate-drift-up" style="animation-delay: 6s; left: 45%;" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 5 10 5 16C5 19.866 8.134 23 12 23C15.866 23 19 19.866 19 16C19 10 12 2 12 2Z"/>
    </svg>
    <!-- Subtle geometric grid pattern -->
    <div class="absolute inset-0 opacity-[0.015] animate-grid-shift" style="background-image: repeating-linear-gradient(0deg, transparent, transparent 47px, #3A2E20 47px, #3A2E20 48px), repeating-linear-gradient(90deg, transparent, transparent 47px, #3A2E20 47px, #3A2E20 48px);"></div>
  </div>

  <div class="w-full py-16 sm:py-20 lg:py-24">
    <div class="page-container">
      <div class="mx-auto max-w-3xl text-center">
      <!-- Brand icon -->
      <div class="mb-8 flex justify-center">
        <svg class="w-16 h-16 sm:w-20 sm:h-20 text-gold-500 animate-pulse-glow" viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <path d="M40 8C52 18 60 30 60 42C60 54 50 64 40 64C30 64 20 54 20 42C20 30 28 18 40 8Z" fill="currentColor" opacity="0.2"/>
          <path d="M40 14C50 24 56 34 56 44C56 54 48 60 40 60C32 60 24 54 24 44C24 34 30 24 40 14Z" fill="currentColor"/>
          <ellipse cx="34" cy="44" rx="8" ry="12" fill="white" opacity="0.12" transform="rotate(-20 34 44)"/>
        </svg>
      </div>

      <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-earth-900 tracking-tight">
        <span class="block">Daur ulang minyak jelantah</span>
        <span class="block text-gold-500 mt-2 sm:mt-3 lg:mt-5">lebih mudah & menguntungkan</span>
      </h1>

      <p class="mt-8 text-lg sm:text-xl text-earth-700 max-w-2xl mx-auto leading-relaxed">
        Platform yang menghubungkan UMKM penghasil minyak jelantah dengan
        perusahaan kolektor. Transparan, terpercaya, dan efisien dari
        listing hingga pembayaran.
      </p>

      <div class="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button onclick={handleStart} class="btn-primary btn-lg text-base px-10 shadow-brand-md hover:shadow-brand-lg transition-shadow">
          Mulai Sekarang
          <svg class="icon w-5 h-5"><use href="/icons.svg#arrow-right"/></svg>
        </button>
        <a href="#how-it-works" class="btn-secondary btn-lg text-base">
          Pelajari Dulu
        </a>
      </div>
    </div>
  </div>
  </div>
</section>

<!-- ═══ How It Works ═══ -->
<section id="how-it-works" class="section bg-white">
  <div class="page-container">
    <div class="text-center mb-12">
      <h2 class="font-display text-3xl sm:text-4xl font-bold text-earth-900">
        Cara Kerjanya
      </h2>
      <p class="mt-3 text-earth-600 max-w-xl mx-auto">
        Dari dapur UMKM ke tangan kolektor — dalam tiga langkah mudah.
      </p>
    </div>

    <div class="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
      <!-- Step 1 -->
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gold-200/70">
          <svg class="icon w-7 h-7 text-gold-700"><use href="/icons.svg#shop"/></svg>
        </div>
        <h3 class="font-display font-semibold text-lg text-earth-900 mb-2">1. Daftar & Listing</h3>
        <p class="text-sm text-earth-600 leading-relaxed">
          UMKM mendaftar dan membuat listing minyak jelantah yang tersedia untuk diambil.
        </p>
      </div>

      <!-- Step 2 -->
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gold-200/70">
          <svg class="icon w-7 h-7 text-gold-700"><use href="/icons.svg#package"/></svg>
        </div>
        <h3 class="font-display font-semibold text-lg text-earth-900 mb-2">2. Klaim & Pickup</h3>
        <p class="text-sm text-earth-600 leading-relaxed">
          Perusahaan melihat listing terdekat, klaim, dan jadwalkan penjemputan minyak.
        </p>
      </div>

      <!-- Step 3 -->
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gold-200/70">
          <svg class="icon w-7 h-7 text-gold-700"><use href="/icons.svg#credit-card"/></svg>
        </div>
        <h3 class="font-display font-semibold text-lg text-earth-900 mb-2">3. Bayar & Selesai</h3>
        <p class="text-sm text-earth-600 leading-relaxed">
          Setelah diverifikasi, pembayaran diproses langsung ke rekening UMKM.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- ═══ Role Cards ═══ -->
<section class="section bg-earth-200">
  <div class="page-container">
    <div class="text-center mb-12">
      <h2 class="font-display text-3xl sm:text-4xl font-bold text-earth-900">
        Untuk Siapa?
      </h2>
      <p class="mt-3 text-earth-600 max-w-xl mx-auto">
        Dua sisi dari ekosistem daur ulang minyak jelantah yang saling menguntungkan.
      </p>
    </div>

    <div class="grid gap-8 sm:grid-cols-2 max-w-3xl mx-auto">
      <!-- UMKM Card -->
      <div class="card-hover p-6 sm:p-8 group">
        <div class="flex items-center gap-4 mb-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-200/70 text-gold-600 group-hover:bg-gold-200 transition-colors">
            <svg class="icon w-6 h-6"><use href="/icons.svg#shop"/></svg>
          </div>
          <span class="badge-gold text-xs">Penjual</span>
        </div>
        <h3 class="font-display text-xl font-bold text-earth-900 mb-2">Untuk UMKM</h3>
        <p class="text-sm text-earth-600 leading-relaxed mb-5">
          Jual minyak jelantah Anda langsung ke pembeli. Pantau pesanan,
          riwayat transaksi, dan dapatkan cuan dari limbah dapur.
        </p>
        <ul class="space-y-2 text-sm text-earth-700">
          <li class="flex items-start gap-2">
            <svg class="icon w-4 h-4 text-herb-500 mt-0.5 shrink-0"><use href="/icons.svg#check"/></svg>
            Buat listing dalam hitungan menit
          </li>
          <li class="flex items-start gap-2">
            <svg class="icon w-4 h-4 text-herb-500 mt-0.5 shrink-0"><use href="/icons.svg#check"/></svg>
            Terima pembayaran langsung ke rekening
          </li>
          <li class="flex items-start gap-2">
            <svg class="icon w-4 h-4 text-herb-500 mt-0.5 shrink-0"><use href="/icons.svg#check"/></svg>
            Kumpulkan poin & tukar hadiah
          </li>
        </ul>
      </div>

      <!-- Perusahaan Card -->
      <div class="card-hover p-6 sm:p-8 group">
        <div class="flex items-center gap-4 mb-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-herb-200/70 text-herb-600 group-hover:bg-herb-200 transition-colors">
            <svg class="icon w-6 h-6"><use href="/icons.svg#building"/></svg>
          </div>
          <span class="badge text-xs bg-herb-200 text-herb-700">Pembeli</span>
        </div>
        <h3 class="font-display text-xl font-bold text-earth-900 mb-2">Untuk Perusahaan</h3>
        <p class="text-sm text-earth-600 leading-relaxed mb-5">
          Temukan dan klaim stok minyak jelantah dari UMKM di berbagai
          daerah. Atur jadwal penjemputan dan lacak koleksi Anda.
        </p>
        <ul class="space-y-2 text-sm text-earth-700">
          <li class="flex items-start gap-2">
            <svg class="icon w-4 h-4 text-herb-500 mt-0.5 shrink-0"><use href="/icons.svg#check"/></svg>
            Jelajahi listing dengan peta interaktif
          </li>
          <li class="flex items-start gap-2">
            <svg class="icon w-4 h-4 text-herb-500 mt-0.5 shrink-0"><use href="/icons.svg#check"/></svg>
            Kelola pickup dari satu dashboard
          </li>
          <li class="flex items-start gap-2">
            <svg class="icon w-4 h-4 text-herb-500 mt-0.5 shrink-0"><use href="/icons.svg#check"/></svg>
            Lacak volume koleksi & riwayat
          </li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- ═══ Trust Indicators ═══ -->
<section class="section bg-white">
  <div class="page-container">
    <div class="grid gap-10 sm:grid-cols-3 max-w-3xl mx-auto text-center">
      <div>
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold-200/60">
          <svg class="icon w-6 h-6 text-gold-600"><use href="/icons.svg#check"/></svg>
        </div>
        <h3 class="font-display text-xl font-bold text-earth-900">Transparan</h3>
        <p class="text-sm text-earth-600 mt-2">Harga jelas, riwayat transaksi lengkap, tanpa biaya tersembunyi.</p>
      </div>
      <div>
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold-200/60">
          <svg class="icon w-6 h-6 text-gold-600"><use href="/icons.svg#bank"/></svg>
        </div>
        <h3 class="font-display text-xl font-bold text-earth-900">Terpercaya</h3>
        <p class="text-sm text-earth-600 mt-2">Verified UMKM & perusahaan dengan sistem rating.</p>
      </div>
      <div>
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold-200/60">
          <svg class="icon w-6 h-6 text-gold-600"><use href="/icons.svg#trending-up"/></svg>
        </div>
        <h3 class="font-display text-xl font-bold text-earth-900">Efisien</h3>
        <p class="text-sm text-earth-600 mt-2">Proses dari listing ke pembayaran, semuanya dalam satu platform.</p>
      </div>
    </div>
  </div>
</section>

<!-- ═══ CTA ═══ -->
<section class="section bg-gradient-to-b from-earth-200 to-earth-100">
  <div class="page-container">
    <div class="mx-auto max-w-2xl text-center">
      <h2 class="font-display text-3xl sm:text-4xl font-bold text-earth-900 mb-4">
        Siap Mendaur Ulang Minyak Jelantah?
      </h2>
      <p class="text-earth-700 mb-8">
        Bergabunglah dengan ratusan UMKM dan perusahaan yang sudah menggunakan Jelantahin.
      </p>
      <button onclick={handleStart} class="btn-primary btn-lg text-base px-10">
        Mulai Sekarang
        <svg class="icon w-5 h-5"><use href="/icons.svg#arrow-right"/></svg>
      </button>
    </div>
  </div>
</section>
