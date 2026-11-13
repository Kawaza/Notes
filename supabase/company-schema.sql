-- Company / shared workspace schema (run after schema.sql in Supabase SQL editor).
-- Enables invite-code join, shared folder trees, and assignable tasks.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists companies_invite_code_idx on public.companies (invite_code);

create table if not exists public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.workspace_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  parent_id uuid references public.workspace_folders (id) on delete cascade,
  is_parent boolean not null default false,
  sort_order integer not null default 0,
  archived boolean not null default false,
  calendar_color text default 'blue',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_folders_company_idx on public.workspace_folders (company_id);

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  folder_id uuid not null references public.workspace_folders (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  content_type text not null default 'html' check (content_type in ('html', 'markdown')),
  is_task boolean not null default true,
  assignee_id uuid references auth.users (id) on delete set null,
  scheduled_at timestamptz,
  scheduled_end timestamptz,
  sort_order integer not null default 0,
  created_by uuid not null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_tasks_folder_idx on public.workspace_tasks (folder_id);
create index if not exists workspace_tasks_assignee_idx on public.workspace_tasks (assignee_id);

-- RLS
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.workspace_folders enable row level security;
alter table public.workspace_tasks enable row level security;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = p_company_id and m.user_id = auth.uid()
  );
$$;

-- Companies: members can read; anyone authenticated can create; owner can update name
create policy "Members read companies"
  on public.companies for select
  using (public.is_company_member(id) or auth.uid() = owner_id);

create policy "Authenticated create company"
  on public.companies for insert
  with check (auth.uid() = owner_id);

create policy "Owner update company"
  on public.companies for update
  using (auth.uid() = owner_id);

-- Members table
create policy "Members read membership"
  on public.company_members for select
  using (public.is_company_member(company_id) or user_id = auth.uid());

create policy "User joins company"
  on public.company_members for insert
  with check (auth.uid() = user_id);

create policy "Owner manages members"
  on public.company_members for delete
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid()
    )
  );

-- Folders
create policy "Members read workspace folders"
  on public.workspace_folders for select
  using (public.is_company_member(company_id));

create policy "Members manage workspace folders"
  on public.workspace_folders for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Tasks
create policy "Members read workspace tasks"
  on public.workspace_tasks for select
  using (public.is_company_member(company_id));

create policy "Members manage workspace tasks"
  on public.workspace_tasks for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

create or replace function public.create_company_workspace(
  p_name text,
  p_invite_code text,
  p_display_name text default null
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.companies;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if trim(p_name) = '' then
    raise exception 'Name required';
  end if;
  insert into public.companies (name, invite_code, owner_id)
  values (trim(p_name), upper(trim(p_invite_code)), v_uid)
  returning * into v_row;
  insert into public.company_members (company_id, user_id, role, display_name)
  values (
    v_row.id,
    v_uid,
    'owner',
    coalesce(nullif(trim(p_display_name), ''), 'Owner')
  );
  return v_row;
end;
$$;

grant execute on function public.create_company_workspace(text, text, text) to authenticated;

-- Join via invite without exposing all companies
create or replace function public.join_company_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_code text := upper(trim(p_invite_code));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select id into v_company_id from public.companies where invite_code = v_code;
  if v_company_id is null then
    raise exception 'Invalid invite code';
  end if;
  insert into public.company_members (company_id, user_id, role)
  values (v_company_id, auth.uid(), 'member')
  on conflict do nothing;
  return v_company_id;
end;
$$;

grant execute on function public.join_company_by_invite(text) to authenticated;

-- Realtime (optional)
alter publication supabase_realtime add table public.workspace_folders;
alter publication supabase_realtime add table public.workspace_tasks;
