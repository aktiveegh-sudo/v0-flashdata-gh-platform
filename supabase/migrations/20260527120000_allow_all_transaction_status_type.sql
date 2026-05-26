-- Allow all transaction types and statuses for wallet topups and data purchases
-- This migration drops restrictive check constraints on the transactions table.

alter table if exists public.transactions
  drop constraint if exists transactions_type_check,
  drop constraint if exists transactions_status_check,
  drop constraint if exists transactions_type_check_wallet;

-- Preserve the amount positive guard while allowing any status/type values.
alter table if exists public.transactions
  drop constraint if exists transactions_amount_check;

alter table if exists public.transactions
  add constraint transactions_amount_check check (amount > 0);
