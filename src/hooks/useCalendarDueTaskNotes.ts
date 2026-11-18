import { useEffect, useMemo, useState } from 'react';
import type { Note } from '../types';
import { useCompanyStore } from '../store/companyStore';
import { useMyTasksList, compareMyTasks } from './useMyTasksList';
import { fetchWorkspaceTasksForAssignee } from '../sync/companySync';
import { workspaceTaskToNote } from '../utils/workspaceMappers';
import type { WorkspaceTask } from '../types/company';

/**
 * Tasks that show in the calendar "Tasks" all-day row (due dates).
 * Own calendar: My Tasks (personal + workspace assigned to you).
 * Teammate calendar: workspace tasks assigned to them (personal tasks stay private).
 */
export function useCalendarDueTaskNotes(
  teammateUserId: string | null,
  currentUserId: string | null,
): Note[] {
  const myTasks = useMyTasksList();
  const tasksByFolder = useCompanyStore((s) => s.tasksByFolder);
  const [fetched, setFetched] = useState<WorkspaceTask[]>([]);

  const viewingOther = Boolean(
    teammateUserId && currentUserId && teammateUserId !== currentUserId,
  );

  useEffect(() => {
    if (!viewingOther || !teammateUserId) {
      setFetched([]);
      return;
    }
    let cancelled = false;
    void fetchWorkspaceTasksForAssignee(teammateUserId)
      .then((rows) => {
        if (!cancelled) setFetched(rows);
      })
      .catch((err) => {
        console.warn('Failed to load teammate calendar tasks', err);
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingOther, teammateUserId]);

  const teammateTasks = useMemo(() => {
    if (!viewingOther || !teammateUserId) return [];
    const byId = new Map<string, WorkspaceTask>();
    for (const t of fetched) byId.set(t.id, t);
    for (const list of Object.values(tasksByFolder)) {
      for (const t of list) {
        if (t.assigneeId === teammateUserId && !t.archived) byId.set(t.id, t);
      }
    }
    return [...byId.values()].map(workspaceTaskToNote).sort(compareMyTasks);
  }, [viewingOther, teammateUserId, fetched, tasksByFolder]);

  return viewingOther ? teammateTasks : myTasks;
}