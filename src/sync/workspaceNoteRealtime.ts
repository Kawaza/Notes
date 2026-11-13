import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { WorkspaceNote } from '../types/company';

type WorkspaceNoteRow = {
  id: string;
  updated_at: string;
  content?: string;
  title?: string;
};

/** Subscribe to a single workspace note row (UPDATE). */
export function subscribeWorkspaceNote(
  noteId: string,
  onUpdate: (row: Pick<WorkspaceNote, 'id' | 'updatedAt' | 'content' | 'title'>) => void,
): () => void {
  if (!supabase) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`workspace-note:${noteId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'workspace_notes',
        filter: `id=eq.${noteId}`,
      },
      (payload) => {
        const row = payload.new as WorkspaceNoteRow;
        onUpdate({
          id: row.id,
          updatedAt: row.updated_at,
          content: row.content ?? '',
          title: row.title ?? '',
        });
      },
    )
    .subscribe();

  return () => {
    if (supabase) void supabase.removeChannel(channel);
  };
}
