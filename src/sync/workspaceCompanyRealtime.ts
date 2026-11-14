import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { mapWorkspaceTaskRow } from './companySync';
import type { WorkspaceTask } from '../types/company';

export type WorkspaceCompanyRealtimeHandlers = {
  onTaskUpsert: (task: WorkspaceTask) => void;
  onTaskDelete: (taskId: string, folderId: string) => void;
  onNoteChange: (noteId: string) => void;
  onNoteDelete: (noteId: string, folderId: string) => void;
};

/** Live workspace task + note changes for everyone in a company. */
export function subscribeCompanyWorkspace(
  companyId: string,
  handlers: WorkspaceCompanyRealtimeHandlers,
): () => void {
  if (!supabase) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`company-workspace:${companyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspace_tasks',
        filter: `company_id=eq.${companyId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as { id?: string; folder_id?: string };
          if (old.id) handlers.onTaskDelete(old.id, old.folder_id ?? '');
          return;
        }
        const row = payload.new as Record<string, unknown>;
        if (row?.id) handlers.onTaskUpsert(mapWorkspaceTaskRow(row));
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspace_notes',
        filter: `company_id=eq.${companyId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as { id?: string; folder_id?: string };
          if (old.id) handlers.onNoteDelete(old.id, old.folder_id ?? '');
          return;
        }
        const row = payload.new as { id?: string; is_task?: boolean };
        if (!row?.id || row.is_task) return;
        handlers.onNoteChange(row.id);
      },
    )
    .subscribe();

  return () => {
    if (supabase) void supabase.removeChannel(channel);
  };
}
