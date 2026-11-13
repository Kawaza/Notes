import { useEffect, useRef } from 'react';
import { useCompanyStore } from '../store/companyStore';
import {
  cancelWorkspaceNoteSave,
  getWorkspaceNoteServerRevision,
  hasPendingWorkspaceNoteSave,
  setWorkspaceNoteServerRevision,
} from '../sync/workspaceNotePersistence';
import { subscribeWorkspaceNote } from '../sync/workspaceNoteRealtime';
import { fetchWorkspaceNoteById } from '../sync/workspaceContentSync';

/** Live workspace note updates + conflict detection (not full co-editing). */
export function useWorkspaceNoteCollaboration(
  workspaceNoteId: string | null,
  isActive: boolean,
) {
  const applyRemote = useCompanyStore((s) => s.applyRemoteWorkspaceNote);
  const setConflict = useCompanyStore((s) => s.setWorkspaceNoteConflict);
  const clearConflict = useCompanyStore((s) => s.clearWorkspaceNoteConflict);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!workspaceNoteId || !isActive) return;

    let cancelled = false;
    void (async () => {
      if (bootstrapped.current) return;
      const note = await fetchWorkspaceNoteById(workspaceNoteId);
      if (cancelled || !note) return;
      setWorkspaceNoteServerRevision(workspaceNoteId, note.updatedAt);
      bootstrapped.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceNoteId, isActive]);

  useEffect(() => {
    if (!workspaceNoteId || !isActive) return;

    return subscribeWorkspaceNote(workspaceNoteId, async (row) => {
      const localRevision = getWorkspaceNoteServerRevision(workspaceNoteId);
      if (!localRevision || row.updatedAt <= localRevision) return;

      const server = await fetchWorkspaceNoteById(workspaceNoteId);
      if (!server) return;

      if (hasPendingWorkspaceNoteSave(workspaceNoteId)) {
        setConflict(workspaceNoteId, server);
        return;
      }

      applyRemote(server);
      setWorkspaceNoteServerRevision(workspaceNoteId, server.updatedAt);
    });
  }, [workspaceNoteId, isActive, applyRemote, setConflict]);

  useEffect(() => {
    if (!workspaceNoteId) return;
    return () => {
      cancelWorkspaceNoteSave(workspaceNoteId);
      clearConflict(workspaceNoteId);
      bootstrapped.current = false;
    };
  }, [workspaceNoteId, clearConflict]);
}
