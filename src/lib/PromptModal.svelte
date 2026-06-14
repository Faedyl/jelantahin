<script>
  /**
   * Reusable prompt modal — replaces browser prompt().
   * Props:
   *   title       — Modal heading
   *   message     — Body text
   *   label       — Label above the input field
   *   placeholder — Input placeholder
   *   defaultValue— Initial input value
   *   confirmText — Label for the confirm button (default "Simpan")
   *   cancelText  — Label for the cancel button (default "Batal")
   *   onconfirm   — Callback(value) when user clicks confirm
   *   oncancel    — Callback when user cancels
   *   error       — Error message to show (bound externally)
   */
  let {
    title = 'Konfirmasi',
    message = '',
    label = '',
    placeholder = '',
    defaultValue = '',
    confirmText = 'Simpan',
    cancelText = 'Batal',
    onconfirm,
    oncancel,
    error = ''
  } = $props();

  let value = $state(defaultValue);
  let submitting = $state(false);
  let localError = $state('');

  async function handleConfirm() {
    submitting = true;
    localError = '';
    try {
      await onconfirm(value);
    } catch (e) {
      localError = e.message || 'Terjadi kesalahan.';
    }
    submitting = false;
  }
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

    {#if message}
      <p class="text-sm text-earth-700 mb-4">{message}</p>
    {/if}

    {#if label}
      <label class="input-label mb-1">{label}</label>
    {/if}

    <input
      type="number"
      step="0.1"
      min="0.1"
      class="input mb-2"
      bind:value={value}
      placeholder={placeholder}
    />

    {#if error || localError}
      <div class="alert-error mb-3">
        <svg class="icon w-4 h-4 mt-0.5 flex-shrink-0"><use href="/icons.svg#alert-circle"/></svg>
        <span>{error || localError}</span>
      </div>
    {/if}

    <div class="flex gap-3 mt-4">
      <button
        onclick={oncancel}
        class="btn-secondary btn-md flex-1"
        disabled={submitting}
      >
        {cancelText}
      </button>
      <button
        onclick={handleConfirm}
        class="btn-primary btn-md flex-1"
        disabled={submitting}
      >
        {#if submitting}
          <svg class="icon w-4 h-4 animate-spin"><use href="/icons.svg#loader"/></svg>
          Memproses...
        {:else}
          {confirmText}
        {/if}
      </button>
    </div>
  </div>
</div>
