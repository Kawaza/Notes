import type { Note } from '../types';
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
): string {
  const hit = resolveLinkedTaskNote(linkedTaskId, personalNotes, tasksByFolder, myAssignedTasks);
  return hit?.title || 'Untitled';
}
