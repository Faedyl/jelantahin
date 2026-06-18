<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  onMount(() => goto('/dashboard/umkm/history', { replaceState: true }));
</script>
