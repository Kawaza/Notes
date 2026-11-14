-- Realtime DELETE events need folder_id in payload (not only primary key).
alter table public.workspace_tasks replica identity full;
alter table public.workspace_notes replica identity full;
alter table public.workspace_folders replica identity full;
