import type { Note } from '../types';
import { compressImageDataUrl } from './compressImage';
import { compactNoteForStorage, hydrateNoteForDisplay } from './noteImageStorage';
import type { SyncPayload } from '../sync/types';

/** Hydrate editor HTML, then compact + compress image attachments for sync/disk. */
export async function optimizeNoteForSync(note: Note): Promise<Note> {
  if (note.contentType === 'markdown') return note;

  const lifted = compactNoteForStorage(hydrateNoteForDisplay(note));
  const attachments = [];
  for (const att of lifted.attachments) {
    if (att.dataUrl?.startsWith('data:image/')) {
      const compressed = await compressImageDataUrl(att.dataUrl, att.mimeType || 'image/png');
      attachments.push({ ...att, ...compressed });
    } else {
      attachments.push(att);
    }
  }
  return compactNoteForStorage({ ...lifted, attachments });
}

export async function optimizeNotesForSync(notes: Note[]): Promise<Note[]> {
  const out: Note[] = [];
  for (const note of notes) {
    out.push(await optimizeNoteForSync(note));
  }
  return out;
}

export function syncPayloadFromNotes(base: Omit<SyncPayload, 'notes'>, notes: Note[]): SyncPayload {
  return { ...base, notes: notes.map(compactNoteForStorage) };
}

export async function optimizeSyncPayload(payload: SyncPayload): Promise<SyncPayload> {
  const notes = await optimizeNotesForSync(payload.notes);
  return syncPayloadFromNotes(payload, notes);
}
