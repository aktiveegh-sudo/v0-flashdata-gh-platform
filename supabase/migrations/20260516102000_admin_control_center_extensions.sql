-- Admin control center compatibility extensions

alter table public.profiles
  add column if not exists email text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended'));

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null;

create unique index if not exists idx_profiles_email_lower_unique
  on public.profiles (lower(email))
  where email is not null;

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

create index if not exists idx_admin_activity_created_at on public.admin_activity (created_at desc);
create index if not exists idx_admin_activity_entity on public.admin_activity (entity, created_at desc);

alter table public.admin_activity enable row level security;

create policy admin_activity_select_admin_only
on public.admin_activity
for select
to authenticated
using (public.is_super_admin(auth.uid()));

create policy admin_activity_insert_admin_only
on public.admin_activity
for insert
to authenticated
with check (public.is_super_admin(auth.uid()));

create policy admin_activity_update_admin_only
on public.admin_activity
for update
to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

create policy admin_activity_delete_admin_only
on public.admin_activity
for delete
to authenticated
using (public.is_super_admin(auth.uid()));
