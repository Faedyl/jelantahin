-- ============================================================
-- jelantahin — Credit Coupon Points System + Free Payment Gateway
-- Points earned from transactions → redeem for items/goods
-- Free payment via manual bank transfer confirmation
-- ============================================================

-- 1. CREDIT COUPONS (points balance per user)
-- Points earned from completing transactions, separate from cash payments
create table public.credit_coupons (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  balance     integer     not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id)
);

-- 2. POINT EARNINGS LOG (track how points were earned)
create table public.point_earnings (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  transaction_id  uuid        references public.transactions(id) on delete set null,
  points          integer     not null check (points > 0),
  source          text        not null check (source in ('transaction','bonus','referral','adjustment')),
  description     text,
  created_at      timestamptz not null default now()
);

-- 3. REDEMPTION ITEMS (catalog of things users can exchange points for)
create table public.redemption_items (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  description     text,
  points_required integer     not null check (points_required > 0),
  stock           integer     not null default 0 check (stock >= 0),
  image_url       text,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 4. REDEMPTION REQUESTS (when a user redeems points for an item)
create table public.redemption_requests (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  item_id         uuid        not null references public.redemption_items(id) on delete restrict,
  points_used     integer     not null check (points_used > 0),
  quantity        integer     not null default 1 check (quantity > 0),
  status          text        not null default 'pending'
                              check (status in ('pending','approved','rejected','fulfilled','cancelled')),
  admin_notes     text,
  fulfilled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 5. PAYMENT BANKS (company bank accounts for manual transfer)
create table public.payment_banks (
  id              uuid        primary key default gen_random_uuid(),
  bank_name       text        not null,
  account_number  text        not null,
  account_name    text        not null,
  is_active       boolean     not null default true,
  sort_order      integer     not null default 0,
  created_at      timestamptz not null default now()
);

-- 6. PAYMENT CONFIRMATIONS (user uploads proof of transfer)
create table public.payment_confirmations (
  id              uuid        primary key default gen_random_uuid(),
  transaction_id  uuid        not null references public.transactions(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  bank_id         uuid        references public.payment_banks(id) on delete set null,
  amount          numeric(14,2) not null check (amount > 0),
  transfer_date   date        not null,
  sender_name     text,
  sender_bank     text,
  proof_image_url text,
  notes           text,
  status          text        not null default 'pending'
                              check (status in ('pending','confirmed','rejected')),
  confirmed_by    uuid        references public.profiles(id) on delete set null,
  confirmed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Add points_earned to existing transactions table
alter table public.transactions
  add column if not exists points_earned integer default 0 check (points_earned >= 0);

-- 7. ROW-LEVEL SECURITY
alter table public.credit_coupons          enable row level security;
alter table public.point_earnings          enable row level security;
alter table public.redemption_items        enable row level security;
alter table public.redemption_requests     enable row level security;
alter table public.payment_banks           enable row level security;
alter table public.payment_confirmations   enable row level security;

-- Credit coupons: users see own; admins can see all
create policy "Users can view own credit coupons"
  on public.credit_coupons for select to authenticated
  using (user_id = auth.uid());

create policy "Trigger/function manages credit coupons insert/update"
  on public.credit_coupons for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own credit coupons (via functions only)"
  on public.credit_coupons for update to authenticated
  using (user_id = auth.uid());

-- Point earnings: users see own
create policy "Users can view own point earnings"
  on public.point_earnings for select to authenticated
  using (user_id = auth.uid());

create policy "System can insert point earnings"
  on public.point_earnings for insert to authenticated
  with check (user_id = auth.uid());

-- Redemption items: anyone can view active items
create policy "Anyone can view active redemption items"
  on public.redemption_items for select to authenticated
  using (is_active = true);

-- Redemption requests: users see own; admins manage
create policy "Users can view own redemption requests"
  on public.redemption_requests for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own redemption requests"
  on public.redemption_requests for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can cancel own pending requests"
  on public.redemption_requests for update to authenticated
  using (user_id = auth.uid() and status = 'pending');

-- Payment banks: everyone can read active banks
create policy "Anyone can read active payment banks"
  on public.payment_banks for select to authenticated
  using (is_active = true);

-- Payment confirmations: users see own; admins manage
create policy "Users can view own payment confirmations"
  on public.payment_confirmations for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own payment confirmations"
  on public.payment_confirmations for insert to authenticated
  with check (user_id = auth.uid());

-- 8. INDEXES
create index idx_credit_coupons_user      on public.credit_coupons(user_id);
create index idx_point_earnings_user      on public.point_earnings(user_id);
create index idx_point_earnings_tx        on public.point_earnings(transaction_id);
create index idx_redemption_items_active  on public.redemption_items(is_active);
create index idx_redemption_requests_user on public.redemption_requests(user_id);
create index idx_redemption_requests_status on public.redemption_requests(status);
create index idx_payment_banks_active     on public.payment_banks(is_active);
create index idx_payment_confirmations_tx on public.payment_confirmations(transaction_id);
create index idx_payment_confirmations_user on public.payment_confirmations(user_id);
create index idx_payment_confirmations_status on public.payment_confirmations(status);

-- 9. HELPER FUNCTIONS

-- Increment points balance atomically (used by earnPoints())
create or replace function public.increment_points(
  p_user_id uuid,
  p_points integer
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.credit_coupons (user_id, balance, lifetime_earned)
  values (p_user_id, p_points, p_points)
  on conflict (user_id)
  do update set
    balance = public.credit_coupons.balance + p_points,
    lifetime_earned = public.credit_coupons.lifetime_earned + p_points,
    updated_at = now();
end;
$$;

-- Decrement points when redeeming
create or replace function public.decrement_points(
  p_user_id uuid,
  p_points integer
)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  current_balance integer;
begin
  select balance into current_balance
  from public.credit_coupons
  where user_id = p_user_id
  for update;  -- lock row

  if current_balance is null or current_balance < p_points then
    return false;
  end if;

  update public.credit_coupons
  set
    balance = balance - p_points,
    updated_at = now()
  where user_id = p_user_id;

  return true;
end;
$$;
