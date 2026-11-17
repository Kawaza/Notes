-- Shared workspace member calendars (time blocks visible to coworkers in the same workspace).

create or replace function public.shares_workspace_with(p_other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members me
    join public.company_members them on them.company_id = me.company_id
    where me.user_id = auth.uid()
      and them.user_id = p_other
  );
$$;

create table if not exists public.member_calendar_blocks (
  id uuid primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Planning',
  content text not null default '',
  content_type text not null default 'html' check (content_type in ('html', 'markdown')),
  scheduled_at timestamptz not null,
  scheduled_end timestamptz,
  calendar_color text,
  linked_task_id text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists member_calendar_blocks_owner_idx
  on public.member_calendar_blocks (owner_user_id, scheduled_at);

alter table public.member_calendar_blocks enable row level security;

create policy "Coworkers read member calendars"
  on public.member_calendar_blocks for select
  using (
    auth.uid() = owner_user_id
    or public.shares_workspace_with(owner_user_id)
  );

create policy "Coworkers write member calendars"
  on public.member_calendar_blocks for insert
  with check (
    auth.uid() = owner_user_id
    or public.shares_workspace_with(owner_user_id)
  );

create policy "Coworkers update member calendars"
  on public.member_calendar_blocks for update
  using (
    auth.uid() = owner_user_id
    or public.shares_workspace_with(owner_user_id)
  )
  with check (
    auth.uid() = owner_user_id
    or public.shares_workspace_with(owner_user_id)
  );

create policy "Coworkers delete member calendars"
  on public.member_calendar_blocks for delete
  using (
    auth.uid() = owner_user_id
    or public.shares_workspace_with(owner_user_id)
  );

alter table public.member_calendar_blocks replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.member_calendar_blocks;
exception
  when duplicate_object then null;
end $$;