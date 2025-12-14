-- Create credit_transactions table
create table if not exists public.credit_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  source text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.credit_transactions enable row level security;

-- Policies
create policy "Users can view their own credit transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own credit transactions"
  on public.credit_transactions for insert
  with check (auth.uid() = user_id);

-- Grant access
grant select, insert on public.credit_transactions to authenticated;
grant select, insert on public.credit_transactions to service_role;
