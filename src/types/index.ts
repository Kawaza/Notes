export interface Folder {
  id: string;
  name: string;
  order: number;
  calendarColor?: string;
  archived?: boolean;
  /** Groups child folders (e.g. Work, Personal). Cannot hold notes directly. */
  isParent?: boolean;
  /** Child folder id when nested under a parent folder. */
  parentId?: string | null;
}

export interface FolderLink {
  id: string;
  folderId: string;
  title: string;
  url: string;
  order: number;
  pinned: boolean;
  createdAt: string;
}

export type FolderSecretType = 'password' | 'api_key' | 'ssh_key' | 'token' | 'other';

export interface FolderSecret {
  id: string;
  folderId: string;
  title: string;
  type: FolderSecretType;
  value: string;
  username?: string;
  linkId?: string;
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteAttachment {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
}

export interface Note {
  id: string;
  /** Null when the note is only listed under All Notes (no folder). */
  folderId: string | null;
  title: string;
  content: string;
  contentType: 'html' | 'markdown';
  tags: string[];
  pinned: boolean;
  attachments: NoteAttachment[];
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  scheduledEnd?: string;
  isTask: boolean;
  order: number;
  calendarColor?: string;
}

export type ViewMode = 'notes' | 'calendar';
export type Theme = 'light' | 'dark';
export type ColorPalette = 'default' | 'ocean' | 'forest' | 'sunset' | 'rose' | 'pink' | 'pastel' | 'yellow' | 'sky';

export const SORTABLE_FOLDER_PREFIX = 'sortable-folder-';

export function sortableFolderId(folderId: string) {
  return `${SORTABLE_FOLDER_PREFIX}${folderId}`;
}

export function folderIdFromSortable(sortableId: string) {
  return sortableId.startsWith(SORTABLE_FOLDER_PREFIX)
    ? sortableId.slice(SORTABLE_FOLDER_PREFIX.length)
    : sortableId;
}
export const ALL_NOTES_ID = 'all';
/** Legacy inbox id — stripped on migrate; notes/folders referencing it become unfiled. */
export const DEFAULT_FOLDER_ID = 'inbox';
export const DEFAULT_FOLDERS_SECTION_NAME = 'Folders';
export const FOLDER_ROOT_DROP_ID = 'folder-section-root';
export const ARCHIVE_DROP_ID = 'archive-drop';

export function parentDropId(parentId: string) {
  return `parent-drop-${parentId}`;
}

export function parentBodyDropId(parentId: string) {
  return `parent-drop-${parentId}-body`;
}

export function isParentDropId(id: string) {
  return id.startsWith('parent-drop-');
}

/** True for per-folder note drop targets (`folder-{id}`), not section drop zones. */
export function isNoteFolderDroppableId(id: string) {
  return id.startsWith('folder-') && id !== FOLDER_ROOT_DROP_ID;
}

export function parentIdFromDropId(id: string) {
  return id.slice('parent-drop-'.length).replace(/-body$/, '');
}

export function isFolderArchived(folder: Folder | undefined): boolean {
  return folder?.archived ?? false;
}

export function isParentFolder(folder: Folder | undefined): boolean {
  return folder?.isParent ?? false;
}

export function isNoteFolder(folder: Folder | undefined): boolean {
  return Boolean(folder) && !isFolderArchived(folder) && !isParentFolder(folder);
}

/** Folder id for a newly created note from the current sidebar selection. */
export function getNewNoteFolderId(selectedFolderId: string | null): string | null {
  return selectedFolderId && selectedFolderId !== ALL_NOTES_ID ? selectedFolderId : null;
}

export function notesInFolder(notes: Note[], folderId: string | null): Note[] {
  return folderId
    ? notes.filter((n) => n.folderId === folderId)
    : notes.filter((n) => !n.folderId);
}

export interface AppData {
  folders: Folder[];
  notes: Note[];
  folderLinks: FolderLink[];
  folderSecrets: FolderSecret[];
  theme: Theme;
  colorPalette: ColorPalette;
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  viewMode: ViewMode;
  selectedTag: string | null;
  /** Sidebar label for the root folders section (default: "Folders"). */
  foldersSectionName: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  title: string;
  content: string;
  contentType: 'html' | 'markdown';
  tags: string[];
}

declare global {
  interface Window {
    electronAPI?: {
      loadData: () => Promise<AppData | null>;
      saveData: (data: AppData) => Promise<boolean>;
      saveDataSync: (data: AppData) => boolean;
      hasDataFile: () => Promise<boolean>;
      getDataPath: () => Promise<string>;
      isElectron: boolean;
      getAppVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<boolean>;
      checkForUpdates: () => Promise<unknown>;
      notifyUpdaterReady: () => Promise<{ ok: boolean }>;
      downloadUpdate: () => Promise<unknown>;
      installUpdate: () => Promise<void>;
      setBrandIcons: (palette: string, theme: Theme) => Promise<void>;
      onUpdateEvent: (
        callback: (event: {
          type: string;
          version?: string;
          currentVersion?: string;
          percent?: number;
          message?: string;
        }) => void,
      ) => () => void;
      onFlushSave: (callback: () => void) => () => void;
      notifyFlushSaveDone: () => void;
      showSaveDialog: (options: object) => Promise<string | null>;
      showOpenDialog: (options: object) => Promise<string[] | null>;
      writeFile: (path: string, content: string) => Promise<boolean>;
      readFile: (path: string) => Promise<string | null>;
      onQuickCapture: (callback: () => void) => void;
    };
  }
}
