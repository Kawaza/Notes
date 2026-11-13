-- Allow workspace owners to delete their workspace (cascades folders, tasks, members).
drop policy if exists "Owner delete company" on public.companies;

create policy "Owner delete company"
  on public.companies for delete
  using (auth.uid() = owner_id);

create or replace function public.delete_company_workspace(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (
    select 1 from public.companies c
    where c.id = p_company_id and c.owner_id = v_uid
  ) then
    raise exception 'Only the workspace owner can delete it';
  end if;
  delete from public.companies where id = p_company_id;
end;
$$;

grant execute on function public.delete_company_workspace(uuid) to authenticated;
