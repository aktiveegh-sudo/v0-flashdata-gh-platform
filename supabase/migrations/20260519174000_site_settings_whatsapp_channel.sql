-- Add global WhatsApp channel link setting managed by admin.

begin;

alter table if exists public.site_settings
  add column if not exists whatsapp_channel_url text;

notify pgrst, 'reload schema';

commit;
