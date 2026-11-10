-- ExamPDF Pro: admin upload permissions + private full-PDF path hardening.
-- Apply after 001_schema.sql in the Supabase SQL Editor.

-- Move legacy full PDF paths out of the publicly-readable catalogue table.
insert into public.pdf_secure_files(product_id, storage_path)
select id, full_pdf_path
from public.pdf_products
where full_pdf_path is not null and length(trim(full_pdf_path)) > 0
on conflict (product_id) do update set storage_path = excluded.storage_path;

alter table public.pdf_products drop column if exists full_pdf_path;

-- Admins may upload/manage website assets. Customers can still read only the
-- public covers/previews bucket objects covered by the existing public policy.
drop policy if exists "admin uploads website assets" on storage.objects;
create policy "admin uploads website assets"
on storage.objects for insert to authenticated
with check (public.is_admin() and bucket_id in ('covers','pdf-previews','paid-pdfs'));

drop policy if exists "admin updates website assets" on storage.objects;
create policy "admin updates website assets"
on storage.objects for update to authenticated
using (public.is_admin() and bucket_id in ('covers','pdf-previews','paid-pdfs'))
with check (public.is_admin() and bucket_id in ('covers','pdf-previews','paid-pdfs'));

drop policy if exists "admin deletes website assets" on storage.objects;
create policy "admin deletes website assets"
on storage.objects for delete to authenticated
using (public.is_admin() and bucket_id in ('covers','pdf-previews','paid-pdfs'));

-- Private paid PDFs remain unreadable by customers. Only an authenticated
-- active admin may read them in the dashboard; customer download must use
-- a purchase-checking Edge Function that issues a short-lived signed URL.
drop policy if exists "admin reads paid pdfs" on storage.objects;
create policy "admin reads paid pdfs"
on storage.objects for select to authenticated
using (bucket_id = 'paid-pdfs' and public.is_admin());

-- The secure-path table is never public-readable.
alter table public.pdf_secure_files enable row level security;
drop policy if exists "admin manages secure file paths" on public.pdf_secure_files;
create policy "admin manages secure file paths"
on public.pdf_secure_files for all to authenticated
using (public.is_admin()) with check (public.is_admin());
