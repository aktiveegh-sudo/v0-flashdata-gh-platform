-- Expand order status lifecycle: pending -> processing (1 min) -> delivered (14 min)
-- Admin manual updates set status_locked = true to skip auto-progress.

alter table public.orders
  add column if not exists status_locked boolean not null default false;

alter table public.agent_store_orders
  add column if not exists status_locked boolean not null default false;

alter table public.afa_registrations
  add column if not exists status_locked boolean not null default false;

alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status = 'delivered' where status = 'success';
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'processing', 'delivered', 'failed'));

alter table public.agent_store_orders drop constraint if exists agent_store_orders_status_check;
update public.agent_store_orders set status = 'delivered' where status = 'completed';
update public.agent_store_orders set status = 'processing' where status = 'accepted';
alter table public.agent_store_orders
  add constraint agent_store_orders_status_check
  check (status in ('pending', 'processing', 'delivered', 'declined'));

alter table public.afa_registrations drop constraint if exists afa_registrations_status_check;
update public.afa_registrations set status = 'delivered' where status = 'completed';
alter table public.afa_registrations
  add constraint afa_registrations_status_check
  check (status in ('pending', 'processing', 'delivered', 'rejected'));

create index if not exists idx_orders_status_locked_created
  on public.orders (status_locked, status, created_at);

create index if not exists idx_agent_store_orders_status_locked_created
  on public.agent_store_orders (status_locked, status, created_at);

create index if not exists idx_afa_registrations_status_locked_created
  on public.afa_registrations (status_locked, status, created_at);
