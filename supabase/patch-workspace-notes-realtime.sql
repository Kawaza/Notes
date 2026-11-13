-- Enable live updates for shared workspace notes (Supabase Realtime).
do $$
begin
  alter publication supabase_realtime add table public.workspace_notes;
exception
  when duplicate_object then null;
end $$;
