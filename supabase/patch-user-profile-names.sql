-- First / last name on profiles (run in Supabase SQL editor).

alter table public.user_profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

-- Backfill display_name into first_name when empty (best effort)
update public.user_profiles
set first_name = coalesce(nullif(trim(first_name), ''), nullif(trim(display_name), ''))
where first_name is null or trim(first_name) = '';
