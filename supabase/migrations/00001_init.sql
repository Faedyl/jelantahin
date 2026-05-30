-- ============================================================
-- jelantahin — Supabase Schema
-- Used cooking oil platform connecting UMKM ↔ Perusahaan/Kolektor
-- ============================================================

-- 1. CUSTOM TYPES
create type user_role as enum ('umkm', 'perusahaan');

-- 2. PROFILES (extends auth.users)
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        user_role   not null,
  full_name   text        not null,
  phone       text,
  address     text,
  -- UMKM-specific
  umkm_name   text,                  -- nama usaha
  umkm_type   text,                  -- e.g. rumah makan, catering, industri rumah
  -- Perusahaan-specific
  company_name    text,
  company_nib     text,              -- Nomor Induk Berusaha
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- trigger: auto-create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. OIL LISTINGS (UMKM posts available used cooking oil)
create table public.oil_listings (
  id              uuid        primary key default gen_random_uuid(),
  umkm_id         uuid        not null references public.profiles(id) on delete cascade,
  quantity_liters numeric(8,2) not null check (quantity_liters > 0),
  price_per_liter numeric(12,2) not null check (price_per_liter >= 0),
  description     text,
  pickup_address  text        not null,
  city            text,
  status          text        not null default 'available'
                              check (status in ('available','claimed','completed','cancelled')),
  available_until timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 4. ORDERS (Perusahaan claims / requests collection)
create table public.orders (
  id              uuid        primary key default gen_random_uuid(),
  listing_id      uuid        not null references public.oil_listings(id) on delete restrict,
  perusahaan_id   uuid        not null references public.profiles(id) on delete cascade,
  umkm_id         uuid        not null references public.profiles(id) on delete cascade,
  requested_liters numeric(8,2) not null check (requested_liters > 0),
  status          text        not null default 'pending'
                              check (status in ('pending','confirmed','picked_up','completed','cancelled')),
  pickup_date     date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 5. TRANSACTIONS (completed pickups)
create table public.transactions (
  id              uuid        primary key default gen_random_uuid(),
  order_id        uuid        not null references public.orders(id) on delete restrict,
  actual_liters   numeric(8,2) not null check (actual_liters > 0),
  total_price     numeric(14,2) not null check (total_price >= 0),
  payment_method  text        check (payment_method in ('cash','transfer','ewallet')),
  payment_status  text        not null default 'pending'
                              check (payment_status in ('pending','paid','confirmed')),
  completed_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- 6. ROW-LEVEL SECURITY
alter table public.profiles       enable row level security;
alter table public.oil_listings   enable row level security;
alter table public.orders          enable row level security;
alter table public.transactions    enable row level security;

-- Profiles: users can read any profile (for listing/order references),
-- but only update their own.
create policy "Profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

-- Oil listings: anyone authenticated can read; UMKM can insert/update own
create policy "Listings readable by authenticated"
  on public.oil_listings for select to authenticated using (true);

create policy "UMKM can insert listings"
  on public.oil_listings for insert to authenticated
  with check (umkm_id = auth.uid());

create policy "UMKM can update own listings"
  on public.oil_listings for update to authenticated
  using (umkm_id = auth.uid());

-- Orders: readable by involved parties; insertable by perusahaan
create policy "Orders readable by involved parties"
  on public.orders for select to authenticated
  using (umkm_id = auth.uid() or perusahaan_id = auth.uid());

create policy "Perusahaan can insert orders"
  on public.orders for insert to authenticated
  with check (perusahaan_id = auth.uid());

create policy "Involved parties can update orders"
  on public.orders for update to authenticated
  using (umkm_id = auth.uid() or perusahaan_id = auth.uid());

-- Transactions: readable by involved parties; inserted via trigger/rpc
create policy "Transactions readable by involved parties"
  on public.transactions for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.umkm_id = auth.uid() or o.perusahaan_id = auth.uid())
    )
  );

-- 7. INDEXES
create index idx_listings_umkm       on public.oil_listings(umkm_id);
create index idx_listings_status     on public.oil_listings(status);
create index idx_orders_listing      on public.orders(listing_id);
create index idx_orders_perusahaan   on public.orders(perusahaan_id);
create index idx_orders_umkm         on public.orders(umkm_id);
create index idx_transactions_order  on public.transactions(order_id);
