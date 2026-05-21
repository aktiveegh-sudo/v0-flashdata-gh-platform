begin;

alter table public.wallets
  add column if not exists total_credited numeric(12,2) not null default 0,
  add column if not exists total_debited numeric(12,2) not null default 0,
  add column if not exists last_topup_at timestamptz;

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta numeric(12,2) not null,
  balance_before numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  reason text,
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.wallet_ledger enable row level security;

create policy if not exists wallet_ledger_owner_select
  on public.wallet_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists wallet_ledger_admin_select
  on public.wallet_ledger
  for select
  to authenticated
  using (public.is_super_admin(auth.uid()));

create index if not exists idx_wallet_ledger_user_created_at
  on public.wallet_ledger (user_id, created_at desc);

create index if not exists idx_wallet_ledger_wallet_created_at
  on public.wallet_ledger (wallet_id, created_at desc);

create or replace function public.wallet_apply_delta(
  p_user_id uuid,
  p_delta numeric,
  p_reason text default null,
  p_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  wallet_id uuid,
  balance_before numeric,
  balance_after numeric,
  applied_delta numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
  v_before numeric;
  v_after numeric;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if coalesce(p_delta, 0) = 0 then
    raise exception 'delta must be non-zero';
  end if;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    insert into public.wallets (user_id, balance)
    values (p_user_id, 0)
    returning * into v_wallet;
  end if;

  v_before := coalesce(v_wallet.balance, 0);
  v_after := v_before + p_delta;

  if v_after < 0 then
    raise exception 'Insufficient wallet balance';
  end if;

  update public.wallets
  set balance = v_after,
      total_credited = total_credited + case when p_delta > 0 then p_delta else 0 end,
      total_debited = total_debited + case when p_delta < 0 then abs(p_delta) else 0 end,
      last_topup_at = case when p_delta > 0 then now() else last_topup_at end,
      last_updated = now()
  where id = v_wallet.id;

  insert into public.wallet_ledger (
    wallet_id,
    user_id,
    delta,
    balance_before,
    balance_after,
    reason,
    reference,
    metadata
  )
  values (
    v_wallet.id,
    p_user_id,
    p_delta,
    v_before,
    v_after,
    p_reason,
    p_reference,
    coalesce(p_metadata, '{}'::jsonb)
  );

  wallet_id := v_wallet.id;
  balance_before := v_before;
  balance_after := v_after;
  applied_delta := p_delta;
  return next;
end;
$$;

grant execute on function public.wallet_apply_delta(uuid, numeric, text, text, jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
