<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  onMount(() => goto('/dashboard/perusahaan/orders', { replaceState: true }));
</script>
