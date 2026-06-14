<script>
  import { onMount } from 'svelte';
  import { playSuccessSound, playErrorSound } from '$lib/sound.js';
  import { fly } from 'svelte/transition';

  /**
   * NotificationPopup — a toast-style notification that slides in from top-right,
   * plays a sound, and auto-dismisses.
   *
   * Props:
   *   type     — 'success' | 'error' | 'info'
   *   title    — Bold heading
   *   message  — Body text (plain text)
   *   duration — Auto-dismiss ms (default 4000, 0 = no auto-dismiss)
   *   ondismiss — Callback when notification is dismissed
   */

  let { type = 'success', title = '', message = '', duration = 4000, ondismiss } = $props();

  let visible = $state(true);

  function dismiss() {
    visible = false;
    ondismiss?.();
  }

  onMount(() => {
    // Play the appropriate sound
    if (type === 'success') playSuccessSound();
    else if (type === 'error') playErrorSound();
    // else info = silent

    // Auto-dismiss
    if (duration > 0) {
      const timer = setTimeout(dismiss, duration);
      return () => clearTimeout(timer);
    }
  });

  // Icon per type
  const iconMap = {
    success: 'check',
    error: 'alert-circle',
    info: 'info'
  };

  // Colours per type
  const colours = $derived.by(() => {
    if (type === 'success') {
      return {
        border: 'border-l-herb-500',
        bg: 'bg-herb-50',
        iconBg: 'bg-herb-100',
        icon: 'text-herb-600',
        title: 'text-herb-900',
        msg: 'text-herb-700',
        close: 'text-herb-400 hover:text-herb-600'
      };
    }
    if (type === 'error') {
      return {
        border: 'border-l-red-500',
        bg: 'bg-red-50',
        iconBg: 'bg-red-100',
        icon: 'text-red-600',
        title: 'text-red-900',
        msg: 'text-red-700',
        close: 'text-red-400 hover:text-red-600'
      };
    }
    // info
    return {
      border: 'border-l-gold-500',
      bg: 'bg-gold-50',
      iconBg: 'bg-gold-100',
      icon: 'text-gold-600',
      title: 'text-gold-900',
      msg: 'text-gold-700',
      close: 'text-gold-400 hover:text-gold-600'
    };
  });
</script>

{#if visible}
  <div
    class="notification-overlay"
    role="status"
    aria-live="polite"
  >
    <div
      class="notification-toast {colours.bg} {colours.border}"
      transition:fly={{ x: 50, opacity: 0, duration: 300 }}
    >
      <!-- Left accent bar is handled by border-l-* -->

      <div class="notification-body">
        <div class="notification-icon-wrap {colours.iconBg}">
          <svg class="notification-icon {colours.icon}">
            <use href="/icons.svg#{iconMap[type]}"/>
          </svg>
        </div>
        <div class="notification-text">
          {#if title}
            <p class="notification-title {colours.title}">{title}</p>
          {/if}
          {#if message}
            <p class="notification-message {colours.msg}">{message}</p>
          {/if}
        </div>
      </div>

      <button
        class="notification-close {colours.close}"
        onclick={dismiss}
        aria-label="Tutup notifikasi"
      >
        <svg class="icon w-4 h-4"><use href="/icons.svg#x"/></svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .notification-overlay {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    max-width: 24rem;
    width: calc(100% - 2rem);
    pointer-events: none;
  }

  .notification-toast {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 0.75rem;
    border-left-width: 4px;
    border-left-style: solid;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06);
  }

  .notification-body {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }

  .notification-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    flex-shrink: 0;
  }

  .notification-icon {
    width: 1rem;
    height: 1rem;
  }

  .notification-text {
    flex: 1;
    min-width: 0;
  }

  .notification-title {
    font-size: 0.875rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    line-height: 1.3;
  }

  .notification-message {
    font-size: 0.8125rem;
    line-height: 1.4;
    margin-top: 0.125rem;
  }

  .notification-close {
    flex-shrink: 0;
    padding: 0.25rem;
    border-radius: 0.375rem;
    transition: color 0.15s;
    background: transparent;
    border: none;
    cursor: pointer;
    margin-top: 0.125rem;
  }

  .notification-close:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .notification-close:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
</style>
