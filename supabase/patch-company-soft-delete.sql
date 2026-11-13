-- Soft-delete workspaces (owner can restore from Settings → Workspaces).
-- Run in Supabase SQL Editor once.

alter table public.companies
  add column if not exists deleted_at timestamptz;

create index if not exists companies_deleted_at_idx on public.companies (deleted_at)
  where deleted_at is not null;

-- Owners can mark their workspace deleted (data kept for restore).
drop policy if exists "Owner soft delete company" on public.companies;
create policy "Owner soft delete company"
  on public.companies for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
