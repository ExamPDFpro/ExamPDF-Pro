-- ExamPDF Pro baseline schema. Review and run in a NEW Supabase project only.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text, role text not null default 'customer' check (role in ('customer','admin')),
 is_disabled boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.exam_categories (
 id uuid primary key default gen_random_uuid(), name text not null, image_url text,
 sort_order int not null default 0, is_hidden boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.pdf_products (
 id uuid primary key default gen_random_uuid(), title text not null, description text,
 category_id uuid references public.exam_categories(id), selling_price numeric(10,2) not null check(selling_price>=0),
 original_price numeric(10,2) not null default 0 check(original_price>=0), cover_url text,
 preview_enabled boolean not null default false, preview_pdf_path text, full_pdf_path text not null,
 is_featured boolean not null default false, featured_order int not null default 0,
 is_active boolean not null default true, is_published boolean not null default false,
 created_at timestamptz not null default now()
);
-- Full file paths are stored separately so public catalogue reads cannot reveal them.
create table if not exists public.pdf_secure_files (
 product_id uuid primary key references public.pdf_products(id) on delete cascade,
 storage_path text not null unique, created_at timestamptz not null default now()
);
create table if not exists public.website_settings (key text primary key, value jsonb not null default '{}'::jsonb);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 total numeric(10,2) not null check(total>=0), status text not null default 'awaiting_payment' check(status in ('awaiting_payment','payment_submitted','approved','rejected','cancelled')),
 created_at timestamptz not null default now()
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid not null references public.pdf_products(id), unit_price numeric(10,2) not null check(unit_price>=0), unique(order_id,product_id)
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), user_id uuid not null references auth.users(id),
 payment_reference text not null, proof_path text not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz, created_at timestamptz not null default now(), unique(order_id)
);
create table if not exists public.purchases (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 product_id uuid not null references public.pdf_products(id), order_id uuid not null references public.orders(id),
 created_at timestamptz not null default now(), unique(user_id,product_id)
);
create table if not exists public.download_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), product_id uuid not null references public.pdf_products(id), created_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.is_disabled=false); $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,email) values(new.id,new.email) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.exam_categories enable row level security;
alter table public.pdf_products enable row level security;
alter table public.pdf_secure_files enable row level security;
alter table public.website_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.purchases enable row level security;
alter table public.download_logs enable row level security;
create policy "profile self or admin read" on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy "public categories visible" on public.exam_categories for select using(is_hidden=false or public.is_admin());
create policy "public published products" on public.pdf_products for select using((is_published=true and is_active=true) or public.is_admin());
create policy "public website settings read" on public.website_settings for select using(true);
create policy "admin manages profiles" on public.profiles for update using(public.is_admin()) with check(public.is_admin());
create policy "admin manages categories" on public.exam_categories for all using(public.is_admin()) with check(public.is_admin());
create policy "admin manages products" on public.pdf_products for all using(public.is_admin()) with check(public.is_admin());
create policy "admin manages secure file paths" on public.pdf_secure_files for all using(public.is_admin()) with check(public.is_admin());
create policy "admin manages settings" on public.website_settings for all using(public.is_admin()) with check(public.is_admin());
create policy "customer reads own orders" on public.orders for select using(user_id=auth.uid() or public.is_admin());
create policy "customer reads own order items" on public.order_items for select using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
create policy "customer reads own payments" on public.payments for select using(user_id=auth.uid() or public.is_admin());
create policy "customer reads own purchases" on public.purchases for select using(user_id=auth.uid() or public.is_admin());
create policy "admin reads download logs" on public.download_logs for select using(public.is_admin());
-- Intentionally no client INSERT/UPDATE/DELETE policies for orders, payments, purchases, or download_logs.
-- Trusted Edge Functions using service role must create orders, accept proofs, approve payments and issue downloads.
insert into storage.buckets(id,name,public) values
 ('pdf-previews','pdf-previews',true),('paid-pdfs','paid-pdfs',false),('payment-proofs','payment-proofs',false),('covers','covers',true)
on conflict(id) do nothing;
create policy "public reads previews" on storage.objects for select using(bucket_id='pdf-previews' or bucket_id='covers');
create policy "customer uploads own payment proof" on storage.objects for insert to authenticated with check(bucket_id='payment-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "admin reads payment proof" on storage.objects for select to authenticated using(bucket_id='payment-proofs' and public.is_admin());
-- No client read policy for paid-pdfs. Full files must only be served by a purchase-checking Edge Function.
