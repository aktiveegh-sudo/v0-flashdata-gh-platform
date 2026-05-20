-- Add switchable delivery provider setting for payment fulfillment
alter table if exists public.site_settings
  add column if not exists delivery_provider text not null default 'swiftdata';

alter table if exists public.site_settings
  drop constraint if exists site_settings_delivery_provider_chk;

alter table if exists public.site_settings
  add constraint site_settings_delivery_provider_chk
  check (delivery_provider in ('swiftdata', 'secondary'));

update public.site_settings
set delivery_provider = 'swiftdata'
where delivery_provider is null;
