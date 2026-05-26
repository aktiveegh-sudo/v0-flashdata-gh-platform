-- Fix transactions table constraints to support wallet topups

-- Drop existing constraints
alter table if exists public.transactions
  drop constraint if exists transactions_type_check,
  drop constraint if exists transactions_status_check;

-- Re-add with correct allowed values
alter table if exists public.transactions
  add constraint transactions_type_check 
    check (type in ('data_purchase', 'airtime', 'online_service', 'withdrawal', 'funding', 'wallet', 'store_sale')),
  add constraint transactions_status_check 
    check (status in ('pending', 'success', 'failed'));

-- Ensure amount constraint is correct
alter table if exists public.transactions
  drop constraint if exists transactions_amount_check;

alter table if exists public.transactions
  add constraint transactions_amount_check check (amount > 0);
