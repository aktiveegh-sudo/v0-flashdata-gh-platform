-- Dashboard feature tables: referrals, sub-agents, loyalty, announcements

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists loyalty_points integer not null default 0,
  add column if not exists streak_count integer not null default 0,
  add column if not exists last_streak_claim date;

create unique index if not exists idx_profiles_referral_code
  on public.profiles(referral_code)
  where referral_code is not null;

alter table public.site_settings
  add column if not exists show_announcement boolean not null default false,
  add column if not exists announcement_title text,
  add column if not exists announcement_message text;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid references public.profiles(id) on delete set null,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending', 'joined', 'rewarded')),
  reward_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_referrals_referrer_created
  on public.referrals(referrer_id, created_at desc);

create table if not exists public.sub_agents (
  id uuid primary key default gen_random_uuid(),
  parent_agent_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  commission_rate numeric(5,2) not null default 5.00 check (commission_rate >= 0 and commission_rate <= 100),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sub_agents_parent_status
  on public.sub_agents(parent_agent_id, status);

create or replace function public.ensure_profile_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null or btrim(new.referral_code) = '' then
    new.referral_code := upper(substring(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_referral_code on public.profiles;
create trigger trg_profiles_referral_code
before insert or update on public.profiles
for each row
execute function public.ensure_profile_referral_code();

alter table public.referrals enable row level security;
alter table public.sub_agents enable row level security;

drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own
on public.referrals
for select
using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

drop policy if exists referrals_insert_own on public.referrals;
create policy referrals_insert_own
on public.referrals
for insert
with check (auth.uid() = referrer_id);

drop policy if exists sub_agents_select_related on public.sub_agents;
create policy sub_agents_select_related
on public.sub_agents
for select
using (auth.uid() = parent_agent_id or auth.uid() = user_id);

drop policy if exists sub_agents_insert_parent on public.sub_agents;
create policy sub_agents_insert_parent
on public.sub_agents
for insert
with check (auth.uid() = parent_agent_id);

drop policy if exists sub_agents_update_parent on public.sub_agents;
create policy sub_agents_update_parent
on public.sub_agents
for update
using (auth.uid() = parent_agent_id);

-- Backfill referral codes for existing profiles
update public.profiles
set referral_code = upper(substring(replace(id::text, '-', ''), 1, 8))
where referral_code is null or btrim(referral_code) = '';
