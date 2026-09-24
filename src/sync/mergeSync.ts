import type { Note, NoteDeletion } from '../types';
import type { SyncPayload } from './types';

const DELETION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function mergeById<T extends { id: string }>(
  primary: T[],
  secondary: T[],
  pickDuplicate?: (a: T, b: T) => T,
): T[] {
  const map = new Map<string, T>();
  for (const item of primary) map.set(item.id, item);
  for (const item of secondary) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    map.set(item.id, pickDuplicate ? pickDuplicate(existing, item) : existing);
  }
  return Array.from(map.values());
}

function pickNewerNote(a: Note, b: Note): Note {
  return new Date(a.updatedAt).getTime() >= new Date(b.updatedAt).getTime() ? a : b;
}

function mergeNoteDeletions(primary: NoteDeletion[], secondary: NoteDeletion[]): NoteDeletion[] {
  const map = new Map<string, string>();
  for (const entry of [...primary, ...secondary]) {
    if (!entry?.id || !entry.deletedAt) continue;
    const existing = map.get(entry.id);
    if (!existing || new Date(entry.deletedAt).getTime() > new Date(existing).getTime()) {
      map.set(entry.id, entry.deletedAt);
    }
  }
  return Array.from(map.entries()).map(([id, deletedAt]) => ({ id, deletedAt }));
}

function pruneNoteDeletions(deletions: NoteDeletion[], notes: Note[]): NoteDeletion[] {
  const noteIds = new Set(notes.map((n) => n.id));
  const cutoff = Date.now() - DELETION_RETENTION_MS;
  return deletions.filter((d) => {
    if (noteIds.has(d.id)) return true;
    return new Date(d.deletedAt).getTime() >= cutoff;
  });
}

function applyNoteDeletions(notes: Note[], deletions: NoteDeletion[]): Note[] {
  if (!deletions.length) return notes;
  const delMap = new Map(deletions.map((d) => [d.id, d.deletedAt]));
  return notes.filter((n) => {
    const deletedAt = delMap.get(n.id);
    if (!deletedAt) return true;
    return new Date(n.updatedAt).getTime() > new Date(deletedAt).getTime();
  });
}

/** Combine device + cloud data. Notes use newest updatedAt; deletions remove stale copies. */
export function mergeSyncPayloads(primary: SyncPayload, secondary: SyncPayload): SyncPayload {
  const noteDeletions = pruneNoteDeletions(
    mergeNoteDeletions(primary.noteDeletions ?? [], secondary.noteDeletions ?? []),
    [],
  );

  const mergedNotes = applyNoteDeletions(
    mergeById(primary.notes, secondary.notes, pickNewerNote),
    noteDeletions,
  );

  const prunedDeletions = pruneNoteDeletions(noteDeletions, mergedNotes);

  return {
    folders: mergeById(primary.folders, secondary.folders),
    notes: mergedNotes,
    noteDeletions: prunedDeletions,
    folderLinks: mergeById(primary.folderLinks, secondary.folderLinks),
    folderSecrets: mergeById(primary.folderSecrets, secondary.folderSecrets),
    theme: primary.theme ?? secondary.theme,
    colorPalette: primary.colorPalette ?? secondary.colorPalette,
    foldersSectionName: primary.foldersSectionName || secondary.foldersSectionName,
  };
}

export function emptySyncPayload(): SyncPayload {
  return {
    folders: [],
    notes: [],
    noteDeletions: [],
    folderLinks: [],
    folderSecrets: [],
    theme: 'light',
    colorPalette: 'default',
    foldersSectionName: 'Folders',
  };
}
