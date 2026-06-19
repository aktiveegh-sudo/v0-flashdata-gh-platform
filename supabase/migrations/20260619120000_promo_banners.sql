-- Image-only promo banners for agent dashboard carousel

create table if not exists public.promo_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_promo_banners_active_sort
  on public.promo_banners (is_active, sort_order asc, created_at desc);

alter table public.promo_banners enable row level security;

drop policy if exists promo_banners_select_active on public.promo_banners;
create policy promo_banners_select_active on public.promo_banners
  for select using (is_active = true);

drop policy if exists promo_banners_admin_manage on public.promo_banners;
create policy promo_banners_admin_manage on public.promo_banners
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

drop trigger if exists trg_promo_banners_updated_at on public.promo_banners;
create trigger trg_promo_banners_updated_at
before update on public.promo_banners
for each row execute function public.set_updated_at();
