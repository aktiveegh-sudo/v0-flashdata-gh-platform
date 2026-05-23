begin;

create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;

revoke all on table public.app_secrets from anon, authenticated;
grant select, insert, update, delete on table public.app_secrets to service_role;

notify pgrst, 'reload schema';

commit;
