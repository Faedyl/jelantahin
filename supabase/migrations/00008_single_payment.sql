-- ============================================================
-- jelantahin — Enforce single payment per order
-- Prevents multiple confirmed/paid payments for the same order
-- ============================================================

-- First, clean up any existing duplicates: keep only the latest
-- non-rejected payment per order_id
delete from public.payment_confirmations
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by order_id
        order by created_at desc
      ) as rn
    from public.payment_confirmations
    where order_id is not null
      and status != 'rejected'
  ) dup
  where dup.rn > 1
);

-- Partial unique index: only one non-rejected payment per order
create unique index if not exists idx_payment_confirmations_unique_order
  on public.payment_confirmations(order_id)
  where status != 'rejected';
