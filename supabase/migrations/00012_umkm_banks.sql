-- ============================================================
-- jelantahin — Multi-rekening UMKM
-- Allows UMKM to store more than one bank account (rekening).
-- The existing profiles.bank_name/account/holder columns are
-- kept for backward compatibility — they're synced to the
-- primary bank account on insert/update via trigger.
-- ============================================================

-- 1. UMKM BANKS TABLE
create table public.umkm_banks (
  id              uuid        primary key default gen_random_uuid(),
  umkm_id         uuid        not null references public.profiles(id) on delete cascade,
  bank_name       text        not null,
  bank_account    text        not null,
  bank_holder     text        not null,
  is_primary      boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. ROW-LEVEL SECURITY
alter table public.umkm_banks enable row level security;

-- UMKM can view their own banks
create policy "UMKM can view own banks"
  on public.umkm_banks for select to authenticated
  using (umkm_id = auth.uid());

-- Perusahaan can view banks of UMKM they have orders with
create policy "Perusahaan can view UMKM banks for their orders"
  on public.umkm_banks for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.umkm_id = umkm_banks.umkm_id
      and o.perusahaan_id = auth.uid()
    )
  );

-- UMKM can insert their own banks
create policy "UMKM can insert own banks"
  on public.umkm_banks for insert to authenticated
  with check (umkm_id = auth.uid());

-- UMKM can update their own banks
create policy "UMKM can update own banks"
  on public.umkm_banks for update to authenticated
  using (umkm_id = auth.uid())
  with check (umkm_id = auth.uid());

-- UMKM can delete their own banks
create policy "UMKM can delete own banks"
  on public.umkm_banks for delete to authenticated
  using (umkm_id = auth.uid());

-- 3. INDEXES
create index idx_umkm_banks_umkm on public.umkm_banks(umkm_id);
create index idx_umkm_banks_primary on public.umkm_banks(umkm_id, is_primary) where is_primary = true;

-- 4. TRIGGER: sync primary bank to profiles for backward compatibility
-- (The payment page still reads profiles.bank_* as fallback)
create or replace function public.sync_primary_bank_to_profile()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- If the deleted bank was primary, clear profile or assign next
    update public.profiles
    set
      bank_name = (
        select bank_name from public.umkm_banks
        where umkm_id = old.umkm_id
        order by is_primary desc, created_at asc
        limit 1
      ),
      bank_account = (
        select bank_account from public.umkm_banks
        where umkm_id = old.umkm_id
        order by is_primary desc, created_at asc
        limit 1
      ),
      bank_holder = (
        select bank_holder from public.umkm_banks
        where umkm_id = old.umkm_id
        order by is_primary desc, created_at asc
        limit 1
      ),
      updated_at = now()
    where id = old.umkm_id;
    return old;
  end if;

  -- INSERT or UPDATE — sync the primary (or newest) bank to profile
  update public.profiles
  set
    bank_name = new.bank_name,
    bank_account = new.bank_account,
    bank_holder = new.bank_holder,
    updated_at = now()
  where id = new.umkm_id
    and (
      new.is_primary = true
      or
      not exists (
        select 1 from public.umkm_banks
        where umkm_id = new.umkm_id and is_primary = true
      )
    );
  return new;
end;
$$;

create trigger trg_sync_primary_bank_to_profile
  after insert or update or delete on public.umkm_banks
  for each row execute function public.sync_primary_bank_to_profile();

-- 5. MIGRATE EXISTING DATA
-- Copy existing single bank data from profiles to umkm_banks
insert into public.umkm_banks (umkm_id, bank_name, bank_account, bank_holder, is_primary)
select
  id,
  bank_name,
  bank_account,
  bank_holder,
  true
from public.profiles
where bank_name is not null and bank_account is not null and bank_holder is not null
  and role = 'umkm'
  and not exists (
    select 1 from public.umkm_banks b where b.umkm_id = profiles.id
  );
