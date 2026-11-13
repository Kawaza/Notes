import { supabase } from './supabaseClient';
import { getSessionUserId } from './syncUtils';
import type { FolderSecretType, Note, NoteAttachment } from '../types';
import type {
  WorkspaceFolder,
  WorkspaceFolderLink,
  WorkspaceFolderSecret,
  WorkspaceNote,
} from '../types/company';

function mapNote(row: Record<string, unknown>): WorkspaceNote {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    folderId: row.folder_id as string,
    title: (row.title as string) ?? '',
    content: (row.content as string) ?? '',
    contentType: (row.content_type as 'html' | 'markdown') ?? 'html',
    tags: (row.tags as string[]) ?? [],
    pinned: Boolean(row.pinned),
    archived: Boolean(row.archived),
    attachments: (row.attachments as NoteAttachment[]) ?? [],
    order: (row.sort_order as number) ?? 0,
    calendarColor: (row.calendar_color as string) ?? undefined,
    scheduledAt: (row.scheduled_at as string) ?? undefined,
    scheduledEnd: (row.scheduled_end as string) ?? undefined,
    isTask: Boolean(row.is_task),
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapLink(row: Record<string, unknown>): WorkspaceFolderLink {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    folderId: row.folder_id as string,
    title: (row.title as string) ?? '',
    url: (row.url as string) ?? '',
    order: (row.sort_order as number) ?? 0,
    pinned: Boolean(row.pinned),
    createdAt: row.created_at as string,
  };
}

function mapSecret(row: Record<string, unknown>): WorkspaceFolderSecret {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    folderId: row.folder_id as string,
    title: (row.title as string) ?? '',
    type: (row.secret_type as FolderSecretType) ?? 'password',
    value: (row.value as string) ?? '',
    username: (row.username as string) ?? undefined,
    linkId: (row.link_id as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    order: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
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

export async function fetchWorkspaceFolderContent(folderId: string): Promise<{
  notes: WorkspaceNote[];
  links: WorkspaceFolderLink[];
  secrets: WorkspaceFolderSecret[];
}> {
  if (!supabase) return { notes: [], links: [], secrets: [] };
  const [notesRes, linksRes, secretsRes] = await Promise.all([
    supabase
      .from('workspace_notes')
      .select('*')
      .eq('folder_id', folderId)
      .eq('is_task', false)
      .order('sort_order', { ascending: true }),
    supabase
      .from('workspace_folder_links')
      .select('*')
      .eq('folder_id', folderId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('workspace_folder_secrets')
      .select('*')
      .eq('folder_id', folderId)
      .order('sort_order', { ascending: true }),
  ]);

  if (notesRes.error) throw notesRes.error;
  if (linksRes.error) throw linksRes.error;
  if (secretsRes.error) throw secretsRes.error;

  return {
    notes: (notesRes.data ?? []).map(mapNote),
    links: (linksRes.data ?? []).map(mapLink),
    secrets: (secretsRes.data ?? []).map(mapSecret),
  };
}

export async function createWorkspaceNote(
  companyId: string,
  folderId: string,
  title = 'Untitled',
  order = 0,
  noteId?: string,
): Promise<WorkspaceNote> {
  if (!supabase) throw new Error('Cloud sync required');
  const userId = await getSessionUserId();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('workspace_notes')
    .insert({
      ...(noteId ? { id: noteId } : {}),
      company_id: companyId,
      folder_id: folderId,
      title,
      content: '',
      content_type: 'html',
      tags: [],
      attachments: [],
      sort_order: order,
      is_task: false,
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapNote(data);
}

export type WorkspaceNoteUpdateResult = WorkspaceNote | 'conflict';

export async function fetchWorkspaceNoteById(noteId: string): Promise<WorkspaceNote | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('workspace_notes').select('*').eq('id', noteId).maybeSingle();
  if (error || !data) return null;
  return mapNote(data);
}

export async function updateWorkspaceNoteRow(
  noteId: string,
  patch: Partial<
    Pick<
      WorkspaceNote,
      | 'title'
      | 'content'
      | 'contentType'
      | 'tags'
      | 'pinned'
      | 'attachments'
      | 'order'
      | 'calendarColor'
      | 'scheduledAt'
      | 'scheduledEnd'
    >
  >,
  options?: { ifUnmodifiedSince?: string },
): Promise<WorkspaceNoteUpdateResult> {
  if (!supabase) throw new Error('Cloud sync required');
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.contentType !== undefined) row.content_type = patch.contentType;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.pinned !== undefined) row.pinned = patch.pinned;
  if (patch.attachments !== undefined) row.attachments = patch.attachments;
  if (patch.order !== undefined) row.sort_order = patch.order;
  if (patch.calendarColor !== undefined) row.calendar_color = patch.calendarColor;
  if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt ?? null;
  if (patch.scheduledEnd !== undefined) row.scheduled_end = patch.scheduledEnd ?? null;

  let query = supabase.from('workspace_notes').update(row).eq('id', noteId);
  if (options?.ifUnmodifiedSince) {
    query = query.eq('updated_at', options.ifUnmodifiedSince);
  }
  const { data, error } = await query.select('*').maybeSingle();
  if (error) throw error;
  if (!data) return 'conflict';
  return mapNote(data);
}

export async function deleteWorkspaceNoteRow(noteId: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync required');
  const { error } = await supabase.from('workspace_notes').delete().eq('id', noteId);
  if (error) throw error;
}

export async function createWorkspaceFolderLink(
  companyId: string,
  folderId: string,
  title: string,
  url: string,
  order: number,
): Promise<WorkspaceFolderLink> {
  if (!supabase) throw new Error('Cloud sync required');
  const { data, error } = await supabase
    .from('workspace_folder_links')
    .insert({
      company_id: companyId,
      folder_id: folderId,
      title,
      url,
      sort_order: order,
      pinned: false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapLink(data);
}

export async function updateWorkspaceFolderLinkRow(
  linkId: string,
  patch: Partial<Pick<WorkspaceFolderLink, 'title' | 'url' | 'order' | 'pinned'>>,
): Promise<WorkspaceFolderLink> {
  if (!supabase) throw new Error('Cloud sync required');
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.url !== undefined) row.url = patch.url;
  if (patch.order !== undefined) row.sort_order = patch.order;
  if (patch.pinned !== undefined) row.pinned = patch.pinned;
  const { data, error } = await supabase
    .from('workspace_folder_links')
    .update(row)
    .eq('id', linkId)
    .select('*')
    .single();
  if (error) throw error;
  return mapLink(data);
}

export async function deleteWorkspaceFolderLinkRow(linkId: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync required');
  const { error } = await supabase.from('workspace_folder_links').delete().eq('id', linkId);
  if (error) throw error;
}

export async function createWorkspaceFolderSecret(
  companyId: string,
  folderId: string,
  data: {
    title: string;
    type: FolderSecretType;
    value: string;
    username?: string;
    linkId?: string;
    notes?: string;
  },
  order: number,
): Promise<WorkspaceFolderSecret> {
  if (!supabase) throw new Error('Cloud sync required');
  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from('workspace_folder_secrets')
    .insert({
      company_id: companyId,
      folder_id: folderId,
      title: data.title,
      secret_type: data.type,
      value: data.value,
      username: data.username ?? null,
      link_id: data.linkId ?? null,
      notes: data.notes ?? null,
      sort_order: order,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapSecret(row);
}

export async function updateWorkspaceFolderSecretRow(
  secretId: string,
  data: {
    title: string;
    type: FolderSecretType;
    value: string;
    username?: string;
    linkId?: string;
    notes?: string;
  },
): Promise<WorkspaceFolderSecret> {
  if (!supabase) throw new Error('Cloud sync required');
  const { data: row, error } = await supabase
    .from('workspace_folder_secrets')
    .update({
      title: data.title,
      secret_type: data.type,
      value: data.value,
      username: data.username ?? null,
      link_id: data.linkId ?? null,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', secretId)
    .select('*')
    .single();
  if (error) throw error;
  return mapSecret(row);
}

export async function deleteWorkspaceFolderSecretRow(secretId: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync required');
  const { error } = await supabase.from('workspace_folder_secrets').delete().eq('id', secretId);
  if (error) throw error;
}

export async function updateWorkspaceFolderRow(
  folderId: string,
  patch: Partial<Pick<WorkspaceFolder, 'name' | 'parentId' | 'isParent' | 'order' | 'calendarColor' | 'archived'>>,
): Promise<WorkspaceFolder> {
  if (!supabase) throw new Error('Cloud sync required');
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.parentId !== undefined) row.parent_id = patch.parentId;
  if (patch.isParent !== undefined) row.is_parent = patch.isParent;
  if (patch.order !== undefined) row.sort_order = patch.order;
  if (patch.calendarColor !== undefined) row.calendar_color = patch.calendarColor;
  if (patch.archived !== undefined) row.archived = patch.archived;
  const { data, error } = await supabase
    .from('workspace_folders')
    .update(row)
    .eq('id', folderId)
    .select('*')
    .single();
  if (error) throw error;
  return mapFolder(data);
}

export async function deleteWorkspaceFolderRow(folderId: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync required');
  const { error } = await supabase.from('workspace_folders').delete().eq('id', folderId);
  if (error) throw error;
}

/** Map partial Note patch from UI into workspace row patch */
export function notePatchFromUi(partial: Partial<Note>): Parameters<typeof updateWorkspaceNoteRow>[1] {
  const patch: Parameters<typeof updateWorkspaceNoteRow>[1] = {};
  if (partial.title !== undefined) patch.title = partial.title;
  if (partial.content !== undefined) patch.content = partial.content;
  if (partial.contentType !== undefined) patch.contentType = partial.contentType;
  if (partial.tags !== undefined) patch.tags = partial.tags;
  if (partial.pinned !== undefined) patch.pinned = partial.pinned;
  if (partial.attachments !== undefined) patch.attachments = partial.attachments;
  if (partial.order !== undefined) patch.order = partial.order;
  if (partial.calendarColor !== undefined) patch.calendarColor = partial.calendarColor;
  if (partial.scheduledAt !== undefined) patch.scheduledAt = partial.scheduledAt;
  if (partial.scheduledEnd !== undefined) patch.scheduledEnd = partial.scheduledEnd;
  return patch;
}
