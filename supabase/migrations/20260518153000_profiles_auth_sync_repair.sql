-- Ensure auth.users and public.profiles stay in sync for admin/user dashboards

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text := 'user';
  v_phone text;
begin
  if lower(new.email) = 'admin@flashdatagh.com' then
    v_role := 'super_admin';
  elsif coalesce(new.raw_app_meta_data ->> 'role', 'user') = 'super_admin' then
    v_role := 'super_admin';
  end if;

  v_phone := nullif(coalesce(new.raw_user_meta_data ->> 'phone', ''), '');
  if v_phone is not null and v_phone !~ '^\+233[0-9]{9}$' then
    v_phone := null;
  end if;

  insert into public.profiles (id, full_name, phone, email, role, status)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ''),
    v_phone,
    new.email,
    v_role,
    'active'
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    role = excluded.role,
    status = coalesce(public.profiles.status, 'active'),
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

-- Backfill missing profiles from existing auth users
insert into public.profiles (id, full_name, phone, email, role, status)
select
  u.id,
  nullif(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ''),
  case
    when coalesce(u.raw_user_meta_data ->> 'phone', '') ~ '^\+233[0-9]{9}$'
      then nullif(u.raw_user_meta_data ->> 'phone', '')
    else null
  end as phone,
  u.email,
  case
    when lower(u.email) = 'admin@flashdatagh.com' then 'super_admin'
    when coalesce(u.raw_app_meta_data ->> 'role', 'user') = 'super_admin' then 'super_admin'
    else 'user'
  end as role,
  'active' as status
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Fill missing emails for existing profile rows
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null;

-- Backfill missing wallets
insert into public.wallets (user_id)
select p.id
from public.profiles p
left join public.wallets w on w.user_id = p.id
where w.user_id is null;

notify pgrst, 'reload schema';
