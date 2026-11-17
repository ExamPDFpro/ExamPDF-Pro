-- Phase C (additive only: 1 new table + 1 new function; nothing existing is changed).
-- Customers can ask for a callback. Only the main admin can read / manage the requests (phone numbers are personal data).
-- Not attached to the activity-log trigger (it would copy phone numbers into the log).
create table if not exists public.callback_requests (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 80),
  phone      text not null check (phone ~ '^\+?[0-9][0-9 ()-]{6,18}$'),
  note       text check (note is null or char_length(note) <= 300),
  status     text not null default 'new' check (status in ('new','called','closed')),
  user_id    uuid references auth.users(id) on delete set null
);
create index if not exists callback_requests_created_idx on public.callback_requests (created_at desc);
alter table public.callback_requests enable row level security;
drop policy if exists "main admin manages callbacks" on public.callback_requests;
create policy "main admin manages callbacks" on public.callback_requests
  for all to authenticated using (public.is_admin() and public.mfa_ok()) with check (public.is_admin() and public.mfa_ok());
revoke all on public.callback_requests from anon;

create or replace function public.request_callback(p_name text, p_phone text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare ph text := btrim(coalesce(p_phone,''));
begin
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 80 then raise exception 'invalid name'; end if;
  if ph !~ '^\+?[0-9][0-9 ()-]{6,18}$' then raise exception 'invalid phone'; end if;
  if (select count(*) from public.callback_requests where phone = ph and created_at > now() - interval '1 hour') >= 3 then raise exception 'rate_limited'; end if;
  if (select count(*) from public.callback_requests where created_at > now() - interval '1 hour') >= 60 then raise exception 'rate_limited'; end if;
  insert into public.callback_requests(name, phone, note, user_id)
  values (btrim(p_name), ph, nullif(left(btrim(coalesce(p_note,'')), 300), ''), auth.uid());
end $$;
revoke all on function public.request_callback(text,text,text) from public;
grant execute on function public.request_callback(text,text,text) to anon, authenticated;

-- ROLLBACK (export the requests first): drop function if exists public.request_callback(text,text,text); drop table if exists public.callback_requests;
