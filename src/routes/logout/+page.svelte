<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import { goto } from '$app/navigation';

  onMount(async () => {
    await supabase.auth.signOut();
    goto('/');
  });
</script>

<div class="flex min-h-[50vh] items-center justify-center">
  <p class="text-earth-600">Logging out...</p>
</div>
