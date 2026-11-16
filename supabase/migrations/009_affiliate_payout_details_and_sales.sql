-- Phase A (additive only: 1 new table + 1 new function; no existing table, column, policy or function is changed).
--
-- 1) affiliate_payout_details: the affiliate's own UPI / bank details.
--    Kept in its OWN table (not in `affiliates`) because sub-admins can read `affiliates`;
--    here only the main admin (with 2FA when enabled) can read or write. Other affiliates never can.
-- 2) admin_affiliate_sales(): one row per affiliate-attributed order, with the customer's UTR and the affiliate's payout details.
--    Main admin only: the customer UTR is never exposed to sub-admins.
--
-- NOTE: this table is deliberately NOT attached to the activity-log trigger, because that trigger copies whole rows
--       (it would copy bank numbers into the log).

create table if not exists public.affiliate_payout_details (
  affiliate_id   uuid primary key references public.affiliates(id) on delete cascade,
  upi_id         text check (upi_id is null or upi_id ~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z0-9.-]{2,32}$'),
  bank_name      text check (bank_name is null or char_length(bank_name) <= 80),
  account_name   text check (account_name is null or char_length(account_name) <= 80),
  account_number text check (account_number is null or account_number ~ '^[0-9A-Za-z -]{4,40}$'),
  ifsc           text check (ifsc is null or ifsc ~* '^[A-Z]{4}0[A-Z0-9]{6}$'),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id)
);
alter table public.affiliate_payout_details enable row level security;
drop policy if exists "main admin manages payout details" on public.affiliate_payout_details;
create policy "main admin manages payout details" on public.affiliate_payout_details
  for all to authenticated
  using (public.is_admin() and public.mfa_ok())
  with check (public.is_admin() and public.mfa_ok());
revoke all on public.affiliate_payout_details from anon;

create or replace function public.admin_affiliate_sales()
returns table(
  o_id uuid, o_created timestamptz, aff_id uuid, aff_name text, pdfs text,
  total numeric, pct numeric, commission numeric, commission_state text, order_state text,
  utr text, coupon text, pay_upi text, pay_bank text, pay_acname text, pay_acno text, pay_ifsc text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_admin() and public.mfa_ok()) then raise exception 'not allowed'; end if;
  return query
  select o.id, o.created_at, a.id, a.name,
         (select string_agg(p.title, ', ' order by p.title) from public.order_items oi join public.pdf_products p on p.id = oi.product_id where oi.order_id = o.id),
         o.total, o.commission_pct, o.commission_amount, o.commission_status, o.status,
         (select pay.payment_reference from public.payments pay where pay.order_id = o.id limit 1),
         o.coupon_code, d.upi_id, d.bank_name, d.account_name, d.account_number, d.ifsc
  from public.orders o
  join public.affiliates a on a.id = o.affiliate_id
  left join public.affiliate_payout_details d on d.affiliate_id = a.id
  order by o.created_at desc
  limit 500;
end $$;
revoke all on function public.admin_affiliate_sales() from public, anon;
grant execute on function public.admin_affiliate_sales() to authenticated;

-- ROLLBACK (only if ever needed; export the payout details first):
--   drop function if exists public.admin_affiliate_sales();
--   drop table if exists public.affiliate_payout_details;
