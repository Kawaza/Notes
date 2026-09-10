import type { Note } from '../types';
import type { SyncPayload } from './types';

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

/** Combine device + cloud data. Primary (usually local desktop) wins ties except notes use newest.updatedAt. */
export function mergeSyncPayloads(primary: SyncPayload, secondary: SyncPayload): SyncPayload {
  return {
    folders: mergeById(primary.folders, secondary.folders),
    notes: mergeById(primary.notes, secondary.notes, pickNewerNote),
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
    folderLinks: [],
    folderSecrets: [],
    theme: 'light',
    colorPalette: 'default',
    foldersSectionName: 'Folders',
  };
}
