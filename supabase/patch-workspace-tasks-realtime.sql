-- Enable live updates for shared workspace tasks (Supabase Realtime).
do $$
begin
  alter publication supabase_realtime add table public.workspace_tasks;
exception
  when duplicate_object then null;
end $$;
