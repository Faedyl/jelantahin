<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    getChatMessages,
    sendChatMessage,
    subscribeToChatMessages,
    unsubscribeFromChat,
    getTransactionByOrderId
  } from '$lib/supabase.js';

  let {
    orderId,
    currentUserId,
    currentUserName,
    orderStatus,
    onclose
  } = $props();

  let messages = $state([]);
  let newMessage = $state('');
  let loading = $state(true);
  let sending = $state(false);
  let channel = $state(null);
  let chatBody = $state(null);
  let paymentInfo = $state(null); // { status: 'paid'|null, amount, completed_at }

  // Disable chat when the order is completed, cancelled, or payment is confirmed
  let chatDisabled = $derived(
    orderStatus === 'completed' || orderStatus === 'cancelled' || paymentInfo?.status === 'paid'
  );

  function getDisplayName(msg) {
    const p = msg.profiles;
    if (!p) return 'Pengguna';
    if (p.role === 'umkm') return p.umkm_name || p.full_name || 'UMKM';
    if (p.role === 'perusahaan') return p.company_name || p.full_name || 'Perusahaan';
    return p.full_name || 'Pengguna';
  }

  function isOwnMessage(msg) {
    return msg.sender_id === currentUserId;
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  // Group messages by date for date separators + payment announcement
  let groupedMessages = $derived.by(() => {
    const groups = [];
    let currentDate = null;

    // Collect all items (messages + announcement) with their timestamps
    const items = [];

    for (const msg of messages) {
      items.push({ ts: new Date(msg.created_at), type: 'message', msg });
    }

    // Insert payment announcement at the correct chronological position
    if (paymentInfo?.status === 'paid') {
      items.push({ ts: new Date(paymentInfo.completed_at), type: 'announcement' });
    }

    // Sort by timestamp
    items.sort((a, b) => a.ts - b.ts);

    // Build grouped output with date separators
    for (const item of items) {
      const itemDate = item.ts.toLocaleDateString('id-ID');
      if (itemDate !== currentDate) {
        currentDate = itemDate;
        groups.push({ type: 'date', date: itemDate, raw: item.ts.toISOString() });
      }
      if (item.type === 'announcement') {
        groups.push({ type: 'announcement', paymentInfo });
      } else {
        groups.push({ type: 'message', msg: item.msg });
      }
    }

    return groups;
  });

  // Auto-scroll to bottom when messages change
  $effect(() => {
    if (messages.length > 0 && chatBody) {
      requestAnimationFrame(() => {
        if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
      });
    }
  });

  onMount(async () => {
    const [{ data, error }, txRes] = await Promise.all([
      getChatMessages(orderId),
      getTransactionByOrderId(orderId)
    ]);
    if (data) {
      messages = data.reverse();
    }
    // Check if transaction has been paid
    if (txRes.data && txRes.data.payment_status === 'paid') {
      paymentInfo = {
        status: 'paid',
        amount: txRes.data.total_price,
        completed_at: txRes.data.completed_at
      };
    }
    loading = false;

    channel = subscribeToChatMessages(orderId, (msg) => {
      messages = [...messages, msg];
    });
  });

  onDestroy(() => {
    unsubscribeFromChat(channel);
  });

  async function handleSend() {
    const text = newMessage.trim();
    if (!text || sending) return;

    sending = true;
    const { error } = await sendChatMessage({
      orderId,
      senderId: currentUserId,
      message: text
    });
    if (!error) {
      newMessage = '';
    }
    sending = false;
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
</script>

<!-- Modal overlay -->
<div
  role="dialog"
  aria-modal="true"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
  onclick={onclose}
>
  <!-- Modal panel — stop click propagation so clicking inside doesn't close -->
  <div
    class="flex h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
    onclick={(e) => e.stopPropagation()}
    role="document"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-stone-200 px-5 py-4">
      <div>
        <p class="text-sm font-semibold text-jelantah-600">💬 Chat</p>
        <h2 class="text-lg font-bold text-stone-800">Diskusi Pesanan</h2>
      </div>
      <button
        type="button"
        onclick={onclose}
        class="rounded-lg px-3 py-1 text-sm text-stone-500 hover:bg-stone-100"
      >
        ✕
      </button>
    </div>

    <!-- Messages area -->
    <div
      bind:this={chatBody}
      class="flex-1 overflow-y-auto px-5 py-4 space-y-3"
    >
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <p class="text-sm text-stone-400">Memuat pesan...</p>
        </div>
      {:else if messages.length === 0 && !paymentInfo}
        <div class="flex items-center justify-center py-12">
          <p class="text-sm text-stone-400">
            {chatDisabled ? 'Tidak ada pesan.' : 'Belum ada pesan. Mulai diskusi dengan mengirim pesan di bawah.'}
          </p>
        </div>
      {:else}
        {#each groupedMessages as item}
          {#if item.type === 'date'}
            <div class="flex justify-center">
              <span class="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-500">
                {item.date}
              </span>
            </div>
          {:else if item.type === 'announcement'}
            <div class="flex justify-center">
              <div class="flex max-w-[90%] items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
                <span class="text-lg">💰</span>
                <div class="text-center">
                  <p class="font-semibold">Pembayaran Telah Dikonfirmasi</p>
                  <p class="text-xs text-green-600">
                    {formatRupiah(item.paymentInfo.amount)} —
                    {formatTime(item.paymentInfo.completed_at)}
                  </p>
                </div>
              </div>
            </div>
          {:else}
            {@const msg = item.msg}
            <div class="flex {isOwnMessage(msg) ? 'justify-end' : 'justify-start'}">
              <div class="max-w-[80%]">
                {#if !isOwnMessage(msg)}
                  <p class="mb-1 text-xs font-medium text-stone-500 px-1">
                    {getDisplayName(msg)}
                  </p>
                {/if}
                <div
                  class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm {isOwnMessage(msg)
                    ? 'bg-jelantah-500 text-white rounded-br-md'
                    : 'bg-stone-100 text-stone-800 rounded-bl-md'}"
                >
                  <p class="whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
                <p
                  class="mt-0.5 text-[10px] text-stone-400 px-1 {isOwnMessage(msg)
                    ? 'text-right'
                    : 'text-left'}"
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>

    <!-- Input area -->
    <div class="border-t border-stone-200 p-4">
      {#if chatDisabled}
        <div class="flex items-center justify-center gap-2 rounded-xl bg-stone-50 py-3 text-sm text-stone-500">
          <span>🔒</span>
          <span>Pesanan sudah selesai. Chat tidak tersedia.</span>
        </div>
      {:else}
        <div class="flex items-end gap-2">
          <textarea
            bind:value={newMessage}
            onkeydown={handleKeydown}
            placeholder="Ketik pesan..."
            rows="1"
            class="input-field min-h-[44px] resize-none"
            disabled={sending}
          ></textarea>
          <button
            type="button"
            onclick={handleSend}
            class="btn-primary h-[44px] shrink-0 px-4"
            disabled={sending || !newMessage.trim()}
          >
            {sending ? '...' : 'Kirim'}
          </button>
        </div>
        <p class="mt-1 text-xs text-stone-400">
          Tekan Enter untuk kirim, Shift+Enter untuk baris baru
        </p>
      {/if}
    </div>
  </div>
</div>
