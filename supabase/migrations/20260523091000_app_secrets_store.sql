begin;

create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_secrets
  add column if not exists description text,
  add column if not exists is_secret boolean not null default true,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.app_secrets
  alter column updated_at set default now();

alter table public.app_secrets enable row level security;

create or replace function public.touch_app_secret_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_secrets_updated_at on public.app_secrets;
create trigger trg_app_secrets_updated_at
before update on public.app_secrets
for each row execute function public.touch_app_secret_updated_at();

notify pgrst, 'reload schema';

commit;
