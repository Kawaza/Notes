export interface Folder {
  id: string;
  name: string;
  order: number;
  calendarColor?: string;
  archived?: boolean;
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
  folderId: string;
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
export const DEFAULT_FOLDER_ID = 'inbox';

export function isFolderArchived(folder: Folder | undefined): boolean {
  return folder?.archived ?? false;
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
      checkForUpdates: () => Promise<unknown>;
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
