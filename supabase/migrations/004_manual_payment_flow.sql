-- Best-selling products (used by the homepage). Returns only counts per published product.
create or replace function public.best_selling_products(p_limit int default 8)
returns table(product_id uuid, sales bigint)
language sql stable security definer set search_path = public as $$
  select pu.product_id, count(*)::bigint
  from public.purchases pu
  join public.pdf_products p on p.id = pu.product_id and p.is_published and p.is_active
  group by pu.product_id order by count(*) desc limit greatest(p_limit, 0);
$$;
grant execute on function public.best_selling_products(int) to anon, authenticated;

-- Admin approves / rejects a submitted manual payment. Approval grants the purchases.
create or replace function public.admin_decide_payment(p_payment_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_user uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select order_id, user_id into v_order, v_user from public.payments where id = p_payment_id for update;
  if v_order is null then raise exception 'payment not found'; end if;
  update public.payments set status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = auth.uid(), reviewed_at = now() where id = p_payment_id;
  update public.orders set status = case when p_approve then 'approved' else 'rejected' end where id = v_order;
  if p_approve then
    insert into public.purchases(user_id, product_id, order_id)
    select v_user, product_id, v_order from public.order_items where order_id = v_order
    on conflict (user_id, product_id) do nothing;
  end if;
end $$;
revoke all on function public.admin_decide_payment(uuid, boolean) from public, anon;
grant execute on function public.admin_decide_payment(uuid, boolean) to authenticated;

-- Default payment instructions shown at checkout (editable from Admin > Settings).
insert into public.website_settings(key, value) values
 ('payment', '{"upi_id":"","payee_name":"","qr_url":"","bank_name":"","account_name":"","account_number":"","ifsc":"","note":""}'::jsonb)
on conflict (key) do nothing;
