-- FlashData GH full production schema for Supabase
-- Includes: schema, constraints, RLS, triggers/functions, indexes, and sample data

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Utility functions
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'super_admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.wallet_set_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

create or replace function public.generate_reference(p_prefix text)
returns text
language plpgsql
as $$
declare
  v_ref text;
  v_exists boolean;
begin
  loop
    v_ref := upper(coalesce(p_prefix, 'FD'))
             || '-'
             || to_char(now(), 'YYYYMMDDHH24MISS')
             || '-'
             || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

    select exists (
      select 1 from public.transactions t where t.reference = v_ref
      union all
      select 1 from public.orders o where o.reference = v_ref
    ) into v_exists;

    exit when not v_exists;
  end loop;

  return v_ref;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique,
  role text not null default 'user' check (role in ('user', 'super_admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_phone_ghana_chk
    check (phone is null or phone ~ '^\\+233[0-9]{9}$')
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  balance numeric(12,2) not null default 0.00 check (balance >= 0),
  last_updated timestamptz not null default now()
);

create table if not exists public.data_packages (
  id uuid primary key default gen_random_uuid(),
  network text not null check (network in ('MTN', 'Airtel-Tigo', 'Telecel', 'AFA')),
  name text not null,
  amount text not null,
  cost_price numeric(10,2) not null check (cost_price >= 0),
  selling_price numeric(10,2) not null check (selling_price >= cost_price),
  validity text not null default 'Non-expiry',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_packages_name_network_unique unique (network, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('data_purchase', 'airtime', 'online_service', 'withdrawal', 'funding', 'store_sale')),
  amount numeric(12,2) not null check (amount > 0),
  description text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  reference text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  wallet_applied boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.data_packages(id) on delete restrict,
  phone text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  reference text not null unique,
  retry_count integer not null default 0 check (retry_count >= 0),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint orders_phone_ghana_chk
    check (phone ~ '^\\+233[0-9]{9}$')
);

create table if not exists public.online_services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.online_services(id) on delete set null,
  package_id uuid references public.data_packages(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint store_orders_exactly_one_item_chk
    check (num_nonnulls(service_id, package_id) = 1),
  constraint store_orders_seller_buyer_diff_chk
    check (seller_id <> buyer_id)
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('MTN MoMo', 'Telecel Cash', 'Bank')),
  account_number text not null,
  account_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  processed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.api_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  api_key text not null unique,
  usage_limit integer not null default 1000 check (usage_limit >= 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1,
  site_name text not null default 'FlashData GH',
  logo_url text,
  hero_text text,
  contact_phone text,
  contact_email text,
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton_chk check (id = 1),
  constraint site_settings_phone_ghana_chk
    check (contact_phone is null or contact_phone ~ '^\\+233[0-9]{9}$')
);

-- ---------------------------------------------------------------------------
-- Auth signup trigger: auto profile + wallet
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text := 'user';
begin
  if lower(new.email) = 'admin@flashdatagh.com' then
    v_role := 'super_admin';
  elsif coalesce(new.raw_app_meta_data ->> 'role', 'user') = 'super_admin' then
    v_role := 'super_admin';
  end if;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'phone', ''), ''),
    v_role
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = excluded.role,
    updated_at = now();

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Wallet adjustment logic and references
-- ---------------------------------------------------------------------------
create or replace function public.apply_wallet_for_successful_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'success' and coalesce(new.wallet_applied, false) = false then
    if new.type in ('funding', 'store_sale') then
      update public.wallets
      set balance = balance + new.amount,
          last_updated = now()
      where user_id = new.user_id;
    else
      update public.wallets
      set balance = greatest(0, balance - new.amount),
          last_updated = now()
      where user_id = new.user_id;
    end if;

    update public.transactions
    set wallet_applied = true
    where id = new.id;
  end if;

  return new;
end;
$$;

create or replace function public.transactions_set_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null or btrim(new.reference) = '' then
    new.reference := public.generate_reference('TRX');
  end if;
  return new;
end;
$$;

create or replace function public.orders_set_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null or btrim(new.reference) = '' then
    new.reference := public.generate_reference('ORD');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_transactions_set_reference on public.transactions;
create trigger trg_transactions_set_reference
before insert on public.transactions
for each row execute function public.transactions_set_reference();

drop trigger if exists trg_orders_set_reference on public.orders;
create trigger trg_orders_set_reference
before insert on public.orders
for each row execute function public.orders_set_reference();

drop trigger if exists trg_apply_wallet_on_transaction on public.transactions;
create trigger trg_apply_wallet_on_transaction
after insert or update of status on public.transactions
for each row
execute function public.apply_wallet_for_successful_transaction();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_data_packages_updated_at on public.data_packages;
create trigger trg_data_packages_updated_at
before update on public.data_packages
for each row execute function public.touch_updated_at();

drop trigger if exists trg_wallets_last_updated on public.wallets;
create trigger trg_wallets_last_updated
before update on public.wallets
for each row execute function public.wallet_set_last_updated();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.data_packages enable row level security;
alter table public.transactions enable row level security;
alter table public.orders enable row level security;
alter table public.online_services enable row level security;
alter table public.store_orders enable row level security;
alter table public.withdrawals enable row level security;
alter table public.notifications enable row level security;
alter table public.api_users enable row level security;
alter table public.site_settings enable row level security;

-- profiles
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
using (auth.uid() = id or public.is_super_admin(auth.uid()));

drop policy if exists profiles_insert_own_or_admin on public.profiles;
create policy profiles_insert_own_or_admin
on public.profiles
for insert
with check (auth.uid() = id or public.is_super_admin(auth.uid()));

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
using (auth.uid() = id or public.is_super_admin(auth.uid()))
with check (
  public.is_super_admin(auth.uid())
  or (auth.uid() = id and role = 'user')
);

-- wallets
drop policy if exists wallets_select_own_or_admin on public.wallets;
create policy wallets_select_own_or_admin
on public.wallets
for select
using (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists wallets_admin_all on public.wallets;
create policy wallets_admin_all
on public.wallets
for all
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

-- data_packages
drop policy if exists data_packages_select_active_or_admin on public.data_packages;
create policy data_packages_select_active_or_admin
on public.data_packages
for select
using (is_active = true or public.is_super_admin(auth.uid()));

drop policy if exists data_packages_admin_manage on public.data_packages;
create policy data_packages_admin_manage
on public.data_packages
for all
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

-- transactions
drop policy if exists transactions_select_own_or_admin on public.transactions;
create policy transactions_select_own_or_admin
on public.transactions
for select
using (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists transactions_insert_own_or_admin on public.transactions;
create policy transactions_insert_own_or_admin
on public.transactions
for insert
with check (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists transactions_update_admin_only on public.transactions;
create policy transactions_update_admin_only
on public.transactions
for update
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

-- orders
drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin
on public.orders
for select
using (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists orders_insert_own_or_admin on public.orders;
create policy orders_insert_own_or_admin
on public.orders
for insert
with check (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists orders_update_admin_only on public.orders;
create policy orders_update_admin_only
on public.orders
for update
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

-- online_services
drop policy if exists online_services_select_active_or_admin on public.online_services;
create policy online_services_select_active_or_admin
on public.online_services
for select
using (is_active = true or public.is_super_admin(auth.uid()));

drop policy if exists online_services_admin_manage on public.online_services;
create policy online_services_admin_manage
on public.online_services
for all
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

-- store_orders
drop policy if exists store_orders_select_party_or_admin on public.store_orders;
create policy store_orders_select_party_or_admin
on public.store_orders
for select
using (
  auth.uid() = seller_id
  or auth.uid() = buyer_id
  or public.is_super_admin(auth.uid())
);

drop policy if exists store_orders_insert_party_or_admin on public.store_orders;
create policy store_orders_insert_party_or_admin
on public.store_orders
for insert
with check (
  auth.uid() = seller_id
  or auth.uid() = buyer_id
  or public.is_super_admin(auth.uid())
);

drop policy if exists store_orders_update_admin_only on public.store_orders;
create policy store_orders_update_admin_only
on public.store_orders
for update
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

-- withdrawals
drop policy if exists withdrawals_select_own_or_admin on public.withdrawals;
create policy withdrawals_select_own_or_admin
on public.withdrawals
for select
using (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists withdrawals_insert_own_or_admin on public.withdrawals;
create policy withdrawals_insert_own_or_admin
on public.withdrawals
for insert
with check (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists withdrawals_update_admin_only on public.withdrawals;
create policy withdrawals_update_admin_only
on public.withdrawals
for update
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

-- notifications
drop policy if exists notifications_select_own_or_admin on public.notifications;
create policy notifications_select_own_or_admin
on public.notifications
for select
using (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists notifications_insert_admin_or_self on public.notifications;
create policy notifications_insert_admin_or_self
on public.notifications
for insert
with check (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists notifications_update_own_or_admin on public.notifications;
create policy notifications_update_own_or_admin
on public.notifications
for update
using (auth.uid() = user_id or public.is_super_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_super_admin(auth.uid()));

-- api_users
drop policy if exists api_users_select_own_or_admin on public.api_users;
create policy api_users_select_own_or_admin
on public.api_users
for select
using (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists api_users_insert_own_or_admin on public.api_users;
create policy api_users_insert_own_or_admin
on public.api_users
for insert
with check (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists api_users_update_own_or_admin on public.api_users;
create policy api_users_update_own_or_admin
on public.api_users
for update
using (auth.uid() = user_id or public.is_super_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_super_admin(auth.uid()));

-- site_settings
drop policy if exists site_settings_select_all_authenticated on public.site_settings;
create policy site_settings_select_all_authenticated
on public.site_settings
for select
using (auth.role() = 'authenticated' or public.is_super_admin(auth.uid()));

drop policy if exists site_settings_admin_manage on public.site_settings;
create policy site_settings_admin_manage
on public.site_settings
for all
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_created_at on public.profiles (created_at desc);

create index if not exists idx_wallets_user_id on public.wallets (user_id);
create index if not exists idx_wallets_last_updated on public.wallets (last_updated desc);

create index if not exists idx_data_packages_network_active on public.data_packages (network, is_active);
create index if not exists idx_data_packages_created_at on public.data_packages (created_at desc);

create index if not exists idx_transactions_user_created on public.transactions (user_id, created_at desc);
create index if not exists idx_transactions_status_created on public.transactions (status, created_at desc);
create index if not exists idx_transactions_type_created on public.transactions (type, created_at desc);
create index if not exists idx_transactions_metadata_gin on public.transactions using gin (metadata);

create index if not exists idx_orders_user_created on public.orders (user_id, created_at desc);
create index if not exists idx_orders_package_status on public.orders (package_id, status);
create index if not exists idx_orders_status_created on public.orders (status, created_at desc);

create index if not exists idx_online_services_category_active on public.online_services (category, is_active);
create index if not exists idx_online_services_created_at on public.online_services (created_at desc);

create index if not exists idx_store_orders_seller_created on public.store_orders (seller_id, created_at desc);
create index if not exists idx_store_orders_buyer_created on public.store_orders (buyer_id, created_at desc);
create index if not exists idx_store_orders_status_created on public.store_orders (status, created_at desc);

create index if not exists idx_withdrawals_user_created on public.withdrawals (user_id, created_at desc);
create index if not exists idx_withdrawals_status_created on public.withdrawals (status, created_at desc);

create index if not exists idx_notifications_user_read_created on public.notifications (user_id, is_read, created_at desc);

create index if not exists idx_api_users_user_active on public.api_users (user_id, is_active);

-- ---------------------------------------------------------------------------
-- Sample data (admin + 5 users + packages + operational records)
-- NOTE: If users already exist, inserts are idempotent and use on conflict/do nothing.
-- ---------------------------------------------------------------------------

-- Seed helper to create auth users from SQL migration context.
create or replace function public.seed_create_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_role text default 'user'
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_instance_id uuid;
begin
  select i.id into v_instance_id
  from auth.instances i
  limit 1;

  if v_instance_id is null then
    raise exception 'No auth instance found. Create at least one auth user in Supabase first.';
  end if;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    p_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', p_role),
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    now(),
    now()
  )
  on conflict (id) do nothing;

  update auth.users
  set
    raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', p_role),
    updated_at = now()
  where id = p_id;

  update public.profiles
  set
    full_name = p_full_name,
    phone = p_phone,
    role = p_role,
    updated_at = now()
  where id = p_id;
end;
$$;

select public.seed_create_auth_user(
  '11111111-1111-1111-1111-111111111111',
  'admin@flashdatagh.com',
  'ChangeMeAdmin123!',
  'FlashData Super Admin',
  '+233200000001',
  'super_admin'
);

select public.seed_create_auth_user(
  '22222222-2222-2222-2222-222222222221',
  'kwame@flashdatagh.com',
  'ChangeMeUser123!',
  'Kwame Mensah',
  '+233240000001',
  'user'
);

select public.seed_create_auth_user(
  '22222222-2222-2222-2222-222222222222',
  'ama@flashdatagh.com',
  'ChangeMeUser123!',
  'Ama Owusu',
  '+233240000002',
  'user'
);

select public.seed_create_auth_user(
  '22222222-2222-2222-2222-222222222223',
  'kojo@flashdatagh.com',
  'ChangeMeUser123!',
  'Kojo Asante',
  '+233240000003',
  'user'
);

select public.seed_create_auth_user(
  '22222222-2222-2222-2222-222222222224',
  'efua@flashdatagh.com',
  'ChangeMeUser123!',
  'Efua Addo',
  '+233240000004',
  'user'
);

select public.seed_create_auth_user(
  '22222222-2222-2222-2222-222222222225',
  'yaw@flashdatagh.com',
  'ChangeMeUser123!',
  'Yaw Boateng',
  '+233240000005',
  'user'
);

-- Wallet balances for seeded users
update public.wallets set balance = 1500.00 where user_id = '11111111-1111-1111-1111-111111111111';
update public.wallets set balance = 120.00 where user_id = '22222222-2222-2222-2222-222222222221';
update public.wallets set balance = 95.50 where user_id = '22222222-2222-2222-2222-222222222222';
update public.wallets set balance = 80.00 where user_id = '22222222-2222-2222-2222-222222222223';
update public.wallets set balance = 40.00 where user_id = '22222222-2222-2222-2222-222222222224';
update public.wallets set balance = 210.75 where user_id = '22222222-2222-2222-2222-222222222225';

-- Data packages (20 total)
insert into public.data_packages (network, name, amount, cost_price, selling_price, validity, is_active, created_by)
values
('MTN', 'MTN 1GB Daily', '1GB', 5.00, 6.00, '24 hours', true, '11111111-1111-1111-1111-111111111111'),
('MTN', 'MTN 2GB 3-Day', '2GB', 9.50, 11.00, '3 days', true, '11111111-1111-1111-1111-111111111111'),
('MTN', 'MTN 5GB Weekly', '5GB', 20.00, 23.00, '7 days', true, '11111111-1111-1111-1111-111111111111'),
('MTN', 'MTN 10GB Weekly', '10GB', 38.00, 43.00, '7 days', true, '11111111-1111-1111-1111-111111111111'),
('MTN', 'MTN 20GB Monthly', '20GB', 72.00, 79.00, '30 days', true, '11111111-1111-1111-1111-111111111111'),

('Airtel-Tigo', 'AT 1.5GB Daily', '1.5GB', 5.50, 6.50, '24 hours', true, '11111111-1111-1111-1111-111111111111'),
('Airtel-Tigo', 'AT 3GB 3-Day', '3GB', 10.00, 12.00, '3 days', true, '11111111-1111-1111-1111-111111111111'),
('Airtel-Tigo', 'AT 6GB Weekly', '6GB', 21.00, 24.50, '7 days', true, '11111111-1111-1111-1111-111111111111'),
('Airtel-Tigo', 'AT 12GB Weekly', '12GB', 39.00, 44.00, '7 days', true, '11111111-1111-1111-1111-111111111111'),
('Airtel-Tigo', 'AT 25GB Monthly', '25GB', 74.00, 82.00, '30 days', true, '11111111-1111-1111-1111-111111111111'),

('Telecel', 'Telecel 1GB Daily', '1GB', 4.80, 5.80, '24 hours', true, '11111111-1111-1111-1111-111111111111'),
('Telecel', 'Telecel 2GB 3-Day', '2GB', 8.80, 10.20, '3 days', true, '11111111-1111-1111-1111-111111111111'),
('Telecel', 'Telecel 5GB Weekly', '5GB', 19.00, 22.00, '7 days', true, '11111111-1111-1111-1111-111111111111'),
('Telecel', 'Telecel 10GB Weekly', '10GB', 36.00, 41.00, '7 days', true, '11111111-1111-1111-1111-111111111111'),
('Telecel', 'Telecel 18GB Monthly', '18GB', 67.00, 74.00, '30 days', true, '11111111-1111-1111-1111-111111111111'),

('AFA', 'AFA 500MB Flex', '500MB', 2.00, 2.50, 'Non-expiry', true, '11111111-1111-1111-1111-111111111111'),
('AFA', 'AFA 1GB Flex', '1GB', 3.80, 4.50, 'Non-expiry', true, '11111111-1111-1111-1111-111111111111'),
('AFA', 'AFA 5GB Flex', '5GB', 17.00, 19.50, 'Non-expiry', true, '11111111-1111-1111-1111-111111111111'),
('AFA', 'AFA 12GB Flex', '12GB', 36.00, 40.00, 'Non-expiry', true, '11111111-1111-1111-1111-111111111111'),
('AFA', 'AFA Unlimited Social', 'Unlimited', 55.00, 62.00, '30 days', true, '11111111-1111-1111-1111-111111111111')
on conflict do nothing;

-- Online services sample
insert into public.online_services (name, description, category, price, image_url, is_active, created_by)
values
('Birth Certificate Application', 'Assisted online birth certificate request and submission support.', 'Government', 120.00, 'service-images/birth-certificate.jpg', true, '11111111-1111-1111-1111-111111111111'),
('Ghana Card Appointment Booking', 'Fast-track appointment scheduling support for Ghana Card centers.', 'Government', 85.00, 'service-images/ghana-card.jpg', true, '11111111-1111-1111-1111-111111111111'),
('Passport Application Support', 'Form filling and payment guidance for Ghana passport processing.', 'Travel', 200.00, 'service-images/passport.jpg', true, '11111111-1111-1111-1111-111111111111'),
('DV Lottery Entry', 'Accurate diversity visa lottery form entry and review.', 'Immigration', 150.00, 'service-images/dv-lottery.jpg', true, '11111111-1111-1111-1111-111111111111')
on conflict (name) do nothing;

-- Orders sample
insert into public.orders (user_id, package_id, phone, amount, status, reference, retry_count, processed_at)
select
  '22222222-2222-2222-2222-222222222221',
  dp.id,
  '+233240000001',
  dp.selling_price,
  'success',
  'ORD-20260515-000001',
  0,
  now() - interval '2 hours'
from public.data_packages dp
where dp.name = 'MTN 5GB Weekly'
on conflict (reference) do nothing;

insert into public.orders (user_id, package_id, phone, amount, status, reference, retry_count)
select
  '22222222-2222-2222-2222-222222222222',
  dp.id,
  '+233240000002',
  dp.selling_price,
  'pending',
  'ORD-20260515-000002',
  1
from public.data_packages dp
where dp.name = 'Telecel 2GB 3-Day'
on conflict (reference) do nothing;

-- Transactions sample
insert into public.transactions (user_id, type, amount, description, status, reference, metadata, wallet_applied, created_at)
values
('22222222-2222-2222-2222-222222222221', 'funding', 100.00, 'Wallet top-up via MTN MoMo', 'success', 'TRX-20260515-000001', '{"channel":"momo","network":"MTN"}', true, now() - interval '1 day'),
('22222222-2222-2222-2222-222222222221', 'data_purchase', 23.00, 'MTN 5GB Weekly purchase', 'success', 'TRX-20260515-000002', '{"network":"MTN","phone":"+233240000001"}', true, now() - interval '2 hours'),
('22222222-2222-2222-2222-222222222222', 'airtime', 10.00, 'Airtime purchase', 'failed', 'TRX-20260515-000003', '{"network":"Telecel","phone":"+233240000002"}', false, now() - interval '3 hours'),
('22222222-2222-2222-2222-222222222223', 'online_service', 120.00, 'Birth certificate service order', 'pending', 'TRX-20260515-000004', '{"service":"Birth Certificate Application"}', false, now() - interval '30 minutes'),
('22222222-2222-2222-2222-222222222224', 'withdrawal', 25.00, 'Withdrawal request to MTN MoMo', 'pending', 'TRX-20260515-000005', '{"payment_method":"MTN MoMo"}', false, now() - interval '15 minutes')
on conflict (reference) do nothing;

-- Withdrawals sample
insert into public.withdrawals (user_id, amount, payment_method, account_number, account_name, status, processed_by, processed_at)
values
('22222222-2222-2222-2222-222222222224', 25.00, 'MTN MoMo', '0240000004', 'Efua Addo', 'pending', null, null),
('22222222-2222-2222-2222-222222222225', 50.00, 'Bank', '012345678901', 'Yaw Boateng', 'approved', '11111111-1111-1111-1111-111111111111', now() - interval '5 hours')
on conflict do nothing;

-- Notifications sample
insert into public.notifications (user_id, title, message, type, is_read, created_at)
values
('22222222-2222-2222-2222-222222222221', 'Data purchase successful', 'Your MTN 5GB Weekly bundle has been delivered.', 'success', false, now() - interval '2 hours'),
('22222222-2222-2222-2222-222222222222', 'Airtime request failed', 'Your airtime purchase failed. Please retry.', 'error', false, now() - interval '3 hours'),
('22222222-2222-2222-2222-222222222224', 'Withdrawal pending', 'Your withdrawal request is awaiting approval.', 'info', false, now() - interval '20 minutes')
on conflict do nothing;

-- Store orders sample
insert into public.store_orders (seller_id, buyer_id, package_id, amount, status, created_at)
select
  '22222222-2222-2222-2222-222222222221',
  '22222222-2222-2222-2222-222222222223',
  dp.id,
  dp.selling_price,
  'success',
  now() - interval '6 hours'
from public.data_packages dp
where dp.name = 'AFA 1GB Flex'
on conflict do nothing;

insert into public.store_orders (seller_id, buyer_id, service_id, amount, status, created_at)
select
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222225',
  os.id,
  os.price,
  'pending',
  now() - interval '45 minutes'
from public.online_services os
where os.name = 'Ghana Card Appointment Booking'
on conflict do nothing;

-- API users sample
insert into public.api_users (user_id, api_key, usage_limit, usage_count, is_active)
values
('22222222-2222-2222-2222-222222222221', 'fd_live_abc123kwame', 5000, 35, true),
('22222222-2222-2222-2222-222222222225', 'fd_live_xyz987yaw', 2000, 4, true)
on conflict (api_key) do nothing;

-- Site settings singleton
insert into public.site_settings (id, site_name, logo_url, hero_text, contact_phone, contact_email, maintenance_mode)
values (1, 'FlashData GH', 'branding/flashdata-logo.png', 'Fast, affordable data and digital services in Ghana.', '+233240000999', 'support@flashdatagh.com', false)
on conflict (id) do update
set
  site_name = excluded.site_name,
  logo_url = excluded.logo_url,
  hero_text = excluded.hero_text,
  contact_phone = excluded.contact_phone,
  contact_email = excluded.contact_email,
  maintenance_mode = excluded.maintenance_mode,
  updated_at = now();

-- Ensure super admin role is enforced for default admin profile.
update public.profiles
set role = 'super_admin', updated_at = now()
where id = '11111111-1111-1111-1111-111111111111'
   or lower(coalesce((select email from auth.users where auth.users.id = public.profiles.id), '')) = 'admin@flashdatagh.com';

-- Keep helper available for repeatable seed in staging; comment next line to keep function.
drop function if exists public.seed_create_auth_user(uuid, text, text, text, text, text);

commit;
