begin;

alter table if exists public.site_settings
  add column if not exists hero_video_url text;

notify pgrst, 'reload schema';

commit;
