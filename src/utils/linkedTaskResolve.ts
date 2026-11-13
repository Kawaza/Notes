import type { Folder, Note } from '../types';
import { isFolderArchived } from '../types';
import type { WorkspaceTask } from '../types/company';
import {
  isWorkspaceTaskSelectionId,
  parseWorkspaceTaskSelectionId,
} from '../types/company';
import { workspaceTaskToNote } from './workspaceMappers';

export function resolveLinkedTaskNote(
  linkedTaskId: string,
  personalNotes: Note[],
  tasksByFolder: Record<string, WorkspaceTask[]>,
  myAssignedTasks: WorkspaceTask[],
): Note | null {
  if (isWorkspaceTaskSelectionId(linkedTaskId)) {
    const parsed = parseWorkspaceTaskSelectionId(linkedTaskId);
    if (!parsed) return null;
    for (const rows of Object.values(tasksByFolder)) {
      const hit = rows.find((t) => t.id === parsed.taskId);
      if (hit) return workspaceTaskToNote(hit);
    }
    const assigned = myAssignedTasks.find((t) => t.id === parsed.taskId);
    if (assigned) return workspaceTaskToNote(assigned);
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
): string {
  const hit = resolveActiveLinkedTaskNote(
    linkedTaskId,
    personalNotes,
    tasksByFolder,
    myAssignedTasks,
    folders,
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
): Note | null {
  const hit = resolveLinkedTaskNote(linkedTaskId, personalNotes, tasksByFolder, myAssignedTasks);
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
    if (!taskRow || taskRow.archived) return null;
  }

  if (hit.folderId) {
    const folder = folders.find((f) => f.id === hit.folderId);
    if (isFolderArchived(folder)) return null;
  }

  return hit;
}
