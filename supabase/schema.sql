-- PrintingIQ database schema for Supabase (Postgres).
-- Run in Supabase dashboard → SQL Editor.

-- Vendors: one row per signed-in seller (id = auth user id)
create table if not exists public.vendors (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  city text not null,
  phone text not null,
  verified boolean not null default false,   -- set by admins only
  created_at timestamptz not null default now()
);

-- Products. Text that needs translation is stored as {"en": "...", "ar": "...", "ckb": "..."}
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  category_id text not null,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price numeric,                               -- null = "ask for price"
  currency text not null default 'IQD' check (currency in ('IQD','USD')),
  unit text not null default 'piece',
  min_order integer,
  colors jsonb not null default '[]'::jsonb,   -- [{ "hex": "#D7262E", "name": {en,ar,ckb} }]
  thickness text[] not null default '{}',
  sizes text[] not null default '{}',
  brand text,
  origin text,
  sku text,                                    -- vendor's product code
  stock_qty integer,                           -- units on hand (optional)
  availability text not null default 'in_stock' check (availability in ('in_stock','out_of_stock','custom_order')),
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id, created_at desc);
create index if not exists products_vendor_idx on public.products (vendor_id);
-- Search across all three languages
create index if not exists products_name_search_idx on public.products
  using gin (to_tsvector('simple', coalesce(name->>'en','') || ' ' || coalesce(name->>'ar','') || ' ' || coalesce(name->>'ckb','')));

-- Row Level Security: everyone can browse, vendors can only change their own data
alter table public.vendors enable row level security;
alter table public.products enable row level security;

drop policy if exists "vendors readable" on public.vendors;
create policy "vendors readable" on public.vendors for select using (true);
drop policy if exists "vendor inserts self" on public.vendors;
create policy "vendor inserts self" on public.vendors for insert with check (auth.uid() = id and verified = false);
drop policy if exists "vendor updates self" on public.vendors;
create policy "vendor updates self" on public.vendors for update using (auth.uid() = id)
  with check (auth.uid() = id and verified = (select v.verified from public.vendors v where v.id = auth.uid()));

drop policy if exists "products readable" on public.products;
create policy "products readable" on public.products for select using (true);
drop policy if exists "vendor manages own products" on public.products;
create policy "vendor manages own products" on public.products for all
  using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);

-- Image storage bucket (public read, owners write into their own folder)
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;
drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "vendors upload own images" on storage.objects;
create policy "vendors upload own images" on storage.objects for insert
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "vendors delete own images" on storage.objects;
create policy "vendors delete own images" on storage.objects for delete
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
