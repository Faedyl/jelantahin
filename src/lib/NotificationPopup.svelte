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

  let { type = 'success', title = '', message = '', duration = 4000, noSound = false, ondismiss } = $props();

  let visible = $state(true);
  let toastEl = $state(null);

  function dismiss() {
    visible = false;
    ondismiss?.();
  }

  onMount(() => {
    if (!noSound) {
      if (type === 'success') playSuccessSound();
      else if (type === 'error') playErrorSound();
    }

    if (duration > 0) {
      const timer = setTimeout(dismiss, duration);
      return () => clearTimeout(timer);
    }
  });

  const iconMap = {
    success: 'check',
    error: 'alert-circle',
    info: 'info'
  };

  // Colours per type — uses the design system palette (50/100/600/700/900 now defined)
  const colours = $derived.by(() => {
    if (type === 'success') {
      return {
        border: 'border-l-herb-500',
        bg: 'bg-white',
        accentBg: 'bg-herb-50',
        iconBg: 'bg-herb-100',
        icon: 'text-herb-600',
        title: 'text-herb-900',
        msg: 'text-herb-700',
        close: 'text-herb-400 hover:text-herb-600',
        closeBg: 'hover:bg-herb-100',
        dot: 'bg-herb-500',
      };
    }
    if (type === 'error') {
      return {
        border: 'border-l-red-500',
        bg: 'bg-white',
        accentBg: 'bg-red-50',
        iconBg: 'bg-red-100',
        icon: 'text-red-600',
        title: 'text-red-900',
        msg: 'text-red-700',
        close: 'text-red-400 hover:text-red-600',
        closeBg: 'hover:bg-red-100',
        dot: 'bg-red-500',
      };
    }
    // info
    return {
      border: 'border-l-gold-500',
      bg: 'bg-white',
      accentBg: 'bg-gold-50',
      iconBg: 'bg-gold-100',
      icon: 'text-gold-600',
      title: 'text-gold-900',
      msg: 'text-gold-700',
      close: 'text-gold-400 hover:text-gold-600',
      closeBg: 'hover:bg-gold-100',
      dot: 'bg-gold-500',
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
      class="notification-toast {colours.border} {colours.bg}"
      transition:fly={{ x: 60, opacity: 0, duration: 400, easing: (t) => 1 - Math.pow(1 - t, 3) }}
    >
      <!-- Accent stripe on the left + subtle background tint -->
      <div class="notification-accent {colours.accentBg}"></div>

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
        class="notification-close {colours.close} {colours.closeBg}"
        onclick={dismiss}
        aria-label="Tutup notifikasi"
      >
        <svg class="icon w-[18px] h-[18px]"><use href="/icons.svg#x"/></svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .notification-overlay {
    position: fixed;
    top: 1.25rem;
    right: 1.25rem;
    z-index: 9999;
    max-width: 26rem;
    width: calc(100% - 2.5rem);
    pointer-events: none;
  }

  .notification-toast {
    pointer-events: auto;
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1rem 1rem 0;
    border-radius: 1rem;
    border-left: 4px solid transparent;
    background: #ffffff;
    box-shadow:
      0 4px 12px oklch(0 0 0 / 0.06),
      0 12px 32px oklch(0 0 0 / 0.08);
    transition:
      box-shadow 0.25s ease,
      transform 0.25s ease;
    overflow: hidden;
  }

  .notification-toast:hover {
    box-shadow:
      0 6px 16px oklch(0 0 0 / 0.08),
      0 16px 40px oklch(0 0 0 / 0.10);
    transform: translateY(-1px);
  }

  /* Accent bar — full-height left stripe with rounded ends */
  .notification-accent {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
    opacity: 0.5;
  }

  .notification-body {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
    margin-left: 1rem;
  }

  .notification-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .notification-icon {
    width: 1.125rem;
    height: 1.125rem;
  }

  .notification-text {
    flex: 1;
    min-width: 0;
  }

  .notification-title {
    font-size: 0.9375rem;
    font-weight: 700;
    font-family: 'Sora', system-ui, -apple-system, sans-serif;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }

  .notification-message {
    font-size: 0.8125rem;
    line-height: 1.5;
    margin-top: 0.125rem;
    opacity: 0.85;
  }

  .notification-close {
    flex-shrink: 0;
    padding: 0.375rem;
    border-radius: 0.5rem;
    transition:
      color 0.15s,
      background-color 0.15s;
    background: transparent;
    border: none;
    cursor: pointer;
    margin-top: 0.125rem;
    margin-right: 0.25rem;
    opacity: 0.6;
  }

  .notification-close:hover {
    opacity: 1;
  }

  .notification-close:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
</style>
