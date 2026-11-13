import type { WorkspaceNote } from '../types/company';
import { updateWorkspaceNoteRow, fetchWorkspaceNoteById } from './workspaceContentSync';
import type { Note } from '../types';
import { notePatchFromUi } from './workspaceContentSync';

const SAVE_DELAY_MS = 800;

type Pending = {
  patch: Parameters<typeof updateWorkspaceNoteRow>[1];
  revision: string | null;
};

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingByNote = new Map<string, Pending>();
const revisionByNote = new Map<string, string>();

export function setWorkspaceNoteServerRevision(noteId: string, updatedAt: string) {
  revisionByNote.set(noteId, updatedAt);
}

export function getWorkspaceNoteServerRevision(noteId: string): string | undefined {
  return revisionByNote.get(noteId);
}

export function hasPendingWorkspaceNoteSave(noteId: string): boolean {
  return pendingByNote.has(noteId) || timers.has(noteId);
}

export function cancelWorkspaceNoteSave(noteId: string) {
  const t = timers.get(noteId);
  if (t) clearTimeout(t);
  timers.delete(noteId);
  pendingByNote.delete(noteId);
}

type SaveCallbacks = {
  onSynced: (note: WorkspaceNote) => void;
  onConflict: (server: WorkspaceNote) => void;
  onError: (err: unknown) => void;
};

function mergePatch(
  a: Parameters<typeof updateWorkspaceNoteRow>[1],
  b: Parameters<typeof updateWorkspaceNoteRow>[1],
): Parameters<typeof updateWorkspaceNoteRow>[1] {
  return { ...a, ...b };
}

async function flushNote(noteId: string, callbacks: SaveCallbacks) {
  const pending = pendingByNote.get(noteId);
  if (!pending) return;
  pendingByNote.delete(noteId);
  timers.delete(noteId);

  try {
    const result = await updateWorkspaceNoteRow(noteId, pending.patch, {
      ifUnmodifiedSince: pending.revision ?? undefined,
    });
    if (result === 'conflict') {
      const server = await fetchWorkspaceNoteById(noteId);
      if (server) callbacks.onConflict(server);
      return;
    }
    revisionByNote.set(noteId, result.updatedAt);
    callbacks.onSynced(result);
  } catch (err) {
    callbacks.onError(err);
  }
}

export function queueWorkspaceNotePersist(
  noteId: string,
  partial: Partial<Note>,
  callbacks: SaveCallbacks,
) {
  const patch = notePatchFromUi(partial);
  const revision = revisionByNote.get(noteId) ?? null;
  const prev = pendingByNote.get(noteId);
  pendingByNote.set(noteId, {
    patch: prev ? mergePatch(prev.patch, patch) : patch,
    revision: prev?.revision ?? revision,
  });

  const existing = timers.get(noteId);
  if (existing) clearTimeout(existing);
  timers.set(
    noteId,
    setTimeout(() => {
      void flushNote(noteId, callbacks);
    }, SAVE_DELAY_MS),
  );
}

export async function forceWorkspaceNotePersist(
  noteId: string,
  callbacks: SaveCallbacks,
): Promise<void> {
  const t = timers.get(noteId);
  if (t) clearTimeout(t);
  await flushNote(noteId, callbacks);
}

export async function overwriteWorkspaceNote(
  noteId: string,
  partial: Partial<Note>,
  callbacks: SaveCallbacks,
): Promise<void> {
  cancelWorkspaceNoteSave(noteId);
  const patch = notePatchFromUi(partial);
  try {
    const result = await updateWorkspaceNoteRow(noteId, patch);
    if (result === 'conflict') {
      const server = await fetchWorkspaceNoteById(noteId);
      if (server) callbacks.onConflict(server);
      return;
    }
    revisionByNote.set(noteId, result.updatedAt);
    callbacks.onSynced(result);
  } catch (err) {
    callbacks.onError(err);
  }
}
