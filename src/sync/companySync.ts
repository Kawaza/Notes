import { supabase } from './supabaseClient';
import { getSessionUserId, isRateLimitError } from './syncUtils';
import { generateInviteCode, normalizeInviteCodeInput } from '../utils/inviteCode';
import type { Company, CompanyMember, WorkspaceFolder, WorkspaceTask, WorkspaceTaskStatus } from '../types/company';
import { profileFullName } from '../types/profile';
import { fetchMyProfile } from './profileSync';

function mapCompany(row: Record<string, unknown>): Company {
  return {
    id: row.id as string,
    name: row.name as string,
    inviteCode: row.invite_code as string,
    ownerId: row.owner_id as string,
    createdAt: row.created_at as string,
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}

function mapFolder(row: Record<string, unknown>): WorkspaceFolder {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    name: row.name as string,
    parentId: (row.parent_id as string | null) ?? null,
    isParent: Boolean(row.is_parent),
    order: (row.sort_order as number) ?? 0,
    archived: Boolean(row.archived),
    calendarColor: (row.calendar_color as string) ?? 'blue',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapWorkspaceTaskRow(row: Record<string, unknown>): WorkspaceTask {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    folderId: row.folder_id as string,
    title: row.title as string,
    content: (row.content as string) ?? '',
    contentType: (row.content_type as 'html' | 'markdown') ?? 'html',
    isTask: Boolean(row.is_task),
    assigneeId: (row.assignee_id as string | null) ?? null,
    status: (row.status as WorkspaceTaskStatus | undefined) ?? 'todo',
    dueAt: (row.due_at as string | undefined) ?? undefined,
    archived: Boolean(row.archived),
    scheduledAt: (row.scheduled_at as string | undefined) ?? undefined,
    scheduledEnd: (row.scheduled_end as string | undefined) ?? undefined,
    order: (row.sort_order as number) ?? 0,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchMyCompanies(): Promise<Company[]> {
  if (!supabase) return [];
  const userId = await getSessionUserId();
  if (!userId) return [];
  const { data: memberships, error: memErr } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId);
  if (memErr) throw memErr;
  const ids = (memberships ?? []).map((m) => m.company_id as string);
  if (!ids.length) return [];

  let { data, error } = await supabase.from('companies').select('*').in('id', ids).is('deleted_at', null);
  if (error?.message?.includes('deleted_at')) {
    const fallback = await supabase.from('companies').select('*').in('id', ids);
    if (fallback.error) throw fallback.error;
    data = fallback.data;
    error = null;
  } else if (error) {
    throw error;
  }
  return (data ?? []).map(mapCompany).filter((c) => !c.deletedAt);
}

export async function fetchDeletedCompaniesForOwner(): Promise<Company[]> {
  if (!supabase) return [];
  const userId = await getSessionUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCompany);
}

export async function restoreCompany(companyId: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync required');
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Not signed in');
  const { error } = await supabase
    .from('companies')
    .update({ deleted_at: null })
    .eq('id', companyId)
    .eq('owner_id', userId);
  if (error) throw error;
}

export async function purgeDeletedCompany(companyId: string): Promise<void> {
  await deleteCompany(companyId);
}

export async function fetchCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('company_members')
    .select('*')
    .eq('company_id', companyId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    companyId: row.company_id as string,
    userId: row.user_id as string,
    role: row.role as CompanyMember['role'],
    displayName: (row.display_name as string | null) ?? null,
    joinedAt: row.joined_at as string,
  }));
}

function formatCompanyCreateError(message: string, code?: string): string {
  const rls =
    message.toLowerCase().includes('row-level security') ||
    message.toLowerCase().includes('permission denied') ||
    code === '42501';
  if (rls) {
    return `${message} In Supabase → SQL editor, run the full script in supabase/patch-company-create.sql, then try again.`;
  }
  if (message.includes('Could not find the function') || code === 'PGRST202') {
    return `${message} Run supabase/patch-company-create.sql in the Supabase SQL editor.`;
  }
  return message;
}

export async function createCompany(name: string): Promise<Company> {
  if (!supabase) throw new Error('Sign in and configure cloud sync first');
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Sign in to create a company folder');
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  const inviteCode = generateInviteCode();
  const profile = await fetchMyProfile();
  const displayName =
    (profile ? profileFullName(profile) : '') || user?.email?.split('@')[0] || 'Owner';

  const { data: rpcData, error: rpcError } = await supabase.rpc('create_company_workspace', {
    p_name: name.trim(),
    p_invite_code: inviteCode,
    p_display_name: displayName,
  });

  if (!rpcError && rpcData) {
    const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Record<string, unknown>;
    return mapCompany(row);
  }

  const rpcMsg = rpcError?.message ?? '';
  const useLegacy =
    rpcError &&
    (rpcMsg.includes('Could not find the function') ||
      rpcMsg.includes('schema cache') ||
      rpcError.code === 'PGRST202');

  if (rpcError && !useLegacy) {
    throw new Error(formatCompanyCreateError(rpcMsg, rpcError.code));
  }

  const { data, error } = await supabase
    .from('companies')
    .insert({ name: name.trim(), invite_code: inviteCode, owner_id: userId })
    .select('*')
    .single();
  if (error) {
    throw new Error(formatCompanyCreateError(error.message, error.code));
  }

  const company = mapCompany(data);
  const { error: memberErr } = await supabase.from('company_members').insert({
    company_id: company.id,
    user_id: userId,
    role: 'owner',
    display_name: displayName,
  });
  if (memberErr) {
    throw new Error(formatCompanyCreateError(memberErr.message, memberErr.code));
  }
  return company;
}

export async function leaveCompany(companyId: string): Promise<void> {
  if (!supabase) throw new Error('Sign in and configure cloud sync first');
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error('Sign in again, then try leaving the workspace.');
  }
  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function softDeleteCompany(companyId: string): Promise<void> {
  if (!supabase) throw new Error('Sign in and configure cloud sync first');
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('companies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', companyId)
    .eq('owner_id', userId)
    .select('id');
  if (error) {
    if (error.message.includes('deleted_at')) {
      throw new Error(
        'Run supabase/patch-company-soft-delete.sql in the Supabase SQL editor, then try again.',
      );
    }
    throw error;
  }
  if (!data?.length) throw new Error('Only the workspace owner can delete it');
}

export async function deleteCompany(companyId: string): Promise<void> {
  if (!supabase) throw new Error('Sign in and configure cloud sync first');
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Not signed in');
  const { data: company, error: readErr } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', companyId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!company || company.owner_id !== userId) {
    throw new Error('Only the workspace owner can delete it');
  }

  const { data, error } = await supabase.from('companies').delete().eq('id', companyId).select('id');
  if (error) {
    const rls =
      error.message.toLowerCase().includes('row-level security') ||
      error.message.toLowerCase().includes('permission denied');
    if (rls) {
      throw new Error(
        `${error.message} Run supabase/patch-company-delete.sql in the Supabase SQL editor, then try again.`,
      );
    }
    throw error;
  }
  if (data?.length) return;

  const { error: rpcError } = await supabase.rpc('delete_company_workspace', {
    p_company_id: companyId,
  });
  if (rpcError) {
    const missingFn =
      rpcError.message.includes('Could not find the function') || rpcError.code === 'PGRST202';
    if (missingFn) {
      throw new Error(
        'Delete was blocked. Run supabase/patch-company-delete.sql in the Supabase SQL editor.',
      );
    }
    throw rpcError;
  }
}

export async function joinCompanyByInvite(inviteCode: string): Promise<string> {
  if (!supabase) throw new Error('Sign in and configure cloud sync first');
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error('Sign in first, then enter your invite code.');
  }

  const code = normalizeInviteCodeInput(inviteCode);
  const client = supabase;
  const run = () => client!.rpc('join_company_by_invite', { p_invite_code: code });

  let result = await run();
  if (result.error && isRateLimitError(result.error)) {
    await new Promise((r) => setTimeout(r, 2500));
    result = await run();
  }
  if (result.error) throw result.error;
  return result.data as string;
}

export async function fetchWorkspaceFolders(companyId: string): Promise<WorkspaceFolder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('workspace_folders')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapFolder);
}

export async function createWorkspaceFolder(
  companyId: string,
  name: string,
  options?: { parentId?: string | null; isParent?: boolean },
): Promise<WorkspaceFolder> {
  if (!supabase) throw new Error('Cloud sync required');
  const { data, error } = await supabase
    .from('workspace_folders')
    .insert({
      company_id: companyId,
      name: name.trim(),
      parent_id: options?.parentId ?? null,
      is_parent: options?.isParent ?? false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapFolder(data);
}

export async function fetchWorkspaceTasks(folderId: string): Promise<WorkspaceTask[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('workspace_tasks')
    .select('*')
    .eq('folder_id', folderId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapWorkspaceTaskRow);
}

export async function createWorkspaceTask(
  companyId: string,
  folderId: string,
  partial?: Partial<Pick<WorkspaceTask, 'title' | 'content' | 'isTask' | 'assigneeId' | 'order'>>,
  taskId?: string,
): Promise<WorkspaceTask> {
  if (!supabase) throw new Error('Cloud sync required');
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Sign in required');

  const { data, error } = await supabase
    .from('workspace_tasks')
    .insert({
      ...(taskId ? { id: taskId } : {}),
      company_id: companyId,
      folder_id: folderId,
      title: partial?.title ?? 'New task',
      content: partial?.content ?? '',
      is_task: partial?.isTask ?? true,
      assignee_id: partial?.assigneeId ?? null,
      sort_order: partial?.order ?? 0,
      created_by: userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapWorkspaceTaskRow(data);
}

export async function updateWorkspaceTaskRow(
  taskId: string,
  patch: Partial<
    Pick<
      WorkspaceTask,
      | 'title'
      | 'content'
      | 'contentType'
      | 'assigneeId'
      | 'scheduledAt'
      | 'scheduledEnd'
      | 'order'
      | 'status'
      | 'dueAt'
      | 'archived'
    >
  >,
): Promise<WorkspaceTask> {
  if (!supabase) throw new Error('Cloud sync required');
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.contentType !== undefined) row.content_type = patch.contentType;
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId;
  if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt;
  if (patch.scheduledEnd !== undefined) row.scheduled_end = patch.scheduledEnd;
  if (patch.order !== undefined) row.sort_order = patch.order;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.dueAt !== undefined) row.due_at = patch.dueAt;
  if (patch.archived !== undefined) row.archived = patch.archived;

  const { data, error } = await supabase
    .from('workspace_tasks')
    .update(row)
    .eq('id', taskId)
    .select('*')
    .single();
  if (error) throw error;
  return mapWorkspaceTaskRow(data);
}

export async function deleteWorkspaceTaskRow(taskId: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync required');
  const { error } = await supabase.from('workspace_tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function fetchMyAssignedWorkspaceTasks(): Promise<WorkspaceTask[]> {
  if (!supabase) return [];
  const userId = await getSessionUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('workspace_tasks')
    .select('*')
    .eq('assignee_id', userId)
    .eq('archived', false)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapWorkspaceTaskRow);
}
