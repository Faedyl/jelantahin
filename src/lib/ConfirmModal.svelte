<script>
  /**
   * Reusable confirmation modal — replaces browser confirm().
   * Props:
   *   title       — Modal heading
   *   message     — Body text (supports HTML)
   *   confirmText — Label for the confirm button (default "Ya")
   *   cancelText  — Label for the cancel button (default "Batal")
   *   onconfirm   — Callback when user clicks confirm
   *   oncancel    — Callback when user clicks cancel / closes
   *   loading     — Show spinner on confirm button (optional)
   *   variant     — 'primary' (default) or 'danger' for destructive actions
   */
  let { title = 'Konfirmasi', message = '', confirmText = 'Ya', cancelText = 'Batal', onconfirm, oncancel, loading = false, variant = 'primary' } = $props();

  let btnClass = $derived(variant === 'danger'
    ? 'btn-danger btn-md flex-1'
    : 'btn-primary btn-md flex-1');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
  onclick={oncancel}
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="w-full max-w-md rounded-xl bg-white p-6 shadow-brand-xl animate-scale-in"
    onclick={(e) => e.stopPropagation()}
  >
    <h2 class="text-lg font-bold font-display text-earth-900 mb-3">{title}</h2>

    <p class="text-sm text-earth-700 mb-6">{@html message}</p>

    <div class="flex gap-3">
      <button
        onclick={oncancel}
        class="btn-secondary btn-md flex-1"
        disabled={loading}
      >
        {cancelText}
      </button>
      <button
        onclick={onconfirm}
        class={btnClass}
        disabled={loading}
      >
        {#if loading}
          <svg class="icon w-4 h-4 animate-spin"><use href="/icons.svg#loader"/></svg>
          Memproses...
        {:else}
          {confirmText}
        {/if}
      </button>
    </div>
  </div>
</div>
