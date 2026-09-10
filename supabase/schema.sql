-- Run this in the Supabase SQL editor for your project.
-- Dashboard → SQL → New query → paste → Run

create table if not exists public.user_sync_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_sync_data enable row level security;

create policy "Users read own sync data"
  on public.user_sync_data for select
  using (auth.uid() = user_id);

create policy "Users insert own sync data"
  on public.user_sync_data for insert
  with check (auth.uid() = user_id);

create policy "Users update own sync data"
  on public.user_sync_data for update
  using (auth.uid() = user_id);

-- Enable Realtime (step 1.3): run this in SQL Editor, OR use Database → Publications → supabase_realtime
alter publication supabase_realtime add table public.user_sync_data;
