-- Keep admin user list aligned with Supabase auth users.

create or replace function public.sync_auth_users_to_profiles_wallets()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_inserted_profiles integer := 0;
  v_updated_emails integer := 0;
  v_inserted_wallets integer := 0;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can run this sync.';
  end if;

  with inserted_profiles as (
    insert into public.profiles (id, full_name, phone, email, role, status)
    select
      u.id,
      nullif(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ''),
      case
        when coalesce(u.raw_user_meta_data ->> 'phone', '') ~ '^\\+233[0-9]{9}$'
          then nullif(u.raw_user_meta_data ->> 'phone', '')
        else null
      end as phone,
      u.email,
      case
        when lower(u.email) = 'admin@flashdatagh.com' then 'super_admin'
        when coalesce(u.raw_app_meta_data ->> 'role', 'user') = 'super_admin' then 'super_admin'
        else 'user'
      end as role,
      'active'
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
    returning id
  )
  select count(*) into v_inserted_profiles from inserted_profiles;

  with updated_profiles as (
    update public.profiles p
    set email = u.email,
        updated_at = now()
    from auth.users u
    where p.id = u.id
      and p.email is null
    returning p.id
  )
  select count(*) into v_updated_emails from updated_profiles;

  with inserted_wallets as (
    insert into public.wallets (user_id)
    select p.id
    from public.profiles p
    left join public.wallets w on w.user_id = p.id
    where w.user_id is null
    returning user_id
  )
  select count(*) into v_inserted_wallets from inserted_wallets;

  return jsonb_build_object(
    'inserted_profiles', v_inserted_profiles,
    'updated_emails', v_updated_emails,
    'inserted_wallets', v_inserted_wallets
  );
end;
$$;

grant execute on function public.sync_auth_users_to_profiles_wallets() to authenticated;

notify pgrst, 'reload schema';
