import type { FolderSecretType, NoteAttachment } from './index';

/** Prefix for sidebar selection ids that point at shared workspace folders. */
export const WORKSPACE_FOLDER_PREFIX = 'wsf:';
export const WORKSPACE_FOLDER_ARCHIVE_PREFIX = 'wsf-archive:';
export const WORKSPACE_NOTE_PREFIX = 'wsn:';
export const WORKSPACE_TASK_PREFIX = 'wst:';

export const WORKSPACE_TASK_STATUSES = [
  'todo',
  'in_progress',
  'on_hold',
  'in_review',
  'complete',
] as const;

export type WorkspaceTaskStatus = (typeof WORKSPACE_TASK_STATUSES)[number];

export const WORKSPACE_TASK_STATUS_LABELS: Record<WorkspaceTaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  in_review: 'In Review',
  complete: 'Complete',
};

export type CompanyRole = 'owner' | 'member';

export interface Company {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface CompanyMember {
  companyId: string;
  userId: string;
  role: CompanyRole;
  displayName: string | null;
  joinedAt: string;
}

export interface WorkspaceFolder {
  id: string;
  companyId: string;
  name: string;
  parentId: string | null;
  isParent: boolean;
  order: number;
  archived: boolean;
  calendarColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTask {
  id: string;
  companyId: string;
  folderId: string;
  title: string;
  content: string;
  contentType: 'html' | 'markdown';
  isTask: boolean;
  assigneeId: string | null;
  status: WorkspaceTaskStatus;
  dueAt?: string;
  archived: boolean;
  scheduledAt?: string;
  scheduledEnd?: string;
  order: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function workspaceFolderSelectionId(folderId: string): string {
  return `${WORKSPACE_FOLDER_PREFIX}${folderId}`;
}

export function parseWorkspaceFolderSelectionId(
  selectedId: string | null,
): { folderId: string } | null {
  if (!selectedId) return null;
  if (selectedId.startsWith(WORKSPACE_FOLDER_ARCHIVE_PREFIX)) {
    return { folderId: selectedId.slice(WORKSPACE_FOLDER_ARCHIVE_PREFIX.length) };
  }
  if (!selectedId.startsWith(WORKSPACE_FOLDER_PREFIX)) return null;
  return { folderId: selectedId.slice(WORKSPACE_FOLDER_PREFIX.length) };
}

export function isWorkspaceArchiveSelectionId(selectedId: string | null): boolean {
  return Boolean(selectedId?.startsWith(WORKSPACE_FOLDER_ARCHIVE_PREFIX));
}

export function workspaceFolderArchiveSelectionId(folderId: string): string {
  return `${WORKSPACE_FOLDER_ARCHIVE_PREFIX}${folderId}`;
}

export function isWorkspaceFolderSelectionId(selectedId: string | null): boolean {
  if (!selectedId) return false;
  return (
    selectedId.startsWith(WORKSPACE_FOLDER_PREFIX) &&
    !selectedId.startsWith(WORKSPACE_FOLDER_ARCHIVE_PREFIX)
  );
}

export interface WorkspaceNote {
  id: string;
  companyId: string;
  folderId: string;
  title: string;
  content: string;
  contentType: 'html' | 'markdown';
  tags: string[];
  pinned: boolean;
  archived: boolean;
  attachments: NoteAttachment[];
  order: number;
  calendarColor?: string;
  scheduledAt?: string;
  scheduledEnd?: string;
  isTask: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceFolderLink {
  id: string;
  companyId: string;
  folderId: string;
  title: string;
  url: string;
  order: number;
  pinned: boolean;
  createdAt: string;
}

export interface WorkspaceFolderSecret {
  id: string;
  companyId: string;
  folderId: string;
  title: string;
  type: FolderSecretType;
  value: string;
  username?: string;
  linkId?: string;
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export function workspaceNoteSelectionId(noteId: string): string {
  return `${WORKSPACE_NOTE_PREFIX}${noteId}`;
}

export function parseWorkspaceNoteSelectionId(
  selectedId: string | null,
): { noteId: string } | null {
  if (!selectedId?.startsWith(WORKSPACE_NOTE_PREFIX)) return null;
  return { noteId: selectedId.slice(WORKSPACE_NOTE_PREFIX.length) };
}

export function isWorkspaceNoteSelectionId(selectedId: string | null): boolean {
  return Boolean(selectedId?.startsWith(WORKSPACE_NOTE_PREFIX));
}

export function workspaceTaskSelectionId(taskId: string): string {
  return `${WORKSPACE_TASK_PREFIX}${taskId}`;
}

export function parseWorkspaceTaskSelectionId(
  selectedId: string | null,
): { taskId: string } | null {
  if (!selectedId?.startsWith(WORKSPACE_TASK_PREFIX)) return null;
  return { taskId: selectedId.slice(WORKSPACE_TASK_PREFIX.length) };
}

export function isWorkspaceTaskSelectionId(selectedId: string | null): boolean {
  return Boolean(selectedId?.startsWith(WORKSPACE_TASK_PREFIX));
}
