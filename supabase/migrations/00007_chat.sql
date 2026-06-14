-- ============================================================
-- jelantahin — Chat system between UMKM & Perusahaan
-- Each message is scoped to an order for context.
-- Uses Supabase Realtime for live updates.
-- ============================================================

-- 1. CHAT MESSAGES
create table public.chat_messages (
  id          uuid        primary key default gen_random_uuid(),
  order_id    uuid        not null references public.orders(id) on delete cascade,
  sender_id   uuid        not null references public.profiles(id) on delete cascade,
  message     text        not null check (char_length(message) > 0 and char_length(message) <= 2000),
  created_at  timestamptz not null default now()
);

-- Index for fast lookups by order
create index idx_chat_messages_order on public.chat_messages(order_id);
create index idx_chat_messages_created on public.chat_messages(created_at);

-- 2. ROW-LEVEL SECURITY
alter table public.chat_messages enable row level security;

-- Users can read messages for orders they are involved in
create policy "Chat messages readable by order participants"
  on public.chat_messages for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.umkm_id = auth.uid() or o.perusahaan_id = auth.uid())
    )
  );

-- Users can insert their own messages into orders they are involved in
create policy "Chat messages insertable by order participants"
  on public.chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.umkm_id = auth.uid() or o.perusahaan_id = auth.uid())
    )
  );

-- No update/delete — messages are immutable once sent.

-- 3. ENABLE REPLICATION FOR REALTIME
-- This allows us to subscribe to new messages per order via Supabase Realtime.
alter publication supabase_realtime add table public.chat_messages;
