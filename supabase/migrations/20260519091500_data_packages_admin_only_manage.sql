-- Enforce admin-only management of base data packages.

alter table if exists public.data_packages enable row level security;

drop policy if exists data_packages_select_active_or_admin on public.data_packages;
create policy data_packages_select_active_or_admin
on public.data_packages
for select
using (is_active = true or public.is_super_admin(auth.uid()));

drop policy if exists data_packages_admin_manage on public.data_packages;
create policy data_packages_admin_manage
on public.data_packages
for all
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

notify pgrst, 'reload schema';
