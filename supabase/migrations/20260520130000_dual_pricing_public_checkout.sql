begin;

alter table if exists public.data_packages
  add column if not exists public_price numeric(10,2),
  add column if not exists agent_price numeric(10,2);

update public.data_packages
set
  public_price = coalesce(public_price, selling_price),
  agent_price = coalesce(agent_price, selling_price);

alter table if exists public.data_packages
  alter column public_price set default 0,
  alter column public_price set not null,
  alter column agent_price set default 0,
  alter column agent_price set not null;

alter table if exists public.data_packages
  drop constraint if exists data_packages_public_price_non_negative_chk,
  add constraint data_packages_public_price_non_negative_chk check (public_price >= 0),
  drop constraint if exists data_packages_agent_price_non_negative_chk,
  add constraint data_packages_agent_price_non_negative_chk check (agent_price >= 0),
  drop constraint if exists data_packages_agent_price_cost_chk,
  add constraint data_packages_agent_price_cost_chk check (agent_price >= cost_price);

alter table if exists public.online_services
  add column if not exists public_price numeric(10,2),
  add column if not exists agent_price numeric(10,2);

update public.online_services
set
  public_price = coalesce(public_price, price),
  agent_price = coalesce(agent_price, price);

alter table if exists public.online_services
  alter column public_price set default 0,
  alter column public_price set not null,
  alter column agent_price set default 0,
  alter column agent_price set not null;

alter table if exists public.online_services
  drop constraint if exists online_services_public_price_non_negative_chk,
  add constraint online_services_public_price_non_negative_chk check (public_price >= 0),
  drop constraint if exists online_services_agent_price_non_negative_chk,
  add constraint online_services_agent_price_non_negative_chk check (agent_price >= 0);

alter table if exists public.afa_settings
  add column if not exists public_price numeric(10,2),
  add column if not exists agent_price numeric(10,2);

update public.afa_settings
set
  public_price = coalesce(public_price, base_price),
  agent_price = coalesce(agent_price, base_price)
where id = 1;

alter table if exists public.afa_settings
  alter column public_price set default 0,
  alter column public_price set not null,
  alter column agent_price set default 0,
  alter column agent_price set not null;

alter table if exists public.afa_settings
  drop constraint if exists afa_settings_public_price_non_negative_chk,
  add constraint afa_settings_public_price_non_negative_chk check (public_price >= 0),
  drop constraint if exists afa_settings_agent_price_non_negative_chk,
  add constraint afa_settings_agent_price_non_negative_chk check (agent_price >= 0);

create or replace function public.sync_afa_data_package_from_settings()
returns trigger
language plpgsql
as $$
begin
  insert into public.data_packages (
    network,
    name,
    amount,
    cost_price,
    selling_price,
    public_price,
    agent_price,
    validity,
    is_active
  )
  values (
    'AFA',
    'AFA Registration',
    'Registration',
    new.agent_price,
    new.agent_price,
    new.public_price,
    new.agent_price,
    'Non-expiry',
    new.is_active
  )
  on conflict (network, name)
  do update set
    amount = excluded.amount,
    cost_price = excluded.cost_price,
    selling_price = excluded.selling_price,
    public_price = excluded.public_price,
    agent_price = excluded.agent_price,
    validity = excluded.validity,
    is_active = excluded.is_active,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_afa_data_package_from_settings on public.afa_settings;
create trigger trg_sync_afa_data_package_from_settings
after insert or update of base_price, public_price, agent_price, is_active
on public.afa_settings
for each row execute function public.sync_afa_data_package_from_settings();

update public.data_packages
set
  public_price = coalesce(public_price, selling_price),
  agent_price = coalesce(agent_price, selling_price)
where network = 'AFA';

with settings as (
  select
    coalesce(public_price, base_price) as public_price,
    coalesce(agent_price, base_price) as agent_price,
    is_active
  from public.afa_settings
  where id = 1
)
update public.data_packages p
set
  cost_price = s.agent_price,
  selling_price = s.agent_price,
  public_price = s.public_price,
  agent_price = s.agent_price,
  validity = 'Non-expiry',
  is_active = s.is_active,
  updated_at = now()
from settings s
where p.network = 'AFA' and p.name = 'AFA Registration';

notify pgrst, 'reload schema';

commit;
