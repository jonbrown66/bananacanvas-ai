-- Change default credits to 100
alter table public.profiles 
alter column credits set default 100;

-- Update the handle_new_user function to ensure it uses the new default or explicitly sets it
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    100 -- Explicitly set to 100
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
