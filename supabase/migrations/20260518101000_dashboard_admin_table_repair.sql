create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.data_packages (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  name text not null,
  amount text not null,
  cost_price numeric(12,2) not null check (cost_price >= 0),
  selling_price numeric(12,2) not null check (selling_price >= 0),
  validity text not null default 'Non-expiry',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network, name)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.data_packages(id) on delete restrict,
  phone text not null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','success','failed')),
  reference text unique,
  retry_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'bank_transfer',
  account_number text not null,
  account_name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_stores (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique,
  brand_name text not null,
  tagline text,
  description text,
  logo_url text,
  cover_url text,
  theme_color text not null default '#0ea5e9',
  contact_phone text,
  contact_email text,
  whatsapp_number text,
  allow_data boolean not null default true,
  allow_online_services boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_stores_slug_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.agent_store_packages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.agent_stores(id) on delete cascade,
  data_package_id uuid not null references public.data_packages(id) on delete cascade,
  selling_price numeric(12,2) not null check (selling_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, data_package_id)
);

create table if not exists public.agent_store_service_prices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.agent_stores(id) on delete cascade,
  service_id uuid not null references public.online_services(id) on delete cascade,
  selling_price numeric(12,2) not null check (selling_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, service_id)
);

create table if not exists public.agent_store_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.agent_stores(id) on delete cascade,
  item_type text not null check (item_type in ('data','service')),
  package_id uuid references public.data_packages(id) on delete set null,
  service_id uuid references public.online_services(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_note text,
  quantity integer not null default 1 check (quantity > 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  status text not null default 'pending' check (status in ('pending','accepted','declined','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_store_orders_item_chk check (
    (item_type = 'data' and package_id is not null and service_id is null)
    or (item_type = 'service' and service_id is not null and package_id is null)
  )
);

alter table if exists public.withdrawals add column if not exists payment_method text not null default 'bank_transfer';
alter table if exists public.withdrawals add column if not exists account_number text not null default '';
alter table if exists public.withdrawals add column if not exists account_name text not null default '';
alter table if exists public.withdrawals add column if not exists requested_at timestamptz not null default now();
alter table if exists public.withdrawals add column if not exists updated_at timestamptz not null default now();
alter table if exists public.orders add column if not exists retry_count integer not null default 0;
alter table if exists public.orders add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.orders add column if not exists updated_at timestamptz not null default now();
alter table if exists public.data_packages add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_data_packages_updated_at on public.data_packages;
create trigger trg_data_packages_updated_at before update on public.data_packages for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

drop trigger if exists trg_withdrawals_updated_at on public.withdrawals;
create trigger trg_withdrawals_updated_at before update on public.withdrawals for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_stores_updated_at on public.agent_stores;
create trigger trg_agent_stores_updated_at before update on public.agent_stores for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_store_packages_updated_at on public.agent_store_packages;
create trigger trg_agent_store_packages_updated_at before update on public.agent_store_packages for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_store_service_prices_updated_at on public.agent_store_service_prices;
create trigger trg_agent_store_service_prices_updated_at before update on public.agent_store_service_prices for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_store_orders_updated_at on public.agent_store_orders;
create trigger trg_agent_store_orders_updated_at before update on public.agent_store_orders for each row execute function public.set_updated_at();

alter table public.agent_stores enable row level security;
alter table public.agent_store_packages enable row level security;
alter table public.agent_store_service_prices enable row level security;
alter table public.agent_store_orders enable row level security;

drop policy if exists agent_stores_select_public_or_owner on public.agent_stores;
create policy agent_stores_select_public_or_owner on public.agent_stores
for select using (is_active = true or auth.uid() = agent_id or public.is_super_admin(auth.uid()));

drop policy if exists agent_stores_insert_owner_or_admin on public.agent_stores;
create policy agent_stores_insert_owner_or_admin on public.agent_stores
for insert with check (auth.uid() = agent_id or public.is_super_admin(auth.uid()));

drop policy if exists agent_stores_update_owner_or_admin on public.agent_stores;
create policy agent_stores_update_owner_or_admin on public.agent_stores
for update using (auth.uid() = agent_id or public.is_super_admin(auth.uid()))
with check (auth.uid() = agent_id or public.is_super_admin(auth.uid()));

drop policy if exists agent_store_packages_select_public_or_owner on public.agent_store_packages;
create policy agent_store_packages_select_public_or_owner on public.agent_store_packages
for select using (
  exists (
    select 1 from public.agent_stores s
    where s.id = store_id
      and (s.is_active = true or s.agent_id = auth.uid() or public.is_super_admin(auth.uid()))
  )
);

drop policy if exists agent_store_packages_manage_owner_or_admin on public.agent_store_packages;
create policy agent_store_packages_manage_owner_or_admin on public.agent_store_packages
for all using (
  exists (
    select 1 from public.agent_stores s where s.id = store_id and (s.agent_id = auth.uid() or public.is_super_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.agent_stores s where s.id = store_id and (s.agent_id = auth.uid() or public.is_super_admin(auth.uid()))
  )
);

drop policy if exists agent_store_service_prices_select_public_or_owner on public.agent_store_service_prices;
create policy agent_store_service_prices_select_public_or_owner on public.agent_store_service_prices
for select using (
  exists (
    select 1 from public.agent_stores s
    where s.id = store_id
      and (s.is_active = true or s.agent_id = auth.uid() or public.is_super_admin(auth.uid()))
  )
);

drop policy if exists agent_store_service_prices_manage_owner_or_admin on public.agent_store_service_prices;
create policy agent_store_service_prices_manage_owner_or_admin on public.agent_store_service_prices
for all using (
  exists (
    select 1 from public.agent_stores s where s.id = store_id and (s.agent_id = auth.uid() or public.is_super_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.agent_stores s where s.id = store_id and (s.agent_id = auth.uid() or public.is_super_admin(auth.uid()))
  )
);

drop policy if exists agent_store_orders_insert_public on public.agent_store_orders;
create policy agent_store_orders_insert_public on public.agent_store_orders
for insert with check (exists (select 1 from public.agent_stores s where s.id = store_id and s.is_active = true));

drop policy if exists agent_store_orders_select_owner_or_admin on public.agent_store_orders;
create policy agent_store_orders_select_owner_or_admin on public.agent_store_orders
for select using (
  exists (
    select 1 from public.agent_stores s where s.id = store_id and (s.agent_id = auth.uid() or public.is_super_admin(auth.uid()))
  )
);

drop policy if exists agent_store_orders_update_owner_or_admin on public.agent_store_orders;
create policy agent_store_orders_update_owner_or_admin on public.agent_store_orders
for update using (
  exists (
    select 1 from public.agent_stores s where s.id = store_id and (s.agent_id = auth.uid() or public.is_super_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.agent_stores s where s.id = store_id and (s.agent_id = auth.uid() or public.is_super_admin(auth.uid()))
  )
);

notify pgrst, 'reload schema';
