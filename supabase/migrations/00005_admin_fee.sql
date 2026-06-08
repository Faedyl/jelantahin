-- ============================================================
-- jelantahin — Admin fee + platform config
-- Admin fee: additional charge per transaction (platform revenue)
-- ============================================================

-- 1. Add admin_fee to payment_confirmations
alter table public.payment_confirmations
  add column if not exists admin_fee numeric(14,2) not null default 0 check (admin_fee >= 0);

-- 2. Platform config table (key-value for app settings)
create table if not exists public.platform_config (
  key         text        primary key,
  value       text        not null,
  description text,
  updated_at  timestamptz not null default now()
);

-- Insert default admin fee: 2.5% per transaction
insert into public.platform_config (key, value, description)
values ('admin_fee_percentage', '2.5', 'Biaya admin per transaksi (dalam persen)')
on conflict (key) do nothing;

-- RLS: everyone can read, only authenticated can update
alter table public.platform_config enable row level security;

create policy "Anyone can read platform config"
  on public.platform_config for select to authenticated using (true);

create policy "Authenticated can insert platform config"
  on public.platform_config for insert to authenticated with check (true);

create policy "Authenticated can update platform config"
  on public.platform_config for update to authenticated using (true);
