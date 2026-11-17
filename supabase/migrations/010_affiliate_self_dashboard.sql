-- Phase B (additive only: 2 new functions; no table, column, policy or existing function is changed).
--
-- An affiliate logs in with an ordinary account and sees ONLY their own numbers.
-- Both functions are SECURITY DEFINER and are keyed on auth.uid(): there is no id parameter, so one affiliate can never ask for another's data.
-- Customer names, emails and UTRs are never returned.
--
-- my_affiliate(): returns the dashboard as one JSON object, or {"linked":false}.
--   First call links the login to the affiliate record, ONLY when the login's CONFIRMED email equals the email the admin
--   registered for that active affiliate and the record is not yet linked (this sets affiliates.user_id; nothing else is touched).
-- my_affiliate_set_payout(): saves the affiliate's own UPI/bank details (same table and checks as Phase A).

create or replace function public.my_affiliate()
returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  a public.affiliates%rowtype;
  em text; confirmed boolean;
begin
  if uid is null then raise exception 'not allowed'; end if;
  select * into a from public.affiliates where user_id = uid limit 1;
  if not found then
    select lower(u.email), u.email_confirmed_at is not null into em, confirmed from auth.users u where u.id = uid;
    if em is null or not confirmed then return jsonb_build_object('linked', false); end if;
    update public.affiliates set user_id = uid
      where id = (select id from public.affiliates where user_id is null and status = 'active' and lower(email) = em order by created_at limit 1)
      returning * into a;
    if not found then return jsonb_build_object('linked', false); end if;
  end if;
  return jsonb_build_object(
    'linked', true, 'name', a.name, 'status', a.status, 'pct', a.commission_pct,
    'clicks',  (select count(*) from public.affiliate_clicks c where c.affiliate_id = a.id),
    'sales',   (select count(*) from public.orders o where o.affiliate_id = a.id and o.status = 'approved'),
    'sales_amount', (select coalesce(sum(o.total),0) from public.orders o where o.affiliate_id = a.id and o.status = 'approved'),
    'earned',  (select coalesce(sum(o.commission_amount),0) from public.orders o where o.affiliate_id = a.id and o.commission_status = 'earned'),
    'cancelled', (select coalesce(sum(o.commission_amount),0) from public.orders o where o.affiliate_id = a.id and o.commission_status = 'cancelled'),
    'paid',    (select coalesce(sum(p.amount),0) from public.affiliate_payouts p where p.affiliate_id = a.id),
    'pending', (select coalesce(sum(o.commission_amount),0) from public.orders o where o.affiliate_id = a.id and o.commission_status = 'earned')
               - (select coalesce(sum(p.amount),0) from public.affiliate_payouts p where p.affiliate_id = a.id),
    'links', coalesce((select jsonb_agg(jsonb_build_object('slug', l.slug, 'product', p.slug, 'active', l.is_active,
               'clicks', (select count(*) from public.affiliate_clicks c where c.link_id = l.id)) order by l.created_at)
               from public.affiliate_links l left join public.pdf_products p on p.id = l.product_id where l.affiliate_id = a.id), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(x order by x->>'date' desc) from (
               select jsonb_build_object('date', o.created_at, 'amount', o.total, 'commission', o.commission_amount, 'state', o.commission_status) x
               from public.orders o where o.affiliate_id = a.id and o.status = 'approved' order by o.created_at desc limit 50) s), '[]'::jsonb),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object('date', p.paid_at, 'amount', p.amount, 'method', p.method) order by p.paid_at desc)
               from public.affiliate_payouts p where p.affiliate_id = a.id), '[]'::jsonb),
    'payout', (select to_jsonb(d) - 'affiliate_id' - 'updated_by' - 'updated_at' from public.affiliate_payout_details d where d.affiliate_id = a.id)
  );
end $$;
revoke all on function public.my_affiliate() from public, anon;
grant execute on function public.my_affiliate() to authenticated;

create or replace function public.my_affiliate_set_payout(p_upi text, p_bank text, p_acname text, p_acno text, p_ifsc text)
returns void
language plpgsql security definer set search_path = public as $$
declare aid uuid;
begin
  select id into aid from public.affiliates where user_id = auth.uid() and status = 'active';
  if aid is null then raise exception 'not allowed'; end if;
  insert into public.affiliate_payout_details(affiliate_id, upi_id, bank_name, account_name, account_number, ifsc, updated_at, updated_by)
  values (aid, nullif(btrim(p_upi),''), nullif(btrim(p_bank),''), nullif(btrim(p_acname),''), nullif(btrim(p_acno),''), nullif(upper(btrim(p_ifsc)),''), now(), auth.uid())
  on conflict (affiliate_id) do update set upi_id = excluded.upi_id, bank_name = excluded.bank_name, account_name = excluded.account_name,
    account_number = excluded.account_number, ifsc = excluded.ifsc, updated_at = now(), updated_by = auth.uid();
end $$;
revoke all on function public.my_affiliate_set_payout(text,text,text,text,text) from public, anon;
grant execute on function public.my_affiliate_set_payout(text,text,text,text,text) to authenticated;

-- ROLLBACK: drop function if exists public.my_affiliate(); drop function if exists public.my_affiliate_set_payout(text,text,text,text,text);
--           (the only data it can have changed is affiliates.user_id; set it back to null if ever needed)
