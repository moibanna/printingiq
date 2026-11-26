-- PrintingIQ database schema for Supabase (Postgres).
-- Run in Supabase dashboard → SQL Editor. Safe to run again (it only adds what is missing).

-- ───────────── Vendors: one row per signed-in seller (id = auth user id)
create table if not exists public.vendors (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  city text not null,
  phone text not null,
  whatsapp text,
  email text,
  about text,
  verified boolean not null default false,   -- set by admins only
  created_at timestamptz not null default now()
);
alter table public.vendors add column if not exists whatsapp text;
alter table public.vendors add column if not exists email text;
alter table public.vendors add column if not exists about text;

-- ───────────── Products. Text that needs translation is stored as {"en": "...", "ar": "...", "ckb": "..."}
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
-- Standard item (src/lib/standards.ts) the product is, for price comparison across vendors
alter table public.products add column if not exists template_id text;
create index if not exists products_template_idx on public.products (template_id) where template_id is not null;
create index if not exists products_category_idx on public.products (category_id, created_at desc);
create index if not exists products_vendor_idx on public.products (vendor_id);

-- ───────────── Leads: a customer contacting a vendor through PrintingIQ (WhatsApp, call or quote list)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','call','quote')),
  customer_name text not null check (length(customer_name) between 1 and 120),
  customer_phone text not null check (length(customer_phone) between 5 and 30),
  message text check (length(message) <= 2000),
  items jsonb not null default '[]'::jsonb,    -- [{ productId, name, sku, qty }]
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists leads_vendor_idx on public.leads (vendor_id, created_at desc);

-- ───────────── Push tokens for vendors' phones (Expo push notifications)
create table if not exists public.push_tokens (
  token text primary key,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

-- ───────────── Row Level Security
alter table public.vendors enable row level security;
alter table public.products enable row level security;
alter table public.leads enable row level security;
alter table public.push_tokens enable row level security;

-- Vendors: public profiles; each vendor edits only their own and can't mark themselves verified
drop policy if exists "vendors readable" on public.vendors;
create policy "vendors readable" on public.vendors for select using (true);
drop policy if exists "vendor inserts self" on public.vendors;
create policy "vendor inserts self" on public.vendors for insert with check (auth.uid() = id and verified = false);
drop policy if exists "vendor updates self" on public.vendors;
create policy "vendor updates self" on public.vendors for update using (auth.uid() = id)
  with check (auth.uid() = id and verified = (select v.verified from public.vendors v where v.id = auth.uid()));

-- Products: everyone browses; vendors manage only their own
drop policy if exists "products readable" on public.products;
create policy "products readable" on public.products for select using (true);
drop policy if exists "vendor manages own products" on public.products;
create policy "vendor manages own products" on public.products for all
  using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);

-- Leads: any customer (no account) can send one; only that vendor can read it or mark it read
drop policy if exists "anyone can send a lead" on public.leads;
create policy "anyone can send a lead" on public.leads for insert with check (read_at is null);
drop policy if exists "vendor reads own leads" on public.leads;
create policy "vendor reads own leads" on public.leads for select using (auth.uid() = vendor_id);
drop policy if exists "vendor marks own leads" on public.leads;
create policy "vendor marks own leads" on public.leads for update using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);

-- Push tokens: a vendor registers their own devices
drop policy if exists "vendor manages own tokens" on public.push_tokens;
create policy "vendor manages own tokens" on public.push_tokens for all
  using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);

-- ───────────── Live inquiries in the vendor dashboard (Supabase Realtime)
do $$ begin
  alter publication supabase_realtime add table public.leads;
exception when duplicate_object then null; end $$;

-- ───────────── Image storage bucket (public read, owners write into their own folder)
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
