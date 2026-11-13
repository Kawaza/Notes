-- Allow members (non-owners) to leave a workspace by deleting their own membership row.

drop policy if exists "Members leave company" on public.company_members;

create policy "Members leave company"
  on public.company_members for delete
  to authenticated
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
