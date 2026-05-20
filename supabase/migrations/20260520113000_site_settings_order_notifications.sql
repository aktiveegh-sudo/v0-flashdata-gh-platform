-- Add compulsory admin order notification allowance
alter table if exists public.site_settings
  add column if not exists order_notifications_enabled boolean not null default false;

update public.site_settings
set order_notifications_enabled = false
where order_notifications_enabled is null;
