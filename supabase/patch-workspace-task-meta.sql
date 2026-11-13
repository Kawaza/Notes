-- Task status, deadline, archive for company workspace (run after company tables exist).

alter table public.workspace_tasks
  add column if not exists status text not null default 'todo',
  add column if not exists due_at timestamptz,
  add column if not exists archived boolean not null default false;

alter table public.workspace_tasks
  drop constraint if exists workspace_tasks_status_check;

alter table public.workspace_tasks
  add constraint workspace_tasks_status_check
  check (status in ('todo', 'in_progress', 'on_hold', 'in_review', 'complete'));

alter table public.workspace_notes
  add column if not exists archived boolean not null default false;

create index if not exists workspace_tasks_archived_idx on public.workspace_tasks (folder_id, archived);
create index if not exists workspace_notes_archived_idx on public.workspace_notes (folder_id, archived);
