import type { Folder, Note } from '../types';
import { isFolderArchived } from '../types';
import type { WorkspaceFolder, WorkspaceTask } from '../types/company';
import {
  isWorkspaceTaskSelectionId,
  parseWorkspaceTaskSelectionId,
} from '../types/company';
import { workspaceTaskToNote } from './workspaceMappers';

function findWorkspaceFolder(
  folderId: string,
  foldersByCompany: Record<string, WorkspaceFolder[]>,
): WorkspaceFolder | undefined {
  for (const list of Object.values(foldersByCompany)) {
    const hit = list.find((f) => f.id === folderId);
    if (hit) return hit;
  }
  return undefined;
}

function workspaceTaskVisible(
  task: WorkspaceTask,
  tasksByFolder: Record<string, WorkspaceTask[]>,
  foldersByCompany: Record<string, WorkspaceFolder[]>,
): boolean {
  if (task.archived) return false;
  const wsFolder = findWorkspaceFolder(task.folderId, foldersByCompany);
  if (wsFolder?.archived) return false;

  const loaded = tasksByFolder[task.folderId];
  if (loaded !== undefined) {
    return loaded.some((t) => t.id === task.id);
  }
  return true;
}

export function resolveLinkedTaskNote(
  linkedTaskId: string,
  personalNotes: Note[],
  tasksByFolder: Record<string, WorkspaceTask[]>,
  myAssignedTasks: WorkspaceTask[],
  foldersByCompany: Record<string, WorkspaceFolder[]> = {},
): Note | null {
  if (isWorkspaceTaskSelectionId(linkedTaskId)) {
    const parsed = parseWorkspaceTaskSelectionId(linkedTaskId);
    if (!parsed) return null;
    for (const rows of Object.values(tasksByFolder)) {
      const hit = rows.find((t) => t.id === parsed.taskId);
      if (hit && workspaceTaskVisible(hit, tasksByFolder, foldersByCompany)) {
        return workspaceTaskToNote(hit);
      }
    }
    const assigned = myAssignedTasks.find((t) => t.id === parsed.taskId);
    if (assigned && workspaceTaskVisible(assigned, tasksByFolder, foldersByCompany)) {
      return workspaceTaskToNote(assigned);
    }
    return null;
  }
  const personal = personalNotes.find((n) => n.id === linkedTaskId);
  if (personal?.isTask) return personal;
  return null;
}

export function resolveLinkedTaskTitle(
  linkedTaskId: string,
  personalNotes: Note[],
  tasksByFolder: Record<string, WorkspaceTask[]>,
  myAssignedTasks: WorkspaceTask[],
  folders: Folder[] = [],
  foldersByCompany: Record<string, WorkspaceFolder[]> = {},
): string {
  const hit = resolveActiveLinkedTaskNote(
    linkedTaskId,
    personalNotes,
    tasksByFolder,
    myAssignedTasks,
    folders,
    foldersByCompany,
  );
  return hit?.title || 'Untitled';
}

/** Linked task still exists and is not archived/deleted — used for calendar display. */
export function resolveActiveLinkedTaskNote(
  linkedTaskId: string,
  personalNotes: Note[],
  tasksByFolder: Record<string, WorkspaceTask[]>,
  myAssignedTasks: WorkspaceTask[],
  folders: Folder[] = [],
  foldersByCompany: Record<string, WorkspaceFolder[]> = {},
): Note | null {
  const hit = resolveLinkedTaskNote(
    linkedTaskId,
    personalNotes,
    tasksByFolder,
    myAssignedTasks,
    foldersByCompany,
  );
  if (!hit) return null;

  if (isWorkspaceTaskSelectionId(linkedTaskId)) {
    const parsed = parseWorkspaceTaskSelectionId(linkedTaskId);
    if (!parsed) return null;
    let taskRow: WorkspaceTask | undefined;
    for (const rows of Object.values(tasksByFolder)) {
      taskRow = rows.find((t) => t.id === parsed.taskId);
      if (taskRow) break;
    }
    if (!taskRow) {
      taskRow = myAssignedTasks.find((t) => t.id === parsed.taskId);
    }
    if (!taskRow || !workspaceTaskVisible(taskRow, tasksByFolder, foldersByCompany)) return null;
  } else {
    const personal = personalNotes.find((n) => n.id === linkedTaskId);
    if (!personal?.isTask) return null;
  }

  if (hit.folderId) {
    const folder = folders.find((f) => f.id === hit.folderId);
    if (isFolderArchived(folder)) return null;
  }

  return hit;
}
