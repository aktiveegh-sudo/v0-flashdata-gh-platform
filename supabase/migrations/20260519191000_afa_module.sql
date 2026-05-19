-- AFA module: user registrations and admin-managed pricing.

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.afa_settings (
  id integer primary key default 1,
  base_price numeric(10,2) not null default 0 check (base_price >= 0),
  is_active boolean not null default true,
  instructions text,
  updated_at timestamptz not null default now(),
  constraint afa_settings_singleton_chk check (id = 1)
);

create table if not exists public.afa_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  ghana_card_number text not null,
  location text not null,
  amount numeric(10,2) not null check (amount >= 0),
  reference text not null unique,
  status text not null default 'pending' check (status in ('pending','processing','completed','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.afa_settings (id, base_price, is_active, instructions)
values (1, 0, true, 'Provide accurate details exactly as they appear on your Ghana Card.')
on conflict (id) do nothing;

create index if not exists idx_afa_registrations_user_created on public.afa_registrations (user_id, created_at desc);
create index if not exists idx_afa_registrations_status on public.afa_registrations (status);

alter table public.afa_settings enable row level security;
alter table public.afa_registrations enable row level security;

drop policy if exists afa_settings_select_all_authenticated on public.afa_settings;
create policy afa_settings_select_all_authenticated
on public.afa_settings
for select
using (auth.uid() is not null);

drop policy if exists afa_settings_admin_manage on public.afa_settings;
create policy afa_settings_admin_manage
on public.afa_settings
for all
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

drop policy if exists afa_registrations_select_own_or_admin on public.afa_registrations;
create policy afa_registrations_select_own_or_admin
on public.afa_registrations
for select
using (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists afa_registrations_insert_self_or_admin on public.afa_registrations;
create policy afa_registrations_insert_self_or_admin
on public.afa_registrations
for insert
with check (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists afa_registrations_update_admin_only on public.afa_registrations;
create policy afa_registrations_update_admin_only
on public.afa_registrations
for update
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

drop policy if exists afa_registrations_delete_admin_only on public.afa_registrations;
create policy afa_registrations_delete_admin_only
on public.afa_registrations
for delete
using (public.is_super_admin(auth.uid()));

drop trigger if exists trg_afa_settings_updated_at on public.afa_settings;
create trigger trg_afa_settings_updated_at
before update on public.afa_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_afa_registrations_updated_at on public.afa_registrations;
create trigger trg_afa_registrations_updated_at
before update on public.afa_registrations
for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

commit;
