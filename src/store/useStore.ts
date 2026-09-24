import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppData, Folder, FolderLink, FolderSecret, Note, NoteAttachment, Theme, ViewMode, ColorPalette } from '../types';
import { ALL_NOTES_ID, DEFAULT_FOLDER_ID, DEFAULT_FOLDERS_SECTION_NAME, isFolderArchived, notesInFolder } from '../types';
import { htmlToMarkdown, markdownToHtml } from '../utils/markdown';
import { dndLog } from '../utils/dndDebug';
import { isSyncAvailable, pullCloudData, pushCloudData, subscribeCloudChanges } from '../sync/cloudSync';
import { formatSyncError, withSyncTimeout } from '../sync/syncUtils';
import { emptySyncPayload, mergeSyncPayloads } from '../sync/mergeSync';
import type { SyncPayload, SyncStatus } from '../sync/types';
import { useAuthStore } from './authStore';

const defaultData: AppData = {
  folders: [],
  notes: [],
  noteDeletions: [],
  folderLinks: [],
  folderSecrets: [],
  theme: 'light',
  colorPalette: 'default',
  selectedFolderId: ALL_NOTES_ID,
  selectedNoteId: null,
  viewMode: 'notes',
  selectedTag: null,
  foldersSectionName: DEFAULT_FOLDERS_SECTION_NAME,
};

interface Store extends AppData {
  hydrated: boolean;
  searchOpen: boolean;
  settingsOpen: boolean;
  mobileNavOpen: boolean;
  folderDialogRequest: 'secret' | 'link' | null;
  requestFolderDialog: (type: 'secret' | 'link') => void;
  clearFolderDialogRequest: () => void;
  syncStatus: SyncStatus;
  syncError: string | null;
  hydrate: (userId?: string | null, generation?: number) => Promise<void>;
  rehydrate: (userId: string | null) => Promise<void>;
  startCloudSync: (userId: string) => void;
  stopCloudSync: () => void;
  pullRemoteSync: (userId?: string) => Promise<void>;
  persist: () => Promise<void>;
  persistLocal: () => Promise<void>;
  flushPersist: () => Promise<void>;
  mergeAndUploadDeviceNotes: () => Promise<{ notes: number; folders: number }>;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setColorPalette: (palette: ColorPalette) => void;
  setViewMode: (mode: ViewMode) => void;
  selectAllNotes: () => void;
  selectFolder: (id: string) => void;
  selectNote: (id: string | null) => void;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  closeMobileNav: () => void;
  createFolder: (
    name: string,
    options?: { parentId?: string | null; isParent?: boolean },
  ) => string;
  renameFolder: (id: string, name: string) => void;
  setFoldersSectionName: (name: string) => void;
  updateFolder: (id: string, updates: Partial<Pick<Folder, 'name' | 'calendarColor'>>) => void;
  reorderFolders: (folderIds: string[]) => void;
  moveFolderInTree: (
    folderId: string,
    target: { parentId: string | null; insertBeforeId?: string },
  ) => void;
  deleteFolder: (id: string) => void;
  createNote: (folderId?: string | null, title?: string, options?: { keepView?: boolean }) => string;
  createNoteFromImport: (partial: Partial<Note>, folderId?: string | null) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  duplicateNote: (id: string) => string;
  archiveNote: (id: string) => void;
  archiveFolder: (id: string) => void;
  restoreFolder: (id: string) => void;
  togglePinNote: (id: string) => void;
  togglePinFolderLink: (id: string) => void;
  moveNote: (noteId: string, folderId: string | null) => void;
  reorderNotes: (folderId: string | null, noteIds: string[]) => void;
  toggleNoteEditorMode: (id: string) => void;
  addTagToNote: (id: string, tag: string) => void;
  removeTagFromNote: (id: string, tag: string) => void;
  addAttachment: (noteId: string, file: File) => Promise<NoteAttachment | null>;
  removeAttachment: (noteId: string, attachmentId: string) => void;
  createFolderLink: (folderId: string, title: string, url: string) => void;
  updateFolderLink: (id: string, updates: Partial<Pick<FolderLink, 'title' | 'url' | 'pinned'>>) => void;
  deleteFolderLink: (id: string) => void;
  createFolderSecret: (
    folderId: string,
    data: Pick<FolderSecret, 'title' | 'type' | 'value'> &
      Partial<Pick<FolderSecret, 'username' | 'linkId' | 'notes'>>,
  ) => void;
  updateFolderSecret: (
    id: string,
    updates: Partial<
      Pick<FolderSecret, 'title' | 'type' | 'value' | 'username' | 'linkId' | 'notes'>
    >,
  ) => void;
  deleteFolderSecret: (id: string) => void;
  importData: (data: AppData, merge: boolean) => void;
  getDisplayedNotes: () => Note[];
  getNotesByFolder: (folderId: string | null) => Note[];
  getPinnedNotes: () => Note[];
  getAllTags: () => string[];
  getScheduledNotes: () => Note[];
  openNoteByTitle: (title: string) => boolean;
}

function getPersistableData(state: Store): AppData {
  return {
    folders: state.folders,
    notes: state.notes,
    noteDeletions: state.noteDeletions ?? [],
    folderLinks: state.folderLinks,
    folderSecrets: state.folderSecrets,
    theme: state.theme,
    colorPalette: state.colorPalette,
    selectedFolderId: state.selectedFolderId,
    selectedNoteId: state.selectedNoteId,
    viewMode: state.viewMode,
    selectedTag: state.selectedTag,
    foldersSectionName: state.foldersSectionName,
  };
}

/** Ignore stale hydrate/rehydrate results when auth changes mid-load. */
let hydrateGeneration = 0;

const HYDRATE_CLOUD_TIMEOUT_MS = 25_000;

function isHydrateGenerationCurrent(generation: number) {
  return generation === hydrateGeneration;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

let skipCloudPush = false;

/** Timestamp of our last successful cloud push (echo detection). */
let lastCloudPushAt = 0;

/** Latest cloud row timestamp we have merged into this client. */
let lastKnownCloudUpdatedAt = 0;

let lastPushedPayloadJson: string | null = null;

let unsubscribeCloud: (() => void) | null = null;

let cloudPullInterval: ReturnType<typeof setInterval> | null = null;

let cloudPushInFlight: Promise<void> | null = null;

let lastPushFailAt = 0;
let lastFailedPayloadJson: string | null = null;
const PUSH_RETRY_MS = 30_000;

function resetCloudSyncTracking() {
  lastCloudPushAt = 0;
  lastKnownCloudUpdatedAt = 0;
  lastPushedPayloadJson = null;
  lastPushFailAt = 0;
  lastFailedPayloadJson = null;
}

function markCloudApplied(updatedAt: string) {
  const t = new Date(updatedAt).getTime();
  lastKnownCloudUpdatedAt = t;
}

function markCloudPushed(updatedAt: string, payload: SyncPayload) {
  const t = new Date(updatedAt).getTime();
  lastCloudPushAt = t;
  lastKnownCloudUpdatedAt = t;
  lastPushedPayloadJson = JSON.stringify(payload);
}

function getSyncPayload(state: Store): SyncPayload {
  return {
    folders: state.folders,
    notes: state.notes,
    noteDeletions: state.noteDeletions ?? [],
    folderLinks: state.folderLinks,
    folderSecrets: state.folderSecrets,
    theme: state.theme,
    colorPalette: state.colorPalette,
    foldersSectionName: state.foldersSectionName,
  };
}

function hasSyncContent(payload: SyncPayload): boolean {
  return (
    payload.notes.length > 0 ||
    payload.folders.length > 0 ||
    payload.folderLinks.length > 0 ||
    payload.folderSecrets.length > 0
  );
}

async function loadLocalRaw(): Promise<AppData | null> {
  if (window.electronAPI?.isElectron) {
    return window.electronAPI.loadData();
  }
  const stored = localStorage.getItem('notes-app-data');
  if (!stored) return null;
  return JSON.parse(stored) as AppData;
}

/** Desktop file + .bak backup merged (backup often has pre-sync notes). */
async function loadDeviceRawForUpload(): Promise<AppData | null> {
  const current = await loadLocalRaw();
  const backup =
    window.electronAPI?.loadDataBackup != null
      ? await window.electronAPI.loadDataBackup()
      : null;

  if (!current && !backup) return null;
  if (!backup) return current;
  if (!current) return backup;

  const merged = mergeSyncPayloads(
    getSyncPayload(migrateData(backup) as Store),
    getSyncPayload(migrateData(current) as Store),
  );
  return { ...current, ...merged };
}

async function saveLocalRaw(data: AppData): Promise<void> {
  if (window.electronAPI?.isElectron) {
    const ok = window.electronAPI.saveDataSync
      ? window.electronAPI.saveDataSync(data)
      : await window.electronAPI.saveData(data);
    if (!ok) console.error('Failed to save notes to disk');
    return;
  }
  localStorage.setItem('notes-app-data', JSON.stringify(data));
}

function scheduleSave(getState: () => Store) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    void getState().persist();
  }, 100);
}

function migrateNote(
  note: Partial<Note> & Pick<Note, 'id' | 'title' | 'content' | 'createdAt' | 'updatedAt' | 'isTask' | 'order'>,
): Note {
  const scheduledAt = note.scheduledAt || undefined;
  const isTask = note.isTask ?? Boolean(scheduledAt);
  return {
    contentType: note.contentType ?? 'html',
    tags: note.tags ?? [],
    pinned: note.pinned ?? false,
    attachments: note.attachments ?? [],
    calendarColor: note.calendarColor ?? 'blue',
    ...note,
    folderId: note.folderId ?? null,
    scheduledAt,
    isTask,
  };
}

function normalizeNoteFolderId(folderId: string | null | undefined, folderIds: Set<string>): string | null {
  if (!folderId || folderId === DEFAULT_FOLDER_ID || !folderIds.has(folderId)) return null;
  return folderId;
}

function migrateFolderLink(link: Partial<FolderLink> & Pick<FolderLink, 'id' | 'folderId' | 'title' | 'url'>): FolderLink {
  return {
    ...link,
    order: link.order ?? 0,
    createdAt: link.createdAt ?? new Date().toISOString(),
    pinned: link.pinned ?? false,
  };
}

function migrateFolder(folder: Folder): Folder {
  return {
    ...folder,
    calendarColor: folder.calendarColor ?? 'blue',
    archived: folder.archived ?? false,
    isParent: folder.isParent ?? false,
    parentId: folder.parentId ?? null,
  };
}

function migrateData(data: Partial<AppData>): AppData {
  const folders = (data.folders ?? [])
    .filter((f) => f.id !== DEFAULT_FOLDER_ID)
    .map((f) => migrateFolder(f));
  const folderIds = new Set(folders.map((f) => f.id));
  const notes = (data.notes ?? [])
    .filter((n): n is Note => Boolean(n && typeof n === 'object' && n.id))
    .map((n) =>
      migrateNote({
        ...n,
        folderId: normalizeNoteFolderId(n.folderId, folderIds),
      }),
    );
  const folderLinks = (data.folderLinks ?? [])
    .filter((l): l is FolderLink => Boolean(l && typeof l === 'object' && l.id && l.folderId && l.url))
    .map((l) => migrateFolderLink(l));
  const selectedFolderId = data.selectedFolderId;
  return {
    ...defaultData,
    ...data,
    folders,
    notes,
    folderLinks,
    folderSecrets: data.folderSecrets ?? [],
    noteDeletions: (data.noteDeletions ?? []).filter(
      (d): d is { id: string; deletedAt: string } =>
        Boolean(d && typeof d.id === 'string' && typeof d.deletedAt === 'string'),
    ),
    colorPalette: (() => {
      const raw = data.colorPalette as string | undefined;
      if (raw === 'mono') return 'default';
      return (data.colorPalette ?? 'default') as ColorPalette;
    })(),
    selectedTag: data.selectedTag ?? null,
    selectedFolderId:
      !selectedFolderId || selectedFolderId === DEFAULT_FOLDER_ID
        ? ALL_NOTES_ID
        : selectedFolderId,
    foldersSectionName: data.foldersSectionName?.trim() || DEFAULT_FOLDERS_SECTION_NAME,
  };
}

export const useStore = create<Store>((set, get) => ({
  ...defaultData,
  hydrated: false,
  searchOpen: false,
  settingsOpen: false,
  mobileNavOpen: false,
  folderDialogRequest: null,
  syncStatus: 'offline',
  syncError: null,

  rehydrate: async (userId) => {
    const generation = ++hydrateGeneration;
    if (!userId) resetCloudSyncTracking();
    set({
      hydrated: false,
      syncStatus: userId && isSyncAvailable() ? 'syncing' : 'offline',
      syncError: null,
    });
    await get().hydrate(userId, generation);
  },

  pullRemoteSync: async (userId = useAuthStore.getState().user?.id ?? undefined) => {
    if (!userId || !isSyncAvailable() || !get().hydrated) return;

    try {
      const cloud = await pullCloudData(userId);
      if (!cloud) {
        set({ syncStatus: 'synced', syncError: null });
        return;
      }

      const cloudTime = new Date(cloud.updatedAt).getTime();
      const current = get();
      const localPayload = getSyncPayload(current);
      const merged = mergeSyncPayloads(localPayload, cloud.payload);
      const unchanged = JSON.stringify(localPayload) === JSON.stringify(merged);

      if (unchanged) {
        if (cloudTime > lastKnownCloudUpdatedAt) {
          markCloudApplied(cloud.updatedAt);
        }
        lastPushFailAt = 0;
        lastFailedPayloadJson = null;
        set({ syncStatus: 'synced', syncError: null });
        return;
      }

      skipCloudPush = true;
      set({
        ...migrateData({
          ...getPersistableData(current),
          ...merged,
        }),
        syncStatus: 'synced',
        syncError: null,
      });
      skipCloudPush = false;
      markCloudApplied(cloud.updatedAt);
      lastPushFailAt = 0;
      lastFailedPayloadJson = null;
      await get().persistLocal();
      void get().persist();
    } catch (err) {
      console.error('Remote sync failed:', err);
      set({
        syncStatus: 'error',
        syncError: formatSyncError(err),
      });
      throw err;
    }
  },

  startCloudSync: (userId) => {
    get().stopCloudSync();
    unsubscribeCloud = subscribeCloudChanges(userId, () => {
      if (Math.abs(Date.now() - lastCloudPushAt) < 500) return;
      void get().pullRemoteSync(userId);
    });

    void get().pullRemoteSync(userId);
    cloudPullInterval = setInterval(() => {
      void get().pullRemoteSync(userId);
    }, 30_000);
  },

  stopCloudSync: () => {
    unsubscribeCloud?.();
    unsubscribeCloud = null;
    if (cloudPullInterval) {
      clearInterval(cloudPullInterval);
      cloudPullInterval = null;
    }
  },

  hydrate: async (userId = null, generation = hydrateGeneration) => {
    const isStale = () => !isHydrateGenerationCurrent(generation);

    const finishHydrated = (partial: Partial<Store>) => {
      if (isStale()) return;
      set({ ...partial, hydrated: true });
      if (userId && isSyncAvailable()) {
        void get().persist();
      }
    };

    try {
      let raw = await loadLocalRaw();
      if (isStale()) return;

      if (userId && isSyncAvailable()) {
        try {
          const cloud = await withSyncTimeout(
            pullCloudData(userId),
            HYDRATE_CLOUD_TIMEOUT_MS,
            'Loading notes',
          );
          if (isStale()) return;

          if (cloud && raw) {
            const localPayload = getSyncPayload(migrateData(raw) as Store);
            const merged = mergeSyncPayloads(localPayload, cloud.payload);
            markCloudApplied(cloud.updatedAt);
            raw = {
              ...(raw ?? defaultData),
              ...merged,
              selectedFolderId: raw?.selectedFolderId ?? defaultData.selectedFolderId,
              selectedNoteId: raw?.selectedNoteId ?? null,
              viewMode: raw?.viewMode ?? defaultData.viewMode,
              selectedTag: raw?.selectedTag ?? null,
            };
          } else if (cloud && (!raw || !hasSyncContent(getSyncPayload(migrateData(raw) as Store)))) {
            markCloudApplied(cloud.updatedAt);
            raw = {
              ...defaultData,
              ...cloud.payload,
            };
          }
          if (!isStale()) set({ syncStatus: 'synced', syncError: null });
        } catch (err) {
          console.error('Cloud sync failed:', err);
          if (!isStale()) {
            set({
              syncStatus: 'error',
              syncError: formatSyncError(err),
            });
          }
        }
      } else if (!isStale()) {
        set({ syncStatus: 'offline', syncError: null });
      }

      if (isStale()) return;

      if (raw) {
        finishHydrated(migrateData(raw) as Partial<Store>);
        if (!isStale() && window.electronAPI?.isElectron) {
          await saveLocalRaw(getPersistableData(get()));
        }
        return;
      }

      const hasExistingFile =
        window.electronAPI?.hasDataFile != null
          ? await window.electronAPI.hasDataFile()
          : Boolean(localStorage.getItem('notes-app-data'));

      if (hasExistingFile) {
        console.error('Saved data exists but could not be loaded — not overwriting.');
        finishHydrated({});
        return;
      }
    } catch (err) {
      console.error('Failed to load saved data:', err);
      finishHydrated({});
      return;
    }

    if (isStale()) return;

    const welcomeId = uuidv4();
    const now = new Date().toISOString();
    finishHydrated({
      notes: [
        migrateNote({
          id: welcomeId,
          folderId: null,
          title: 'Welcome to Notes',
          content: `<h1>Welcome to Notes</h1>
<p>Your personal note-taking app. Here's what you can do:</p>
<ul>
<li><strong>Folders</strong> — Organize notes in the sidebar</li>
<li><strong>Markdown mode</strong> — Toggle with the MD button in the editor</li>
<li><strong>Wiki links</strong> — Type [[Note Title]] to link between notes</li>
<li><strong>Tags</strong> — Add tags at the bottom of any note</li>
<li><strong>Calendar</strong> — Schedule tasks with date/time</li>
<li><strong>Search</strong> — Press Ctrl+K to search everything</li>
</ul>
<p>Press <strong>Ctrl+N</strong> for a new note, <strong>Ctrl+Shift+D</strong> to toggle dark mode.</p>`,
          contentType: 'html',
          tags: ['welcome'],
          pinned: true,
          createdAt: now,
          updatedAt: now,
          isTask: false,
          order: 0,
        }),
      ],
      selectedNoteId: welcomeId,
    });
  },

  persistLocal: async () => {
    if (!get().hydrated) return;
    await saveLocalRaw(getPersistableData(get()));
  },

  mergeAndUploadDeviceNotes: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId || !isSyncAvailable()) {
      throw new Error('Sign in to sync first');
    }

    const localRaw = await loadDeviceRawForUpload();
    if (!localRaw) {
      throw new Error('No notes found on this device');
    }

    const localPayload = getSyncPayload(migrateData(localRaw) as Store);
    const cloud = await pullCloudData(userId);
    const merged = mergeSyncPayloads(localPayload, cloud?.payload ?? emptySyncPayload());

    skipCloudPush = true;
    const current = get();
    set({
      ...migrateData({
        ...getPersistableData(current),
        ...merged,
      }),
      syncStatus: 'syncing',
      syncError: null,
    });
    skipCloudPush = false;

    const updatedAt = await pushCloudData(userId, merged);
    markCloudPushed(updatedAt, merged);
    await get().persistLocal();
    set({ syncStatus: 'synced', syncError: null });

    return { notes: merged.notes.length, folders: merged.folders.length };
  },

  persist: async () => {
    if (!get().hydrated) return;
    await get().persistLocal();

    if (skipCloudPush || !isSyncAvailable()) return;

    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const payload = getSyncPayload(get());
    const payloadJson = JSON.stringify(payload);
    if (payloadJson === lastPushedPayloadJson) return;

    if (
      payloadJson === lastFailedPayloadJson &&
      Date.now() - lastPushFailAt < PUSH_RETRY_MS
    ) {
      return;
    }

    if (cloudPushInFlight) {
      await cloudPushInFlight;
      return;
    }

    cloudPushInFlight = (async () => {
      set({ syncStatus: 'syncing', syncError: null });
      try {
        let payloadToPush = getSyncPayload(get());
        try {
          const cloud = await withSyncTimeout(pullCloudData(userId), 15_000, 'Sync');
          if (cloud) {
            const merged = mergeSyncPayloads(payloadToPush, cloud.payload);
            const mergedJson = JSON.stringify(merged);
            const localJson = JSON.stringify(payloadToPush);
            if (mergedJson !== localJson) {
              skipCloudPush = true;
              set({
                ...migrateData({
                  ...getPersistableData(get()),
                  ...merged,
                }),
              });
              skipCloudPush = false;
              payloadToPush = merged;
              await get().persistLocal();
            }
            const cloudTime = new Date(cloud.updatedAt).getTime();
            if (cloudTime > lastKnownCloudUpdatedAt) {
              markCloudApplied(cloud.updatedAt);
            }
          }
        } catch (pullErr) {
          console.warn('Pre-push cloud merge skipped:', pullErr);
        }

        const pushJson = JSON.stringify(payloadToPush);
        if (pushJson === lastPushedPayloadJson) {
          set({ syncStatus: 'synced', syncError: null });
          return;
        }

        const updatedAt = await pushCloudData(userId, payloadToPush);
        markCloudPushed(updatedAt, payloadToPush);
        lastPushFailAt = 0;
        lastFailedPayloadJson = null;
        set({ syncStatus: 'synced', syncError: null });
      } catch (err) {
        console.error('Cloud push failed:', err);
        lastPushFailAt = Date.now();
        lastFailedPayloadJson = JSON.stringify(getSyncPayload(get()));
        set({
          syncStatus: 'error',
          syncError: formatSyncError(err),
        });
      } finally {
        cloudPushInFlight = null;
      }
    })();

    await cloudPushInFlight;
  },

  flushPersist: async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    if (!get().hydrated) return;
    if (window.electronAPI?.saveDataSync) {
      const ok = window.electronAPI.saveDataSync(getPersistableData(get()));
      if (!ok) console.error('Failed to save notes to disk');
    }
    await get().persist();
  },

  setTheme: (theme) => {
    set({ theme });
    scheduleSave(get);
  },

  toggleTheme: () => {
    const theme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme });
    scheduleSave(get);
  },

  setColorPalette: (colorPalette) => {
    set({ colorPalette });
    scheduleSave(get);
  },

  setViewMode: (viewMode) => set({ viewMode, mobileNavOpen: false }),

  selectAllNotes: () => {
    set({ selectedFolderId: ALL_NOTES_ID, selectedNoteId: null, viewMode: 'notes', mobileNavOpen: false });
    scheduleSave(get);
  },

  selectFolder: (selectedFolderId) => {
    set({ selectedFolderId, selectedNoteId: null, viewMode: 'notes', mobileNavOpen: false });
    scheduleSave(get);
  },

  selectNote: (selectedNoteId) => {
    set({ selectedNoteId, viewMode: 'notes', mobileNavOpen: false });
    scheduleSave(get);
  },

  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  requestFolderDialog: (type) => set({ folderDialogRequest: type }),
  clearFolderDialogRequest: () => set({ folderDialogRequest: null }),

  createFolder: (name, options) => {
    const isParent = options?.isParent ?? false;
    const parentId = isParent ? null : (options?.parentId ?? null);
    const parentSections = get().folders.filter(
      (f) => !isFolderArchived(f) && f.isParent,
    );
    const rootNoteFolders = get().folders.filter(
      (f) => !isFolderArchived(f) && !f.parentId && !f.isParent,
    );
    const childSiblings = parentId
      ? get().folders.filter((f) => !isFolderArchived(f) && f.parentId === parentId)
      : [];
    const folder: Folder = migrateFolder({
      id: uuidv4(),
      name,
      order: isParent
        ? parentSections.length
        : parentId
          ? childSiblings.length
          : rootNoteFolders.length,
      calendarColor: 'blue',
      archived: false,
      isParent,
      parentId,
    });
    set((s) => ({ folders: [...s.folders, folder] }));
    scheduleSave(get);
    return folder.id;
  },

  renameFolder: (id, name) => {
    set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
    scheduleSave(get);
  },

  setFoldersSectionName: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set({ foldersSectionName: trimmed });
    scheduleSave(get);
  },

  updateFolder: (id, updates) => {
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
    scheduleSave(get);
  },

  reorderFolders: (folderIds) => {
    const anchor = get().folders.find((f) => f.id === folderIds[0]);
    if (!anchor) return;
    const isRootScope = !anchor.parentId;
    set((s) => ({
      folders: s.folders.map((f) => {
        const inScope = isRootScope
          ? !f.parentId && !f.isParent
          : f.parentId === anchor.parentId;
        if (!inScope) return f;
        const order = folderIds.indexOf(f.id);
        return order >= 0 ? { ...f, order } : f;
      }),
    }));
    scheduleSave(get);
  },

  moveFolderInTree: (folderId, target) => {
    const state = get();
    const folder = state.folders.find((f) => f.id === folderId);
    if (!folder || folder.isParent || isFolderArchived(folder)) {
      dndLog('moveFolderInTree → blocked', {
        folderId,
        target,
        reason: !folder
          ? 'folder not found'
          : folder.isParent
            ? 'folder is parent'
            : 'folder archived',
      });
      return;
    }

    const parentId = target.parentId;
    if (parentId) {
      const parent = state.folders.find((f) => f.id === parentId);
      if (!parent?.isParent || isFolderArchived(parent)) {
        dndLog('moveFolderInTree → blocked', {
          folderId,
          folderName: folder.name,
          targetParentId: parentId,
          parentFound: Boolean(parent),
          parentIsParent: parent?.isParent ?? false,
          parentArchived: parent ? isFolderArchived(parent) : null,
          reason: 'invalid parent target',
        });
        return;
      }
    }

    const sourceParentId = folder.parentId ?? null;
    const targetIds = state.folders
      .filter(
        (f) =>
          !isFolderArchived(f) &&
          !f.isParent &&
          f.id !== folderId &&
          (f.parentId ?? null) === parentId,
      )
      .sort((a, b) => a.order - b.order)
      .map((f) => f.id);

    if (target.insertBeforeId && targetIds.includes(target.insertBeforeId)) {
      targetIds.splice(targetIds.indexOf(target.insertBeforeId), 0, folderId);
    } else {
      targetIds.push(folderId);
    }

    const sourceIds =
      sourceParentId === parentId
        ? targetIds
        : state.folders
            .filter(
              (f) =>
                !isFolderArchived(f) &&
                !f.isParent &&
                f.id !== folderId &&
                (f.parentId ?? null) === sourceParentId,
            )
            .sort((a, b) => a.order - b.order)
            .map((f) => f.id);

    dndLog('moveFolderInTree → applying', {
      folderId,
      folderName: folder.name,
      fromParentId: sourceParentId,
      toParentId: parentId,
      insertBeforeId: target.insertBeforeId ?? null,
      targetOrder: targetIds,
    });

    set((s) => ({
      folders: s.folders.map((f) => {
        if (f.id === folderId) {
          return { ...f, parentId, order: targetIds.indexOf(folderId) };
        }
        if (f.isParent || isFolderArchived(f)) return f;
        const scope = f.parentId ?? null;
        if (scope === parentId) {
          const order = targetIds.indexOf(f.id);
          if (order >= 0) return { ...f, order };
        }
        if (scope === sourceParentId && sourceParentId !== parentId) {
          const order = sourceIds.indexOf(f.id);
          if (order >= 0) return { ...f, order };
        }
        return f;
      }),
    }));
    scheduleSave(get);
  },

  deleteFolder: (id) => {
    set((s) => ({
      folders: s.folders
        .filter((f) => f.id !== id)
        .map((f) => (f.parentId === id ? { ...f, parentId: null } : f)),
      notes: s.notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)),
      folderLinks: s.folderLinks.filter((l) => l.folderId !== id),
      folderSecrets: s.folderSecrets.filter((s) => s.folderId !== id),
      selectedFolderId: s.selectedFolderId === id ? ALL_NOTES_ID : s.selectedFolderId,
    }));
    scheduleSave(get);
  },

  createNote: (folderId = null, title = 'Untitled', options) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const scopedNotes = notesInFolder(get().notes, folderId);
    const note: Note = migrateNote({
      id,
      folderId,
      title,
      content: '',
      contentType: 'html',
      createdAt: now,
      updatedAt: now,
      isTask: false,
      order: scopedNotes.length,
    });
    set((s) => ({
      notes: [...s.notes, note],
      selectedNoteId: options?.keepView ? s.selectedNoteId : id,
      selectedFolderId: folderId ?? (options?.keepView ? s.selectedFolderId : ALL_NOTES_ID),
      viewMode: options?.keepView ? s.viewMode : 'notes',
    }));
    scheduleSave(get);
    return id;
  },

  createNoteFromImport: (partial, folderId = null) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const note: Note = migrateNote({
      id,
      folderId: folderId ?? null,
      title: partial.title ?? 'Imported Note',
      content: partial.content ?? '',
      contentType: partial.contentType ?? 'html',
      tags: partial.tags ?? [],
      createdAt: now,
      updatedAt: now,
      isTask: false,
      order: notesInFolder(get().notes, folderId ?? null).length,
    });
    set((s) => ({ notes: [...s.notes, note] }));
    scheduleSave(get);
    return id;
  },

  updateNote: (id, updates) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
      ),
    }));
    scheduleSave(get);
  },

  deleteNote: (id) => {
    const deletedAt = new Date().toISOString();
    set((s) => {
      const noteDeletions = [...(s.noteDeletions ?? [])];
      const existing = noteDeletions.findIndex((d) => d.id === id);
      if (existing >= 0) noteDeletions[existing] = { id, deletedAt };
      else noteDeletions.push({ id, deletedAt });

      return {
        notes: s.notes.filter((n) => n.id !== id),
        noteDeletions,
        selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
      };
    });
    scheduleSave(get);
  },

  duplicateNote: (id) => {
    const source = get().notes.find((n) => n.id === id);
    if (!source) return '';

    const newId = uuidv4();
    const now = new Date().toISOString();
    const folderNotes = notesInFolder(get().notes, source.folderId);
    const copy = migrateNote({
      ...source,
      id: newId,
      title: source.title.trim() ? `${source.title.trim()} (copy)` : 'Untitled (copy)',
      pinned: false,
      attachments: source.attachments.map((a) => ({ ...a, id: uuidv4() })),
      createdAt: now,
      updatedAt: now,
      order: folderNotes.length,
    });

    set((s) => ({
      notes: [...s.notes, copy],
      selectedNoteId: newId,
      selectedFolderId: source.folderId ?? ALL_NOTES_ID,
      viewMode: 'notes',
    }));
    scheduleSave(get);
    return newId;
  },

  archiveNote: (noteId) => {
    const state = get();
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return;

    const sourceFolder = note.folderId
      ? state.folders.find((f) => f.id === note.folderId)
      : null;
    if (!sourceFolder || isFolderArchived(sourceFolder)) return;

    let archiveFolder = state.folders.find(
      (f) => isFolderArchived(f) && f.name.toLowerCase() === sourceFolder.name.toLowerCase(),
    );

    const folders = [...state.folders];
    if (!archiveFolder) {
      archiveFolder = migrateFolder({
        id: uuidv4(),
        name: sourceFolder.name,
        order: folders.filter((f) => isFolderArchived(f)).length,
        calendarColor: sourceFolder.calendarColor,
        archived: true,
      });
      folders.push(archiveFolder);
    }

    const archiveNoteCount = state.notes.filter((n) => n.folderId === archiveFolder!.id).length;
    const notes = state.notes.map((n) =>
      n.id === noteId
        ? {
            ...n,
            folderId: archiveFolder!.id,
            order: archiveNoteCount,
            pinned: false,
            updatedAt: new Date().toISOString(),
          }
        : n,
    );

    set({
      folders,
      notes,
      selectedFolderId: archiveFolder.id,
      selectedNoteId: noteId,
      viewMode: 'notes',
    });
    scheduleSave(get);
  },

  archiveFolder: (folderId) => {
    const state = get();
    const folder = state.folders.find((f) => f.id === folderId);
    if (!folder || isFolderArchived(folder) || folder.isParent) return;

    const archiveOrder = state.folders.filter((f) => isFolderArchived(f)).length;
    const folders = state.folders.map((f) =>
      f.id === folderId ? { ...f, archived: true, order: archiveOrder, parentId: null } : f,
    );

    set({
      folders,
      selectedFolderId: get().selectedFolderId === folderId ? folderId : get().selectedFolderId,
      viewMode: 'notes',
    });
    scheduleSave(get);
  },

  restoreFolder: (folderId) => {
    const state = get();
    const folder = state.folders.find((f) => f.id === folderId);
    if (!folder || !isFolderArchived(folder)) return;

    const existingActive = state.folders.find(
      (f) =>
        !isFolderArchived(f) &&
        f.id !== folderId &&
        f.name.toLowerCase() === folder.name.toLowerCase(),
    );

    if (existingActive) {
      const targetId = existingActive.id;
      let noteOrder = state.notes.filter((n) => n.folderId === targetId).length;
      const notes = state.notes.map((n) => {
        if (n.folderId !== folderId) return n;
        return {
          ...n,
          folderId: targetId,
          order: noteOrder++,
          updatedAt: new Date().toISOString(),
        };
      });

      let linkOrder = state.folderLinks.filter((l) => l.folderId === targetId).length;
      const folderLinks = state.folderLinks.map((l) => {
        if (l.folderId !== folderId) return l;
        return { ...l, folderId: targetId, order: linkOrder++ };
      });

      let secretOrder = state.folderSecrets.filter((s) => s.folderId === targetId).length;
      const folderSecrets = state.folderSecrets.map((s) => {
        if (s.folderId !== folderId) return s;
        return { ...s, folderId: targetId, order: secretOrder++ };
      });

      set({
        folders: state.folders.filter((f) => f.id !== folderId),
        notes,
        folderLinks,
        folderSecrets,
        selectedFolderId: targetId,
        viewMode: 'notes',
      });
    } else {
      const activeCount = state.folders.filter((f) => !isFolderArchived(f)).length;
      const folders = state.folders.map((f) =>
        f.id === folderId ? { ...f, archived: false, order: activeCount } : f,
      );
      set({ folders, selectedFolderId: folderId, viewMode: 'notes' });
    }
    scheduleSave(get);
  },

  togglePinNote: (id) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n
      ),
    }));
    scheduleSave(get);
  },

  togglePinFolderLink: (id) => {
    set((s) => ({
      folderLinks: s.folderLinks.map((l) =>
        l.id === id ? { ...l, pinned: !(l.pinned ?? false) } : l
      ),
    }));
    scheduleSave(get);
  },

  moveNote: (noteId, folderId) => {
    const note = get().notes.find((n) => n.id === noteId);
    if (folderId) {
      const folder = get().folders.find((f) => f.id === folderId);
      if (!folder || isFolderArchived(folder) || folder.isParent) {
        dndLog('moveNote → blocked', {
          noteId,
          noteTitle: note?.title ?? '?',
          targetFolderId: folderId,
          folderFound: Boolean(folder),
          folderName: folder?.name ?? null,
          folderIsParent: folder?.isParent ?? null,
          folderArchived: folder ? isFolderArchived(folder) : null,
        });
        return;
      }
    }
    const folderNotes = notesInFolder(get().notes, folderId);
    dndLog('moveNote → applying', {
      noteId,
      noteTitle: note?.title ?? '?',
      fromFolderId: note?.folderId ?? null,
      toFolderId: folderId,
      toFolderName: folderId ? get().folders.find((f) => f.id === folderId)?.name ?? '?' : null,
    });
    set((s) => ({
      notes: s.notes.map((n) => {
        if (n.id !== noteId) return n;
        const updates: Partial<typeof n> = { folderId, order: folderNotes.length };
        if (n.scheduledAt && folderId) {
          const folder = s.folders.find((f) => f.id === folderId);
          updates.calendarColor = folder?.calendarColor ?? 'blue';
        }
        return { ...n, ...updates };
      }),
    }));
    scheduleSave(get);
  },

  reorderNotes: (folderId, noteIds) => {
    set((s) => ({
      notes: s.notes.map((n) => {
        const inScope = folderId ? n.folderId === folderId : !n.folderId;
        if (!inScope) return n;
        const order = noteIds.indexOf(n.id);
        return order >= 0 ? { ...n, order } : n;
      }),
    }));
    scheduleSave(get);
  },

  toggleNoteEditorMode: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    if (note.contentType === 'html') {
      get().updateNote(id, { content: htmlToMarkdown(note.content), contentType: 'markdown' });
    } else {
      get().updateNote(id, { content: markdownToHtml(note.content), contentType: 'html' });
    }
  },

  addTagToNote: (id, tag) => {
    const normalized = tag.trim().toLowerCase();
    if (!normalized) return;
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id && !n.tags.includes(normalized)
          ? { ...n, tags: [...n.tags, normalized], updatedAt: new Date().toISOString() }
          : n
      ),
    }));
    scheduleSave(get);
  },

  removeTagFromNote: (id, tag) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id
          ? { ...n, tags: n.tags.filter((t) => t !== tag), updatedAt: new Date().toISOString() }
          : n
      ),
    }));
    scheduleSave(get);
  },

  addAttachment: async (noteId, file) => {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const attachment = {
      id: uuidv4(),
      name: file.name,
      dataUrl,
      mimeType: file.type || 'application/octet-stream',
    };
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? { ...n, attachments: [...n.attachments, attachment], updatedAt: new Date().toISOString() }
          : n
      ),
    }));
    scheduleSave(get);
    return attachment;
  },

  removeAttachment: (noteId, attachmentId) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? { ...n, attachments: n.attachments.filter((a) => a.id !== attachmentId) }
          : n
      ),
    }));
    scheduleSave(get);
  },

  createFolderLink: (folderId, title, url) => {
    const trimmedUrl = url.trim();
    const normalizedUrl = /^(https?:\/\/|mailto:|tel:)/i.test(trimmedUrl)
      ? trimmedUrl
      : `https://${trimmedUrl}`;
    const link: FolderLink = {
      id: uuidv4(),
      folderId,
      title: title.trim() || normalizedUrl,
      url: normalizedUrl,
      order: get().folderLinks.filter((l) => l.folderId === folderId).length,
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ folderLinks: [...s.folderLinks, link] }));
    scheduleSave(get);
  },

  updateFolderLink: (id, updates) => {
    set((s) => ({
      folderLinks: s.folderLinks.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...updates };
        if (updates.url) {
          const trimmed = updates.url.trim();
          next.url = /^(https?:\/\/|mailto:|tel:)/i.test(trimmed)
            ? trimmed
            : `https://${trimmed}`;
        }
        if (updates.title !== undefined) {
          next.title = updates.title.trim() || next.url;
        }
        return next;
      }),
    }));
    scheduleSave(get);
  },

  deleteFolderLink: (id) => {
    set((s) => ({
      folderLinks: s.folderLinks.filter((l) => l.id !== id),
      folderSecrets: s.folderSecrets.map((sec) =>
        sec.linkId === id ? { ...sec, linkId: undefined, updatedAt: new Date().toISOString() } : sec
      ),
    }));
    scheduleSave(get);
  },

  createFolderSecret: (folderId, data) => {
    const now = new Date().toISOString();
    const secret: FolderSecret = {
      id: uuidv4(),
      folderId,
      title: data.title.trim() || 'Untitled',
      type: data.type,
      value: data.value,
      username: data.username?.trim() || undefined,
      linkId: data.linkId || undefined,
      notes: data.notes?.trim() || undefined,
      order: get().folderSecrets.filter((s) => s.folderId === folderId).length,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ folderSecrets: [...s.folderSecrets, secret] }));
    scheduleSave(get);
  },

  updateFolderSecret: (id, updates) => {
    set((s) => ({
      folderSecrets: s.folderSecrets.map((sec) =>
        sec.id === id
          ? {
              ...sec,
              ...updates,
              title: updates.title !== undefined ? updates.title.trim() || 'Untitled' : sec.title,
              username: updates.username !== undefined ? updates.username.trim() || undefined : sec.username,
              notes: updates.notes !== undefined ? updates.notes.trim() || undefined : sec.notes,
              updatedAt: new Date().toISOString(),
            }
          : sec
      ),
    }));
    scheduleSave(get);
  },

  deleteFolderSecret: (id) => {
    set((s) => ({ folderSecrets: s.folderSecrets.filter((sec) => sec.id !== id) }));
    scheduleSave(get);
  },

  importData: (data, merge) => {
    const migrated = migrateData(data);
    if (merge) {
      set((s) => ({
        folders: [...s.folders, ...migrated.folders.filter((f) => !s.folders.some((x) => x.id === f.id))],
        notes: [...s.notes, ...migrated.notes.filter((n) => !s.notes.some((x) => x.id === n.id))],
        folderLinks: [
          ...s.folderLinks,
          ...migrated.folderLinks.filter((l) => !s.folderLinks.some((x) => x.id === l.id)),
        ],
        folderSecrets: [
          ...s.folderSecrets,
          ...migrated.folderSecrets.filter((sec) => !s.folderSecrets.some((x) => x.id === sec.id)),
        ],
      }));
    } else {
      set({ ...migrated, hydrated: true });
    }
    scheduleSave(get);
  },

  getDisplayedNotes: () => {
    const { notes, selectedFolderId, folders } = get();
    let filtered = notes;
    if (selectedFolderId && selectedFolderId !== ALL_NOTES_ID) {
      filtered = filtered.filter((n) => n.folderId === selectedFolderId);
    } else if (selectedFolderId === ALL_NOTES_ID) {
      filtered = filtered.filter((n) => {
        if (!n.folderId) return true;
        const folder = folders.find((f) => f.id === n.folderId);
        return !isFolderArchived(folder);
      });
    }
    return filtered.sort((a, b) => {
      if (selectedFolderId === ALL_NOTES_ID) {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return a.order - b.order;
    });
  },

  getNotesByFolder: (folderId) =>
    notesInFolder(get().notes, folderId).sort((a, b) => a.order - b.order),

  getPinnedNotes: () =>
    get()
      .notes.filter((n) => n.pinned)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),

  getAllTags: () => {
    const tags = new Set<string>();
    get().notes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  },

  getScheduledNotes: () => get().notes.filter((n) => n.scheduledAt),

  openNoteByTitle: (title) => {
    const normalized = title.trim().toLowerCase();
    const note = get().notes.find((n) => n.title.trim().toLowerCase() === normalized)
      ?? get().notes.find((n) => n.title.trim().toLowerCase().includes(normalized));
    if (note) {
      set({ selectedNoteId: note.id, viewMode: 'notes' });
      scheduleSave(get);
      return true;
    }
    return false;
  },
}));

export { ALL_NOTES_ID };
