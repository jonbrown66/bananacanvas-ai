-- Base extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- User profile
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  credits integer default 1000,
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_profiles_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
before update on public.profiles
for each row execute procedure public.handle_profiles_updated();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cover_image text,
  last_modified timestamptz default now(),
  created_at timestamptz default now(),
  is_archived boolean default false
);
create index if not exists projects_owner_idx on public.projects(owner_id);
create index if not exists projects_updated_idx on public.projects(last_modified desc);

-- Messages / nodes
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_role text not null check (author_role in ('user','model')),
  content text,
  image_url text,
  aspect_ratio text,
  parent_id uuid references public.messages(id) on delete set null,
  position_x numeric default 0,
  position_y numeric default 0,
  created_at timestamptz default now()
);
create index if not exists messages_project_idx on public.messages(project_id);
create index if not exists messages_project_parent_idx on public.messages(project_id, parent_id);
create index if not exists messages_created_idx on public.messages(created_at desc);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.messages enable row level security;

-- profiles: only the owner can read/write their own row
create policy profiles_select_self on public.profiles
for select using (auth.uid() = id);
create policy profiles_update_self on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- projects: only the owner can CRUD
create policy projects_crud_owner on public.projects
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- messages: only the project owner can operate
create policy messages_select_owner on public.messages
for select using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy messages_insert_owner on public.messages
for insert with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy messages_update_owner on public.messages
for update using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy messages_delete_owner on public.messages
for delete using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

-- Lemon Squeezy Integration

-- Update profiles table
alter table public.profiles 
add column if not exists lemon_squeezy_customer_id text,
add column if not exists lemon_squeezy_subscription_id text;

-- Orders table (for one-time purchases like credits)
create table if not exists public.lemon_squeezy_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,
  customer_id text not null,
  status text not null,
  total integer not null,
  currency text not null,
  credits_amount integer,
  created_at timestamptz default now()
);

-- Subscriptions table
create table if not exists public.lemon_squeezy_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id text not null unique,
  customer_id text not null,
  status text not null,
  variant_id text not null,
  plan_name text,
  renews_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for new tables
alter table public.lemon_squeezy_orders enable row level security;
alter table public.lemon_squeezy_subscriptions enable row level security;

create policy orders_select_owner on public.lemon_squeezy_orders
for select using (auth.uid() = user_id);

create policy subscriptions_select_owner on public.lemon_squeezy_subscriptions
for select using (auth.uid() = user_id);
