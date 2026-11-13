import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { mapWorkspaceTaskRow } from './companySync';
import type { WorkspaceCompanyRealtimeHandlers } from './workspaceCompanyRealtime';

/** Live updates for one shared folder — use while that folder is open. */
export function subscribeWorkspaceFolder(
  folderId: string,
  handlers: Pick<
    WorkspaceCompanyRealtimeHandlers,
    'onTaskUpsert' | 'onTaskDelete' | 'onNoteChange' | 'onNoteDelete'
  >,
): () => void {
  if (!supabase) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`workspace-folder:${folderId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspace_tasks',
        filter: `folder_id=eq.${folderId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as { id?: string };
          if (old.id) handlers.onTaskDelete(old.id, folderId);
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
        filter: `folder_id=eq.${folderId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as { id?: string };
          if (old.id) handlers.onNoteDelete(old.id, folderId);
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
