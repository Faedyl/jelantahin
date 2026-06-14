<script>
  /**
   * StepTracker — 4-phase order lifecycle visualizer
   * Props:
   *   status: string       — current order status (e.g. 'confirmed', 'picked_up', ...)
   *   isPaid: boolean      — whether payment has been confirmed (shows phase 4 as done)
   */
  let { status, isPaid = false } = $props();

  const PHASES = [
    {
      id: 'order', label: 'Pesanan',
      svg: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
    },
    {
      id: 'pickup', label: 'Penjemputan',
      svg: '<svg viewBox="0 0 24 24"><rect x="1" y="6" width="15" height="9" rx="1"/><circle cx="5.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><polyline points="17 9 20 9 22 12 22 14 16 14"/></svg>'
    },
    {
      id: 'done', label: 'Selesai',
      svg: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    },
    {
      id: 'paid', label: 'Lunas',
      svg: '<svg viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="2"/><polyline points="1 5 12 12 23 5"/><circle cx="17.5" cy="12.5" r="2.5"/></svg>'
    },
  ];

  /** Map order status to phase index (0-3) */
  const phaseIndex = $derived.by(() => {
    if (status === 'cancelled') return -1;
    const STATUS_TO_PHASE = {
      'pending': 0,
      'confirmed_by_umkm': 0,
      'confirmed': 1,
      'picked_up_by_perusahaan': 1,
      'picked_up': 1,
      'completed_by_perusahaan': 2,
      'completed': 2,
      'paid': 3,
    };
    const idx = STATUS_TO_PHASE[status];
    if (isPaid && idx < 3) return 3;
    return idx ?? 0;
  });

  const progress = $derived(phaseIndex < 0 ? 0 : phaseIndex / (PHASES.length - 1));
</script>

<div class="step-tracker">
  <div class="st-row">
    <div class="st-line"></div>
    <div class="st-fill" style="width: {progress * 100}%"></div>
    {#each PHASES as phase, i}
      <button
        class="st-step"
        class:st-done={i < phaseIndex}
        class:st-current={i === phaseIndex}
        class:st-pending={i > phaseIndex}
        disabled
      >
        <span class="st-dot"></span>
        <span class="st-icon">{@html phase.svg}</span>
        <span class="st-label">{phase.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .step-tracker {
    padding: 0.25rem 0;
  }

  .st-row {
    position: relative;
    display: flex;
    justify-content: space-between;
    padding-top: 0;
  }

  .st-line {
    position: absolute;
    left: 0; right: 0;
    top: 4px;           /* center of dot = 6px, line center = 4+2 = 6px */
    height: 4px;
    background: #EFE5D5;
    border-radius: 4px;
    z-index: 0;
    pointer-events: none;
  }

  .st-fill {
    position: absolute;
    left: 0;
    top: 4px;           /* same as line */
    height: 4px;
    width: 0%;
    background: #D4A40D;
    border-radius: 4px;
    z-index: 1;
    pointer-events: none;
    transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .st-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    flex: 1;
    padding: 0 0.25rem;
    border: none;
    background: none;
    cursor: default;
    font-family: Sora, system-ui, sans-serif;
    position: relative;
    z-index: 2;
  }

  .st-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2.5px solid #DDCEB0;
    background: #EFE5D5;
    flex-shrink: 0;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .st-done .st-dot {
    background: #D4A40D;
    border-color: #D4A40D;
  }
  .st-current .st-dot {
    background: #fff;
    border-color: #D4A40D;
    box-shadow: 0 0 0 5px rgba(212, 164, 13, 0.15);
  }

  .st-icon {
    width: 22px;
    height: 22px;
    opacity: 0.5;
    transition: opacity 0.3s;
  }
  .st-icon :global(svg) {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .st-done .st-icon,
  .st-current .st-icon {
    opacity: 1;
  }
  .st-pending .st-icon {
    color: #DDCEB0;
  }
  .st-done .st-icon {
    color: #9E8A6A;
  }
  .st-current .st-icon {
    color: #D4A40D;
  }

  .st-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #9E8A6A;
    transition: color 0.2s;
  }
  .st-done .st-label {
    color: #9E8A6A;
  }
  .st-current .st-label {
    color: #D4A40D;
  }
</style>
