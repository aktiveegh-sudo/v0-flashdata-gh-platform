-- Return all platform users for super admins, bypassing fragile client-side RLS joins.

create or replace function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  phone text,
  email text,
  role text,
  status text,
  avatar_url text,
  created_at timestamptz,
  wallet_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_super_admin(auth.uid())
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@flashdatagh.com'
  ) then
    raise exception 'Only super admins can list all users.';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.phone,
    p.email,
    p.role,
    p.status,
    p.avatar_url,
    p.created_at,
    coalesce(w.balance, 0)::numeric as wallet_balance
  from public.profiles p
  left join public.wallets w on w.user_id = p.id
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

notify pgrst, 'reload schema';
