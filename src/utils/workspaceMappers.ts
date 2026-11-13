import type { Folder, FolderLink, FolderSecret, Note } from '../types';
import type {
  WorkspaceFolder,
  WorkspaceFolderLink,
  WorkspaceFolderSecret,
  WorkspaceNote,
  WorkspaceTask,
} from '../types/company';
import {
  workspaceFolderSelectionId,
  workspaceNoteSelectionId,
  workspaceTaskSelectionId,
} from '../types/company';

export function workspaceNoteToNote(row: WorkspaceNote): Note {
  return {
    id: workspaceNoteSelectionId(row.id),
    folderId: workspaceFolderSelectionId(row.folderId),
    title: row.title,
    content: row.content,
    contentType: row.contentType,
    tags: row.tags,
    pinned: row.pinned,
    attachments: row.attachments,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    scheduledAt: row.scheduledAt,
    scheduledEnd: row.scheduledEnd,
    isTask: row.isTask,
    order: row.order,
    calendarColor: row.calendarColor,
  };
}

export function workspaceLinkToFolderLink(row: WorkspaceFolderLink): FolderLink {
  return {
    id: row.id,
    folderId: workspaceFolderSelectionId(row.folderId),
    title: row.title,
    url: row.url,
    order: row.order,
    pinned: row.pinned,
    createdAt: row.createdAt,
  };
}

export function workspaceSecretToFolderSecret(row: WorkspaceFolderSecret): FolderSecret {
  return {
    id: row.id,
    folderId: workspaceFolderSelectionId(row.folderId),
    title: row.title,
    type: row.type,
    value: row.value,
    username: row.username,
    linkId: row.linkId,
    notes: row.notes,
    order: row.order,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function workspaceTaskToNote(row: WorkspaceTask): Note {
  return {
    id: workspaceTaskSelectionId(row.id),
    folderId: workspaceFolderSelectionId(row.folderId),
    title: row.title,
    content: row.content,
    contentType: row.contentType,
    tags: [],
    pinned: false,
    attachments: [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    scheduledAt: row.scheduledAt,
    scheduledEnd: row.scheduledEnd,
    isTask: true,
    order: row.order,
    calendarColor: 'blue',
    workspaceTaskMeta: {
      assigneeId: row.assigneeId,
      status: row.status,
      dueAt: row.dueAt,
      rawFolderId: row.folderId,
      companyId: row.companyId,
    },
  };
}

export function workspaceFolderToFolder(row: WorkspaceFolder): Folder {
  return {
    id: workspaceFolderSelectionId(row.id),
    name: row.name,
    order: row.order,
    calendarColor: row.calendarColor,
    archived: row.archived,
    isParent: row.isParent,
    parentId: row.parentId ? workspaceFolderSelectionId(row.parentId) : null,
  };
}
