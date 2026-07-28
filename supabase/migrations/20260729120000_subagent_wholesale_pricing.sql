-- Subagent wholesale pricing catalogs + parent margin support

create table if not exists public.sub_agent_package_prices (
  id uuid primary key default gen_random_uuid(),
  parent_agent_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.data_packages(id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_agent_id, package_id)
);

create table if not exists public.sub_agent_service_prices (
  id uuid primary key default gen_random_uuid(),
  parent_agent_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid not null references public.online_services(id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_agent_id, service_id)
);

create table if not exists public.sub_agent_afa_prices (
  id uuid primary key default gen_random_uuid(),
  parent_agent_id uuid not null references public.profiles(id) on delete cascade unique,
  price numeric(12,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sub_agent_package_prices_parent
  on public.sub_agent_package_prices(parent_agent_id);

create index if not exists idx_sub_agent_service_prices_parent
  on public.sub_agent_service_prices(parent_agent_id);

alter table public.sub_agent_package_prices enable row level security;
alter table public.sub_agent_service_prices enable row level security;
alter table public.sub_agent_afa_prices enable row level security;

-- Parent manages own catalog; active subagents of that parent can read
drop policy if exists sub_agent_package_prices_select on public.sub_agent_package_prices;
create policy sub_agent_package_prices_select
on public.sub_agent_package_prices
for select
using (
  auth.uid() = parent_agent_id
  or exists (
    select 1 from public.sub_agents sa
    where sa.user_id = auth.uid()
      and sa.parent_agent_id = sub_agent_package_prices.parent_agent_id
      and sa.status = 'active'
  )
);

drop policy if exists sub_agent_package_prices_write on public.sub_agent_package_prices;
create policy sub_agent_package_prices_write
on public.sub_agent_package_prices
for all
using (auth.uid() = parent_agent_id)
with check (auth.uid() = parent_agent_id);

drop policy if exists sub_agent_service_prices_select on public.sub_agent_service_prices;
create policy sub_agent_service_prices_select
on public.sub_agent_service_prices
for select
using (
  auth.uid() = parent_agent_id
  or exists (
    select 1 from public.sub_agents sa
    where sa.user_id = auth.uid()
      and sa.parent_agent_id = sub_agent_service_prices.parent_agent_id
      and sa.status = 'active'
  )
);

drop policy if exists sub_agent_service_prices_write on public.sub_agent_service_prices;
create policy sub_agent_service_prices_write
on public.sub_agent_service_prices
for all
using (auth.uid() = parent_agent_id)
with check (auth.uid() = parent_agent_id);

drop policy if exists sub_agent_afa_prices_select on public.sub_agent_afa_prices;
create policy sub_agent_afa_prices_select
on public.sub_agent_afa_prices
for select
using (
  auth.uid() = parent_agent_id
  or exists (
    select 1 from public.sub_agents sa
    where sa.user_id = auth.uid()
      and sa.parent_agent_id = sub_agent_afa_prices.parent_agent_id
      and sa.status = 'active'
  )
);

drop policy if exists sub_agent_afa_prices_write on public.sub_agent_afa_prices;
create policy sub_agent_afa_prices_write
on public.sub_agent_afa_prices
for all
using (auth.uid() = parent_agent_id)
with check (auth.uid() = parent_agent_id);

-- Prevent nested recruiting: an active subagent cannot become a parent of others
create or replace function public.prevent_subagent_as_parent()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.sub_agents sa
    where sa.user_id = new.parent_agent_id
      and sa.status = 'active'
  ) then
    raise exception 'Active subagents cannot recruit other subagents';
  end if;

  if new.parent_agent_id = new.user_id then
    raise exception 'Cannot assign a user as their own subagent';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_subagent_as_parent on public.sub_agents;
create trigger trg_prevent_subagent_as_parent
before insert or update of parent_agent_id, user_id, status
on public.sub_agents
for each row
execute function public.prevent_subagent_as_parent();
