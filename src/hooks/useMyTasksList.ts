import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useCompanyStore } from '../store/companyStore';
import { isFolderArchived } from '../types';
import type { Note } from '../types';
import { workspaceTaskToNote } from '../utils/workspaceMappers';

export function taskSortKey(note: Note): { due: number | null; updated: number } {
  const dueRaw = note.workspaceTaskMeta?.dueAt ?? note.personalTaskMeta?.dueAt ?? note.scheduledAt;
  const due = dueRaw ? new Date(dueRaw).getTime() : null;
  return { due, updated: new Date(note.updatedAt).getTime() };
}

export function compareMyTasks(a: Note, b: Note): number {
  const ka = taskSortKey(a);
  const kb = taskSortKey(b);
  if (ka.due !== null && kb.due !== null) return ka.due - kb.due;
  if (ka.due !== null) return -1;
  if (kb.due !== null) return 1;
  return kb.updated - ka.updated;
}

export function useMyTasksList(): Note[] {
  const notes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const myAssignedTasks = useCompanyStore((s) => s.myAssignedTasks);

  return useMemo(() => {
    const personal = notes.filter((n) => {
      if (!n.isTask || n.isCalendarBlock) return false;
      const folder = folders.find((f) => f.id === n.folderId);
      return !isFolderArchived(folder);
    });
    const shared = myAssignedTasks.map(workspaceTaskToNote);
    return [...shared, ...personal].sort(compareMyTasks);
  }, [notes, folders, myAssignedTasks]);
}
