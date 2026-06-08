-- ============================================================
-- Backfill: Beri poin untuk pembayaran yang sudah confirmed
-- tapi belum menghasilkan poin (sebelum fitur poin ditambahkan)
-- ============================================================

with eligible_payments as (
  select distinct on (pc.order_id)
    pc.id as payment_id,
    pc.order_id,
    o.umkm_id,
    o.requested_liters,
    floor(o.requested_liters * 10) as points
  from payment_confirmations pc
  join orders o on o.id = pc.order_id
  where pc.status in ('confirmed', 'paid')
    and pc.order_id is not null
    and o.umkm_id is not null
    and o.requested_liters > 0
    -- Skip if points already earned for this user+order combo
    and not exists (
      select 1 from point_earnings pe
      where pe.user_id = o.umkm_id
        and pe.description like '%' || o.id::text || '%'
    )
)
-- 1. Insert ke point_earnings
insert into point_earnings (user_id, points, source, description, created_at)
select
  umkm_id,
  points,
  'transaction',
  'Backfill: ' || points || ' poin dari ' || requested_liters || 'L — order #' || order_id::text,
  now()
from eligible_payments;

-- 2. Update credit_coupons balance
with earned as (
  select
    umkm_id,
    sum(points) as total_points
  from (
    select distinct on (pc.order_id)
      o.umkm_id,
      floor(o.requested_liters * 10) as points
    from payment_confirmations pc
    join orders o on o.id = pc.order_id
    where pc.status in ('confirmed', 'paid')
      and pc.order_id is not null
      and o.umkm_id is not null
      and o.requested_liters > 0
      and not exists (
        select 1 from point_earnings pe
        where pe.user_id = o.umkm_id
          and pe.description like '%' || o.id::text || '%'
      )
  ) sub
  group by umkm_id
)
insert into credit_coupons (user_id, balance, lifetime_earned)
select
  umkm_id,
  total_points,
  total_points
from earned
on conflict (user_id)
do update set
  balance = credit_coupons.balance + excluded.balance,
  lifetime_earned = credit_coupons.lifetime_earned + excluded.lifetime_earned,
  updated_at = now();

-- Tampilkan hasil
select
  count(*) as total_payments_diprocess,
  sum(points) as total_poin_diberikan
from (
  select distinct on (pc.order_id)
    floor(o.requested_liters * 10) as points
  from payment_confirmations pc
  join orders o on o.id = pc.order_id
  where pc.status in ('confirmed', 'paid')
    and pc.order_id is not null
    and o.umkm_id is not null
    and o.requested_liters > 0
    and not exists (
      select 1 from point_earnings pe
      where pe.user_id = o.umkm_id
        and pe.description like '%' || o.id::text || '%'
    )
) sub;
