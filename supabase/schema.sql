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

-- ═════════════ Quote requests: a customer describes a job, vendors send offers ═════════════
-- Customers have no account: create_quote_request() returns a private token, and only someone with that token
-- can read the offers (get_quote_request) or close the request. The token lives in its own table that nobody
-- can read directly, so vendors (and live updates) never see it.
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  category_id text,
  description text not null check (length(description) between 3 and 3000),
  quantity text check (length(quantity) <= 200),
  city text not null,
  files jsonb not null default '[]'::jsonb,       -- [{ "url", "name", "type" }]
  customer_name text not null check (length(customer_name) between 1 and 120),
  customer_phone text not null check (length(customer_phone) between 5 and 30),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create index if not exists quote_requests_open_idx on public.quote_requests (status, created_at desc);

create table if not exists public.quote_request_secrets (
  request_id uuid primary key references public.quote_requests(id) on delete cascade,
  token uuid not null default gen_random_uuid()
);

create table if not exists public.quote_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  price numeric,
  currency text not null default 'IQD' check (currency in ('IQD','USD')),
  note text check (length(note) <= 1000),
  days integer,
  created_at timestamptz not null default now(),
  unique (request_id, vendor_id)
);

alter table public.quote_requests enable row level security;
alter table public.quote_request_secrets enable row level security;  -- no policies: only the functions below read it
alter table public.quote_offers enable row level security;

-- Vendors (anyone with a shop) see open requests, including the customer's phone, so they can reply
drop policy if exists "vendors read requests" on public.quote_requests;
create policy "vendors read requests" on public.quote_requests for select
  using (exists (select 1 from public.vendors v where v.id = auth.uid()));

-- Each vendor sends, edits and reads only their own offer
drop policy if exists "vendor manages own offers" on public.quote_offers;
create policy "vendor manages own offers" on public.quote_offers for all
  using (auth.uid() = vendor_id)
  with check (auth.uid() = vendor_id and exists (select 1 from public.quote_requests r where r.id = request_id and r.status = 'open'));

create or replace function public.create_quote_request(
  p_group_id text, p_category_id text, p_description text, p_quantity text, p_city text, p_files jsonb,
  p_customer_name text, p_customer_phone text
) returns json language plpgsql security definer set search_path = public as $$
declare rid uuid; tok uuid;
begin
  if jsonb_array_length(coalesce(p_files, '[]'::jsonb)) > 6 then raise exception 'too many files'; end if;
  insert into quote_requests (group_id, category_id, description, quantity, city, files, customer_name, customer_phone)
    values (p_group_id, p_category_id, p_description, p_quantity, p_city, coalesce(p_files, '[]'::jsonb), p_customer_name, p_customer_phone)
    returning id into rid;
  insert into quote_request_secrets (request_id) values (rid) returning token into tok;
  return json_build_object('id', rid, 'token', tok);
end $$;

create or replace function public.get_quote_request(p_id uuid, p_token uuid)
returns json language sql security definer set search_path = public stable as $$
  select json_build_object(
    'request', to_json(r),
    'offers', coalesce((select json_agg(o order by o.created_at) from quote_offers o where o.request_id = r.id), '[]'::json))
  from quote_requests r join quote_request_secrets s on s.request_id = r.id
  where r.id = p_id and s.token = p_token
$$;

create or replace function public.close_quote_request(p_id uuid, p_token uuid)
returns void language sql security definer set search_path = public as $$
  update quote_requests r set status = 'closed'
  from quote_request_secrets s where s.request_id = r.id and r.id = p_id and s.token = p_token
$$;

grant execute on function public.create_quote_request(text, text, text, text, text, jsonb, text, text) to anon, authenticated;
grant execute on function public.get_quote_request(uuid, uuid) to anon, authenticated;
grant execute on function public.close_quote_request(uuid, uuid) to anon, authenticated;

-- New requests appear live in vendors' dashboards
do $$ begin
  alter publication supabase_realtime add table public.quote_requests;
exception when duplicate_object then null; end $$;

-- Customers' design files (images and PDFs up to 10 MB), uploaded without an account into requests/
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('request-files', 'request-files', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
  on conflict (id) do nothing;
drop policy if exists "request files public read" on storage.objects;
create policy "request files public read" on storage.objects for select using (bucket_id = 'request-files');
drop policy if exists "anyone uploads request files" on storage.objects;
create policy "anyone uploads request files" on storage.objects for insert
  with check (bucket_id = 'request-files' and (storage.foldername(name))[1] = 'requests');

-- ═════════════ AI helper usage (supabase/functions/ai-assist): calls per vendor per day, for the daily limit ═════════════
create table if not exists public.ai_usage (
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (vendor_id, day)
);
alter table public.ai_usage enable row level security;  -- no policies: only the function (service role) reads and writes it

-- ═════════════ Shop links: vendors ask PrintingIQ to import their shop, or claim an imported one ═════════════
-- An admin approves each row in the Supabase table editor (status = 'approved'); the daily sync
-- (scripts/sync/linked.py, with the service-role key in GitHub secrets) then imports it and writes back the result.
create table if not exists public.shop_links (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  kind text not null check (kind in ('import','claim')),
  url text check (length(url) <= 500),
  source_id text,                                 -- for claims: the imported shop's id (e.g. 'toolmart')
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  last_result text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.shop_links enable row level security;
drop policy if exists "vendor reads own links" on public.shop_links;
create policy "vendor reads own links" on public.shop_links for select using (auth.uid() = vendor_id);
drop policy if exists "vendor adds links" on public.shop_links;
create policy "vendor adds links" on public.shop_links for insert
  with check (auth.uid() = vendor_id and status = 'pending' and last_result is null and synced_at is null);
drop policy if exists "vendor removes own links" on public.shop_links;
create policy "vendor removes own links" on public.shop_links for delete using (auth.uid() = vendor_id);

-- ═════════════ Ratings: a customer who contacted a vendor through PrintingIQ rates them (one rating per inquiry) ═════════════
-- add_review() checks the inquiry exists and was sent from the same phone number, so ratings can't be made up.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text check (length(comment) <= 1000),
  customer_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists reviews_vendor_idx on public.reviews (vendor_id, created_at desc);
alter table public.reviews enable row level security;
drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews for select using (true);

create or replace view public.vendor_ratings as
  select vendor_id, round(avg(stars)::numeric, 2) as avg, count(*)::int as count from public.reviews group by vendor_id;
grant select on public.vendor_ratings to anon, authenticated;

create or replace function public.add_review(p_lead_id uuid, p_phone text, p_stars int, p_comment text)
returns void language plpgsql security definer set search_path = public as $$
declare l leads%rowtype;
begin
  select * into l from leads where id = p_lead_id
    and regexp_replace(customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
    and created_at > now() - interval '120 days';
  if not found then raise exception 'inquiry not found'; end if;
  insert into reviews (vendor_id, lead_id, stars, comment, customer_name)
    values (l.vendor_id, l.id, p_stars, nullif(trim(p_comment), ''), l.customer_name)
    on conflict (lead_id) do nothing;
end $$;
grant execute on function public.add_review(uuid, text, int, text) to anon, authenticated;
