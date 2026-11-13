import { useEffect, useRef } from 'react';
import { useCompanyStore } from '../store/companyStore';
import { fetchWorkspaceNoteById } from '../sync/workspaceContentSync';
import { subscribeCompanyWorkspace } from '../sync/workspaceCompanyRealtime';

/** Push teammate workspace edits into the local company store. */
export function useWorkspaceCompanyRealtime(enabled: boolean) {
  const companyIds = useCompanyStore((s) => s.companies.map((c) => c.id));
  const applyRemoteWorkspaceTask = useCompanyStore((s) => s.applyRemoteWorkspaceTask);
  const removeRemoteWorkspaceTask = useCompanyStore((s) => s.removeRemoteWorkspaceTask);
  const applyRemoteWorkspaceNote = useCompanyStore((s) => s.applyRemoteWorkspaceNote);
  const removeRemoteWorkspaceNote = useCompanyStore((s) => s.removeRemoteWorkspaceNote);

  const handlersRef = useRef({
    applyRemoteWorkspaceTask,
    removeRemoteWorkspaceTask,
    applyRemoteWorkspaceNote,
    removeRemoteWorkspaceNote,
  });
  handlersRef.current = {
    applyRemoteWorkspaceTask,
    removeRemoteWorkspaceTask,
    applyRemoteWorkspaceNote,
    removeRemoteWorkspaceNote,
  };

  useEffect(() => {
    if (!enabled || companyIds.length === 0) return;

    const cleanups = companyIds.map((companyId) =>
      subscribeCompanyWorkspace(companyId, {
        onTaskUpsert: (task) => handlersRef.current.applyRemoteWorkspaceTask(task),
        onTaskDelete: (taskId, folderId) =>
          handlersRef.current.removeRemoteWorkspaceTask(taskId, folderId),
        onNoteChange: (noteId) => {
          void fetchWorkspaceNoteById(noteId).then((note) => {
            if (note) handlersRef.current.applyRemoteWorkspaceNote(note);
          });
        },
        onNoteDelete: (noteId, folderId) =>
          handlersRef.current.removeRemoteWorkspaceNote(noteId, folderId),
      }),
    );

    return () => {
      for (const off of cleanups) off();
    };
  }, [enabled, companyIds.join('|')]);
}
