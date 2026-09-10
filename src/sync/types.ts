import type { ColorPalette, Folder, FolderLink, FolderSecret, Note, Theme } from '../types';

/** Data synced across devices (UI selection stays local per device). */
export interface SyncPayload {
  folders: Folder[];
  notes: Note[];
  folderLinks: FolderLink[];
  folderSecrets: FolderSecret[];
  theme: Theme;
  colorPalette: ColorPalette;
  foldersSectionName: string;
}

export type SyncStatus = 'offline' | 'idle' | 'syncing' | 'synced' | 'error';
