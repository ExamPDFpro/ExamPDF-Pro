-- Phase E (additive only: 1 new function; no table, column or policy is changed).
-- admin_pdf_security_report(): main admin only. Shows
--   suspicious: customers with 3+ different IP addresses or 8+ downloads in the last 24 hours (possible link sharing)
--   previews:   files in the PUBLIC preview folder that look like a full PDF (3 MB or more, or at least half the size of the paid file)
create or replace function public.admin_pdf_security_report()
returns jsonb
language plpgsql stable security definer set search_path = public, storage, auth as $$
begin
  if not (public.is_admin() and public.mfa_ok()) then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'suspicious', coalesce((select jsonb_agg(x) from (
        select u.email, p.title, count(*) as downloads, count(distinct d.ip) as ips, max(d.created_at) as last_at,
               case when count(distinct d.ip) >= 3 then 'many_ips' else 'many_downloads' end as reason
        from public.download_logs d
        left join auth.users u on u.id = d.user_id
        left join public.pdf_products p on p.id = d.product_id
        where d.created_at > now() - interval '24 hours'
        group by d.user_id, u.email, d.product_id, p.title
        having count(distinct d.ip) >= 3 or count(*) >= 8
        order by max(d.created_at) desc limit 50) x), '[]'::jsonb),
    'previews', coalesce((select jsonb_agg(y) from (
        select o.name, (o.metadata->>'size')::bigint as size,
               case when (o.metadata->>'size')::bigint >= 3145728 then 'big' else 'close_to_full' end as reason
        from storage.objects o
        where o.bucket_id = 'pdf-previews' and (
          (o.metadata->>'size')::bigint >= 3145728
          or exists (select 1 from public.pdf_products pr
                     join public.pdf_secure_files sf on sf.product_id = pr.id
                     join storage.objects f on f.bucket_id = 'paid-pdfs' and f.name = sf.storage_path
                     where pr.preview_pdf_path = o.name and (o.metadata->>'size')::bigint >= 0.5 * (f.metadata->>'size')::bigint))
        order by o.created_at desc limit 50) y), '[]'::jsonb)
  );
end $$;
revoke all on function public.admin_pdf_security_report() from public, anon;
grant execute on function public.admin_pdf_security_report() to authenticated;
-- ROLLBACK: drop function if exists public.admin_pdf_security_report();
