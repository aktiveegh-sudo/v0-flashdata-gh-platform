-- Refresh and harden admin tables so Supabase/PostgREST schema cache sees them immediately.

begin;

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

create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  activity_type text not null default 'update',
  entity text not null,
  entity_id text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.wallets
  add column if not exists last_updated timestamptz not null default now();

alter table public.online_services enable row level security;
alter table public.notifications enable row level security;
alter table public.api_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_activity enable row level security;

create index if not exists idx_online_services_created_at on public.online_services (created_at desc);
create index if not exists idx_notifications_created_at on public.notifications (created_at desc);
create index if not exists idx_api_users_created_at on public.api_users (created_at desc);
create index if not exists idx_site_settings_updated_at on public.site_settings (updated_at desc);
create index if not exists idx_admin_activity_created_at on public.admin_activity (created_at desc);

notify pgrst, 'reload schema';

commit;
