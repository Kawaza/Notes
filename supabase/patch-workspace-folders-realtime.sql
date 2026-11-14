-- Live sidebar updates when teammates create, rename, or delete shared folders.
do $$
begin
  alter publication supabase_realtime add table public.workspace_folders;
exception
  when duplicate_object then null;
end $$;

alter table public.workspace_folders replica identity full;
