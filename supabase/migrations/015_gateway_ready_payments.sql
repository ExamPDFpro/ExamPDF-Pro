-- Phase G (additive only): makes payments READY for an automatic gateway later. No gateway is enabled. Manual UTR flow is untouched.
-- Existing columns, constraints, functions and rows are not changed (new columns get safe defaults: method='manual').
alter table public.payments add column if not exists method          text not null default 'manual';
alter table public.payments add column if not exists gateway_provider text;
alter table public.payments add column if not exists transaction_id   text;
alter table public.payments add column if not exists gateway_status    text;
alter table public.payments add column if not exists amount_paid       numeric;
alter table public.payments add column if not exists paid_at           timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='payments_method_check') then
    alter table public.payments add constraint payments_method_check check (method in ('manual','gateway'));
  end if;
end $$;
-- One gateway transaction can only ever belong to ONE payment (stops double approval by replayed webhooks).
create unique index if not exists payments_gateway_txn_key on public.payments (gateway_provider, transaction_id) where transaction_id is not null;

-- Webhook log: every gateway event is stored once (event_id unique = replay protection). Main admin read only; written by the server only.
create table if not exists public.payment_gateway_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null, event_id text not null, order_id uuid, transaction_id text,
  amount numeric, signature_ok boolean not null default false, result text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);
alter table public.payment_gateway_events enable row level security;
drop policy if exists "main admin reads gateway events" on public.payment_gateway_events;
create policy "main admin reads gateway events" on public.payment_gateway_events for select to authenticated using (public.is_admin());
revoke all on public.payment_gateway_events from anon, authenticated; grant select on public.payment_gateway_events to authenticated;

-- Server-only approval for a verified gateway payment. The webhook function must verify the signature FIRST and pass p_signature_ok.
-- Checks: signature ok, event not seen before, order exists and is not refunded/cancelled, amount == order total, not already approved.
create or replace function public.gateway_confirm_payment(p_provider text, p_event_id text, p_order uuid, p_txn text, p_amount numeric, p_signature_ok boolean)
returns text language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; pay public.payments%rowtype; v_limit int; r text;
begin
  insert into public.payment_gateway_events(provider,event_id,order_id,transaction_id,amount,signature_ok) values (p_provider,p_event_id,p_order,p_txn,p_amount,coalesce(p_signature_ok,false)) on conflict (provider,event_id) do nothing;
  if not found then return 'duplicate_event'; end if;
  <<blk>> begin
  if not coalesce(p_signature_ok,false) then r := 'bad_signature'; exit blk; end if;
  select * into o from public.orders where id=p_order for update;
  if o.id is null then r := 'order_not_found'; exit blk; end if;
  if o.status in ('refunded','cancelled') then r := 'order_closed'; exit blk; end if;
  if o.status = 'approved' then r := 'already_approved'; exit blk; end if;
  if p_amount is distinct from o.total then r := 'amount_mismatch'; exit blk; end if;
  select * into pay from public.payments where order_id=p_order for update;
  if pay.id is null then r := 'payment_not_found'; exit blk; end if;
  if exists (select 1 from public.payments where gateway_provider=p_provider and transaction_id=p_txn and id<>pay.id) then r := 'txn_reused'; exit blk; end if;
  update public.payments set status='approved', method='gateway', gateway_provider=p_provider, transaction_id=p_txn, gateway_status='paid', amount_paid=p_amount, paid_at=now(), reviewed_at=now() where id=pay.id;
  update public.orders set status='approved' where id=p_order;
  select coalesce((select (value->>'download_limit')::int from public.website_settings where key='security'),5) into v_limit;
  insert into public.purchases(user_id,product_id,order_id,download_limit) select o.user_id,product_id,p_order,v_limit from public.order_items where order_id=p_order on conflict (user_id,product_id) do nothing;
  if o.affiliate_id is not null and o.commission_status='none' and coalesce(o.commission_pct,0)>0 then
    update public.orders set commission_amount=round(o.total*o.commission_pct/100,2), commission_status='earned' where id=p_order;
  end if;
  r := 'approved';
  end;
  update public.payment_gateway_events set result=r where provider=p_provider and event_id=p_event_id;
  return r;
end $$;
revoke all on function public.gateway_confirm_payment(text,text,uuid,text,numeric,boolean) from public, anon, authenticated;
grant execute on function public.gateway_confirm_payment(text,text,uuid,text,numeric,boolean) to service_role;
-- ROLLBACK: drop function public.gateway_confirm_payment(text,text,uuid,text,numeric,boolean); drop table public.payment_gateway_events; drop index public.payments_gateway_txn_key; alter table public.payments drop constraint payments_method_check, drop column method, drop column gateway_provider, drop column transaction_id, drop column gateway_status, drop column amount_paid, drop column paid_at;
