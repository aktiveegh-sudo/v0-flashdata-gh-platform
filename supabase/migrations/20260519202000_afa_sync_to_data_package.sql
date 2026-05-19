-- Keep a canonical AFA package in data_packages synced from afa_settings base price.

begin;

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
    validity,
    is_active
  )
  values (
    'AFA',
    'AFA Registration',
    'Registration',
    new.base_price,
    new.base_price,
    'Non-expiry',
    new.is_active
  )
  on conflict (network, name)
  do update set
    amount = excluded.amount,
    cost_price = excluded.cost_price,
    selling_price = excluded.selling_price,
    validity = excluded.validity,
    is_active = excluded.is_active,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_afa_data_package_from_settings on public.afa_settings;
create trigger trg_sync_afa_data_package_from_settings
after insert or update of base_price, is_active
on public.afa_settings
for each row execute function public.sync_afa_data_package_from_settings();

insert into public.data_packages (
  network,
  name,
  amount,
  cost_price,
  selling_price,
  validity,
  is_active
)
select
  'AFA',
  'AFA Registration',
  'Registration',
  s.base_price,
  s.base_price,
  'Non-expiry',
  s.is_active
from public.afa_settings s
where s.id = 1
on conflict (network, name)
do update set
  amount = excluded.amount,
  cost_price = excluded.cost_price,
  selling_price = excluded.selling_price,
  validity = excluded.validity,
  is_active = excluded.is_active,
  updated_at = now();

notify pgrst, 'reload schema';

commit;
