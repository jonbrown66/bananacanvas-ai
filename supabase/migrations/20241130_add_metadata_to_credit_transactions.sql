alter table public.credit_transactions 
add column if not exists metadata jsonb default '{}'::jsonb;
