-- Fix transactions table constraints to support wallet topups
-- Ensures wallet type is allowed in transactions

do $$
begin
  -- Try to add wallet to type check if it doesn't exist
  begin
    alter table public.transactions
      add constraint transactions_type_check_wallet 
      check (type in ('data_purchase', 'airtime', 'online_service', 'withdrawal', 'funding', 'wallet', 'store_sale'));
  exception when duplicate_object then
    -- Constraint already exists, ignore
    null;
  end;
end $$;

-- Ensure status check allows the three states
do $$
begin
  alter table public.transactions
    add constraint transactions_status_check 
    check (status in ('pending', 'success', 'failed'));
exception when duplicate_object then
  null;
end $$;

-- Ensure amount is positive
do $$
begin
  alter table public.transactions
    add constraint transactions_amount_check 
    check (amount > 0);
exception when duplicate_object then
  null;
end $$;
