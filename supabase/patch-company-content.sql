-- Company folder content: notes, links, secrets (run after patch-company-create.sql).
-- Safe to re-run.

create table if not exists public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  folder_id uuid not null references public.workspace_folders (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  content_type text not null default 'html' check (content_type in ('html', 'markdown')),
  tags jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  calendar_color text,
  scheduled_at timestamptz,
  scheduled_end timestamptz,
  is_task boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_notes_folder_idx on public.workspace_notes (folder_id);

create table if not exists public.workspace_folder_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  folder_id uuid not null references public.workspace_folders (id) on delete cascade,
  title text not null default '',
  url text not null default '',
  sort_order integer not null default 0,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists workspace_folder_links_folder_idx on public.workspace_folder_links (folder_id);

create table if not exists public.workspace_folder_secrets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  folder_id uuid not null references public.workspace_folders (id) on delete cascade,
  title text not null default '',
  secret_type text not null default 'password',
  value text not null default '',
  username text,
  link_id uuid references public.workspace_folder_links (id) on delete set null,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_folder_secrets_folder_idx on public.workspace_folder_secrets (folder_id);

alter table public.workspace_notes enable row level security;
alter table public.workspace_folder_links enable row level security;
alter table public.workspace_folder_secrets enable row level security;

grant select, insert, update, delete on public.workspace_notes to authenticated;
grant select, insert, update, delete on public.workspace_folder_links to authenticated;
grant select, insert, update, delete on public.workspace_folder_secrets to authenticated;

drop policy if exists "Members manage workspace notes" on public.workspace_notes;
create policy "Members manage workspace notes"
  on public.workspace_notes for all
  to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "Members manage workspace links" on public.workspace_folder_links;
create policy "Members manage workspace links"
  on public.workspace_folder_links for all
  to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "Members manage workspace secrets" on public.workspace_folder_secrets;
create policy "Members manage workspace secrets"
  on public.workspace_folder_secrets for all
  to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

notify pgrst, 'reload schema';
