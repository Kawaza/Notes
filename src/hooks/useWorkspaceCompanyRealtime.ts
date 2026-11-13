import { useEffect } from 'react';
import { useCompanyStore } from '../store/companyStore';
import { fetchWorkspaceNoteById } from '../sync/workspaceContentSync';
import { subscribeCompanyWorkspace } from '../sync/workspaceCompanyRealtime';

/** Push teammate workspace edits into the local company store. */
export function useWorkspaceCompanyRealtime(enabled: boolean) {
  const companyIdKey = useCompanyStore((s) =>
    s.companies
      .map((c) => c.id)
      .sort()
      .join('|'),
  );

  useEffect(() => {
    if (!enabled || !companyIdKey) return;

    const companyIds = companyIdKey.split('|').filter(Boolean);
    const store = () => useCompanyStore.getState();

    const cleanups = companyIds.map((companyId) =>
      subscribeCompanyWorkspace(companyId, {
        onTaskUpsert: (task) => store().applyRemoteWorkspaceTask(task),
        onTaskDelete: (taskId, folderId) => store().removeRemoteWorkspaceTask(taskId, folderId),
        onNoteChange: (noteId) => {
          void fetchWorkspaceNoteById(noteId).then((note) => {
            if (note) store().applyRemoteWorkspaceNote(note);
          });
        },
        onNoteDelete: (noteId, folderId) => store().removeRemoteWorkspaceNote(noteId, folderId),
      }),
    );

    return () => {
      for (const off of cleanups) off();
    };
  }, [enabled, companyIdKey]);
}
