-- Affiliate login fix (additive only: 1 new index + 1 new function; no table, column, policy or existing function is changed).
-- Cause found: the second affiliate was saved with the email "royddeny365@gmail.com" (two d) but the person logs in as "roydeny365@gmail.com",
-- so the automatic email match never linked them. Linking must not depend on typing the email correctly, so staff can now link a login explicitly.
--
-- 1) One login can belong to at most ONE affiliate (database-level guarantee; the dashboard can never pick the wrong record).
-- 2) admin_link_affiliate(): main admin or sub-admin links an affiliate record to a VERIFIED login account (by the login's email) or unlinks it.
create unique index if not exists affiliates_user_id_key on public.affiliates (user_id) where user_id is not null;

create or replace function public.admin_link_affiliate(p_affiliate uuid, p_login_email text)
returns text
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid; em text := lower(btrim(coalesce(p_login_email, '')));
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.affiliates where id = p_affiliate) then raise exception 'affiliate not found'; end if;
  if em = '' then update public.affiliates set user_id = null where id = p_affiliate; return 'unlinked'; end if;
  select id into uid from auth.users where lower(email) = em and email_confirmed_at is not null;
  if uid is null then raise exception 'no_verified_user'; end if;
  if exists (select 1 from public.affiliates where user_id = uid and id <> p_affiliate) then raise exception 'already_linked_to_other'; end if;
  update public.affiliates set user_id = uid where id = p_affiliate;
  return 'linked';
end $$;
revoke all on function public.admin_link_affiliate(uuid, text) from public, anon;
grant execute on function public.admin_link_affiliate(uuid, text) to authenticated;
-- ROLLBACK: drop function if exists public.admin_link_affiliate(uuid,text); drop index if exists public.affiliates_user_id_key;
