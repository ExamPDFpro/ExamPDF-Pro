-- Phase F (additive only: 1 new table + 2 new functions; nothing existing is changed).
-- Free Web Push: a visitor who taps "Get notifications" saves their browser's push address here.
-- Nobody can read the table except the main admin (the send function uses the server key). Visitors only use the two functions below.
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh     text not null check (char_length(p256dh) between 20 and 200),
  auth       text not null check (char_length(auth) between 8 and 100),
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "main admin reads push subscriptions" on public.push_subscriptions;
create policy "main admin reads push subscriptions" on public.push_subscriptions for select to authenticated using (public.is_admin());
revoke all on public.push_subscriptions from anon;

create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_endpoint,'') !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'invalid endpoint'; end if;
  if char_length(coalesce(p_p256dh,'')) not between 20 and 200 or char_length(coalesce(p_auth,'')) not between 8 and 100 then raise exception 'invalid keys'; end if;
  if (select count(*) from public.push_subscriptions where created_at > now() - interval '1 hour') >= 500 then raise exception 'rate_limited'; end if;
  insert into public.push_subscriptions(endpoint, p256dh, auth, user_id) values (p_endpoint, p_p256dh, p_auth, auth.uid())
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, user_id = coalesce(excluded.user_id, public.push_subscriptions.user_id);
end $$;
create or replace function public.push_unsubscribe(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin delete from public.push_subscriptions where endpoint = p_endpoint; end $$;
revoke all on function public.push_subscribe(text,text,text) from public;
revoke all on function public.push_unsubscribe(text) from public;
grant execute on function public.push_subscribe(text,text,text) to anon, authenticated;
grant execute on function public.push_unsubscribe(text) to anon, authenticated;
-- ROLLBACK (nothing else depends on it): drop function if exists public.push_subscribe(text,text,text); drop function if exists public.push_unsubscribe(text); drop table if exists public.push_subscriptions;
