begin;

insert into public.app_secrets (key, value, description, is_secret)
values
  (
    'USMSGH_API_TOKEN',
    '2526|kCNHs4OhN90L8UthWiKapVktyVlceR1RsTXYtmBafed0b666',
    'Bearer token for USMS-GH purchase SMS notifications.',
    true
  ),
  (
    'USMSGH_SENDER_ID',
    '',
    'Approved USMS-GH sender ID (max 11 chars). Request one in the USMS-GH portal under Sending.',
    false
  )
on conflict (key) do update
set
  value = excluded.value,
  description = excluded.description,
  is_secret = excluded.is_secret,
  updated_at = now()
where trim(coalesce(public.app_secrets.value, '')) = '';

notify pgrst, 'reload schema';

commit;
