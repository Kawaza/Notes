import { useEffect } from 'react';
import { useCompanyStore } from '../store/companyStore';
import { fetchWorkspaceNoteById } from '../sync/workspaceContentSync';
import { subscribeWorkspaceFolder } from '../sync/workspaceFolderRealtime';

export function useWorkspaceFolderRealtime(folderId: string | null | undefined) {
  useEffect(() => {
    if (!folderId) return;

    const store = () => useCompanyStore.getState();
    return subscribeWorkspaceFolder(folderId, {
      onTaskUpsert: (task) => store().applyRemoteWorkspaceTask(task),
      onTaskDelete: (taskId, fid) => store().removeRemoteWorkspaceTask(taskId, fid),
      onNoteChange: (noteId) => {
        void fetchWorkspaceNoteById(noteId).then((note) => {
          if (note) store().applyRemoteWorkspaceNote(note);
        });
      },
      onNoteDelete: (noteId, fid) => store().removeRemoteWorkspaceNote(noteId, fid),
    });
  }, [folderId]);
}
