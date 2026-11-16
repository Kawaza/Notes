-- Live workspace delete/rename for all members when companies row changes.
do $$
begin
  alter publication supabase_realtime add table public.companies;
exception
  when duplicate_object then null;
end $$;

alter table public.companies replica identity full;