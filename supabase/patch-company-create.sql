-- Company workspace fix (run once in Supabase → SQL editor).
-- Fixes: create failures, RLS on companies / company_members, create_company_workspace RPC.

-- Tables (safe if already exist)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

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

grant select, insert, update on public.companies to authenticated;
grant select, insert, delete on public.company_members to authenticated;

drop policy if exists "Members read companies" on public.companies;
drop policy if exists "Authenticated create company" on public.companies;
drop policy if exists "Owner update company" on public.companies;

create policy "Members read companies"
  on public.companies for select
  to authenticated
  using (public.is_company_member(id) or auth.uid() = owner_id);

create policy "Authenticated create company"
  on public.companies for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owner update company"
  on public.companies for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Members read membership" on public.company_members;
drop policy if exists "User joins company" on public.company_members;
drop policy if exists "Owner removes members" on public.company_members;

create policy "Members read membership"
  on public.company_members for select
  to authenticated
  using (public.is_company_member(company_id) or user_id = auth.uid());

create policy "User joins company"
  on public.company_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Owner removes members"
  on public.company_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid()
    )
  );

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

-- Refresh PostgREST schema cache (optional; Supabase usually picks up within a minute)
notify pgrst, 'reload schema';
