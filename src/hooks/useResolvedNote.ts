import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useCompanyStore } from '../store/companyStore';
import type { Note } from '../types';
import {
  isWorkspaceNoteSelectionId,
  isWorkspaceTaskSelectionId,
  parseWorkspaceNoteSelectionId,
  parseWorkspaceTaskSelectionId,
} from '../types/company';
import { workspaceNoteToNote, workspaceTaskToNote } from '../utils/workspaceMappers';
import { resolveLinkedTaskNote } from '../utils/linkedTaskResolve';

export function useResolvedNote(activeNoteId: string | null | undefined): Note | undefined {
  const personalNotes = useStore((s) => s.notes);
  const notesByFolder = useCompanyStore((s) => s.notesByFolder);
  const tasksByFolder = useCompanyStore((s) => s.tasksByFolder);
  const myAssignedTasks = useCompanyStore((s) => s.myAssignedTasks);

  return useMemo(() => {
    if (!activeNoteId) return undefined;
    if (isWorkspaceTaskSelectionId(activeNoteId)) {
      const parsed = parseWorkspaceTaskSelectionId(activeNoteId);
      if (!parsed) return undefined;
      for (const rows of Object.values(tasksByFolder)) {
        const hit = rows.find((t) => t.id === parsed.taskId);
        if (hit) return workspaceTaskToNote(hit);
      }
      const assigned = myAssignedTasks.find((t) => t.id === parsed.taskId);
      if (assigned) return workspaceTaskToNote(assigned);
      return undefined;
    }
    if (!isWorkspaceNoteSelectionId(activeNoteId)) {
      const block = personalNotes.find((n) => n.id === activeNoteId);
      if (block?.isCalendarBlock) {
        if (block.linkedTaskId) {
          const linked = resolveLinkedTaskNote(
            block.linkedTaskId,
            personalNotes,
            tasksByFolder,
            myAssignedTasks,
          );
          if (linked) {
            return {
              ...block,
              title: linked.title,
              content: linked.content,
              contentType: linked.contentType,
              workspaceTaskMeta: linked.workspaceTaskMeta,
            };
          }
        }
        return block;
      }
      return block;
    }
    const parsed = parseWorkspaceNoteSelectionId(activeNoteId);
    if (!parsed) return undefined;
    for (const rows of Object.values(notesByFolder)) {
      const hit = rows.find((n) => n.id === parsed.noteId);
      if (hit) return workspaceNoteToNote(hit);
    }
    return undefined;
  }, [activeNoteId, personalNotes, notesByFolder, tasksByFolder, myAssignedTasks]);
}
