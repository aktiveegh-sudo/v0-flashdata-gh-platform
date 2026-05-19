-- Allow admins (and owners) to delete notifications.

begin;

drop policy if exists notifications_delete_own_or_admin on public.notifications;
create policy notifications_delete_own_or_admin
on public.notifications
for delete
using (auth.uid() = user_id or public.is_super_admin(auth.uid()));

notify pgrst, 'reload schema';

commit;
