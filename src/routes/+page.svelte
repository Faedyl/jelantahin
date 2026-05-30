<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { goto } from '$app/navigation';

  let session = $state(null);
  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  });

  async function handleStart() {
    if (session) {
      goto('/dashboard');
    } else {
      goto('/register');
    }
  }
</script>

<div class="flex flex-col items-center justify-center px-6 py-20 text-center">
  <span class="text-6xl mb-6">🫒</span>
  <h1 class="text-4xl font-bold tracking-tight text-stone-800 sm:text-5xl">
    Selamat datang di <span class="text-jelantah-500">Jelantahin</span>
  </h1>
  <p class="mt-4 max-w-xl text-lg text-stone-500">
    Platform yang menghubungkan UMKM penghasil minyak jelantah dengan
    perusahaan kolektor yang membutuhkan. Daur ulang minyak bekas jadi
    lebih mudah, transparan, dan menguntungkan.
  </p>

  <div class="mt-12 grid gap-8 sm:grid-cols-2 max-w-2xl">
    <div class="card text-left">
      <span class="text-3xl">🏪</span>
      <h3 class="mt-3 font-semibold text-stone-800">Untuk UMKM</h3>
      <p class="mt-1 text-sm text-stone-500">
        Jual minyak jelantah Anda langsung ke pembeli. Pantau pesanan,
        riwayat transaksi, dan dapatkan cuan dari limbah dapur.
      </p>
    </div>
    <div class="card text-left">
      <span class="text-3xl">🏭</span>
      <h3 class="mt-3 font-semibold text-stone-800">Untuk Perusahaan</h3>
      <p class="mt-1 text-sm text-stone-500">
        Temukan dan klaim stok minyak jelantah dari UMKM di berbagai
        daerah. Atur jadwal penjemputan dan lacak koleksi Anda.
      </p>
    </div>
  </div>

  <button onclick={handleStart} class="btn-primary mt-10 text-base px-8 py-3">
    Mulai Sekarang
  </button>

  <div class="mt-16 grid gap-8 text-center sm:grid-cols-3 max-w-3xl">
    <div>
      <p class="text-2xl font-bold text-jelantah-500">Transparan</p>
      <p class="text-sm text-stone-500 mt-1">Harga jelas, riwayat lengkap</p>
    </div>
    <div>
      <p class="text-2xl font-bold text-jelantah-500">Terpercaya</p>
      <p class="text-sm text-stone-500 mt-1">Verified UMKM & perusahaan</p>
    </div>
    <div>
      <p class="text-2xl font-bold text-jelantah-500">Efisien</p>
      <p class="text-sm text-stone-500 mt-1">Proses dari listing ke koleksi</p>
    </div>
  </div>
</div>
