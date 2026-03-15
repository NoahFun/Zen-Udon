-- Supabase schema for restaurant-expense-profit-app
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.master_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  item_name text not null,
  unit_cost numeric not null check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, item_name)
);

create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  revenue numeric not null check (revenue >= 0),
  total_expenses numeric not null,
  profit numeric not null,
  notes text,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.daily_record_rows (
  id uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.master_items(id) on delete set null,
  category text not null,
  item_name text not null,
  unit_cost numeric not null,
  quantity numeric not null,
  amount numeric not null
);

create index if not exists master_items_user_id_idx on public.master_items(user_id);
create index if not exists daily_records_user_id_idx on public.daily_records(user_id);
create index if not exists daily_records_user_date_idx on public.daily_records(user_id, date);
create index if not exists daily_record_rows_user_id_idx on public.daily_record_rows(user_id);
create index if not exists daily_record_rows_record_id_idx on public.daily_record_rows(daily_record_id);

alter table public.profiles enable row level security;
alter table public.master_items enable row level security;
alter table public.daily_records enable row level security;
alter table public.daily_record_rows enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Master items
create policy "master_items_select_own" on public.master_items
  for select using (auth.uid() = user_id);
create policy "master_items_insert_own" on public.master_items
  for insert with check (auth.uid() = user_id);
create policy "master_items_update_own" on public.master_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "master_items_delete_own" on public.master_items
  for delete using (auth.uid() = user_id);

-- Daily records
create policy "daily_records_select_own" on public.daily_records
  for select using (auth.uid() = user_id);
create policy "daily_records_insert_own" on public.daily_records
  for insert with check (auth.uid() = user_id);
create policy "daily_records_update_own" on public.daily_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_records_delete_own" on public.daily_records
  for delete using (auth.uid() = user_id);

-- Daily record rows
create policy "daily_record_rows_select_own" on public.daily_record_rows
  for select using (auth.uid() = user_id);
create policy "daily_record_rows_insert_own" on public.daily_record_rows
  for insert with check (auth.uid() = user_id);
create policy "daily_record_rows_update_own" on public.daily_record_rows
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_record_rows_delete_own" on public.daily_record_rows
  for delete using (auth.uid() = user_id);

-- Optional helper trigger: creates profile row automatically on new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
