-- Dinonotes — full schema for a NEW Supabase project (personal sync + company workspaces).
-- Run once in SQL Editor after creating the project.
--
-- If a previous run failed partway, drop broken objects or use a fresh project,
-- then run this entire file in one go.

-- ---------------------------------------------------------------------------
-- Personal encrypted sync
-- ---------------------------------------------------------------------------
create table if not exists public.user_crypto_meta (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kdf_salt text not null,
  kdf_iterations integer not null default 310000,
  created_at timestamptz not null default now()
);

alter table public.user_crypto_meta enable row level security;

create policy "Users manage own crypto meta"
  on public.user_crypto_meta for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.user_sync_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb,
  data_encrypted text,
  encryption_version smallint not null default 1,
  updated_at timestamptz not null default now(),
  constraint user_sync_data_payload_check check (
    data is not null or data_encrypted is not null
  )
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

-- ---------------------------------------------------------------------------
-- Company / shared workspaces (must exist before user_profiles coworker policy)
-- ---------------------------------------------------------------------------
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
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_tasks_folder_idx on public.workspace_tasks (folder_id);
create index if not exists workspace_tasks_assignee_idx on public.workspace_tasks (assignee_id);

-- Profiles (after company_members — coworker read policy references it)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users read own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users read profiles of company coworkers"
  on public.user_profiles for select
  using (
    exists (
      select 1
      from public.company_members me
      join public.company_members them on them.company_id = me.company_id
      where me.user_id = auth.uid()
        and them.user_id = user_profiles.user_id
    )
  );

create policy "Users update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

create policy "Users insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RLS helpers + company policies
-- ---------------------------------------------------------------------------
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

grant execute on function public.is_company_member(uuid) to authenticated;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.workspace_folders enable row level security;
alter table public.workspace_tasks enable row level security;

create policy "Members read companies"
  on public.companies for select
  using (public.is_company_member(id) or auth.uid() = owner_id);

create policy "Authenticated create company"
  on public.companies for insert
  with check (auth.uid() = owner_id);

create policy "Owner update company"
  on public.companies for update
  using (auth.uid() = owner_id);

create policy "Members read membership"
  on public.company_members for select
  using (public.is_company_member(company_id) or user_id = auth.uid());

create policy "User joins company"
  on public.company_members for insert
  with check (auth.uid() = user_id);

create policy "Owner removes members"
  on public.company_members for delete
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid()
    )
  );

create policy "Members read workspace folders"
  on public.workspace_folders for select
  using (public.is_company_member(company_id));

create policy "Members manage workspace folders"
  on public.workspace_folders for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

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

-- Realtime (ignore errors if already in publication)
do $$
begin
  alter publication supabase_realtime add table public.user_sync_data;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.workspace_folders;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.workspace_tasks;
exception when duplicate_object then null;
end $$;
