import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppData, Folder, FolderLink, FolderSecret, Note, NoteAttachment, Theme, ViewMode, ColorPalette } from '../types';
import { ALL_NOTES_ID, DEFAULT_FOLDER_ID, isFolderArchived } from '../types';
import { htmlToMarkdown, markdownToHtml } from '../utils/markdown';

const defaultData: AppData = {
  folders: [{ id: DEFAULT_FOLDER_ID, name: 'Other Notes', order: 0, calendarColor: 'blue' }],
  notes: [],
  folderLinks: [],
  folderSecrets: [],
  theme: 'light',
  colorPalette: 'default',
  selectedFolderId: ALL_NOTES_ID,
  selectedNoteId: null,
  viewMode: 'notes',
  selectedTag: null,
};

interface Store extends AppData {
  hydrated: boolean;
  searchOpen: boolean;
  settingsOpen: boolean;
  folderDialogRequest: 'secret' | 'link' | null;
  requestFolderDialog: (type: 'secret' | 'link') => void;
  clearFolderDialogRequest: () => void;
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  flushPersist: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setColorPalette: (palette: ColorPalette) => void;
  setViewMode: (mode: ViewMode) => void;
  selectAllNotes: () => void;
  selectFolder: (id: string) => void;
  selectNote: (id: string | null) => void;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  createFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  updateFolder: (id: string, updates: Partial<Pick<Folder, 'name' | 'calendarColor'>>) => void;
  reorderFolders: (folderIds: string[]) => void;
  deleteFolder: (id: string) => void;
  createNote: (folderId: string, title?: string, options?: { keepView?: boolean }) => string;
  createNoteFromImport: (partial: Partial<Note>, folderId?: string) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  duplicateNote: (id: string) => string;
  archiveNote: (id: string) => void;
  archiveFolder: (id: string) => void;
  restoreFolder: (id: string) => void;
  togglePinNote: (id: string) => void;
  togglePinFolderLink: (id: string) => void;
  moveNote: (noteId: string, folderId: string) => void;
  reorderNotes: (folderId: string, noteIds: string[]) => void;
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
  getNotesByFolder: (folderId: string) => Note[];
  getPinnedNotes: () => Note[];
  getAllTags: () => string[];
  getScheduledNotes: () => Note[];
  openNoteByTitle: (title: string) => boolean;
}

function getPersistableData(state: Store): AppData {
  return {
    folders: state.folders,
    notes: state.notes,
    folderLinks: state.folderLinks,
    folderSecrets: state.folderSecrets,
    theme: state.theme,
    colorPalette: state.colorPalette,
    selectedFolderId: state.selectedFolderId,
    selectedNoteId: state.selectedNoteId,
    viewMode: state.viewMode,
    selectedTag: state.selectedTag,
  };
}

let hydrateStarted = false;

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(getState: () => Store) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    void getState().persist();
  }, 100);
}

function migrateNote(note: Partial<Note> & Pick<Note, 'id' | 'folderId' | 'title' | 'content' | 'createdAt' | 'updatedAt' | 'isTask' | 'order'>): Note {
  return {
    contentType: note.contentType ?? 'html',
    tags: note.tags ?? [],
    pinned: note.pinned ?? false,
    attachments: note.attachments ?? [],
    calendarColor: note.calendarColor ?? 'blue',
    ...note,
  };
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
  };
}

function migrateData(data: Partial<AppData>): AppData {
  const folders = (data.folders ?? defaultData.folders).map((f) =>
    migrateFolder(
      f.id === DEFAULT_FOLDER_ID && f.name === 'Inbox'
        ? { ...f, name: 'Other Notes' }
        : f,
    ),
  );
  const notes = (data.notes ?? [])
    .filter((n): n is Note => Boolean(n && typeof n === 'object' && n.id && n.folderId))
    .map((n) => migrateNote(n));
  const folderLinks = (data.folderLinks ?? [])
    .filter((l): l is FolderLink => Boolean(l && typeof l === 'object' && l.id && l.folderId && l.url))
    .map((l) => migrateFolderLink(l));
  return {
    ...defaultData,
    ...data,
    folders,
    notes,
    folderLinks,
    folderSecrets: data.folderSecrets ?? [],
    colorPalette: data.colorPalette ?? 'default',
    selectedTag: data.selectedTag ?? null,
    selectedFolderId:
      data.selectedFolderId === DEFAULT_FOLDER_ID && !data.selectedFolderId
        ? ALL_NOTES_ID
        : (data.selectedFolderId ?? ALL_NOTES_ID),
  };
}

export const useStore = create<Store>((set, get) => ({
  ...defaultData,
  hydrated: false,
  searchOpen: false,
  settingsOpen: false,
  folderDialogRequest: null,

  hydrate: async () => {
    if (get().hydrated || hydrateStarted) return;
    hydrateStarted = true;

    try {
      let raw: AppData | null = null;
      if (window.electronAPI?.isElectron) {
        raw = await window.electronAPI.loadData();
      } else {
        const stored = localStorage.getItem('notes-app-data');
        if (stored) raw = JSON.parse(stored) as AppData;
      }

      if (raw) {
        set({ ...migrateData(raw), hydrated: true });
        return;
      }

      const hasExistingFile =
        window.electronAPI?.hasDataFile != null
          ? await window.electronAPI.hasDataFile()
          : Boolean(localStorage.getItem('notes-app-data'));

      if (hasExistingFile) {
        console.error('Saved data exists but could not be loaded — not overwriting.');
        set({ hydrated: true });
        return;
      }
    } catch (err) {
      console.error('Failed to load saved data:', err);
      set({ hydrated: true });
      return;
    }

    const welcomeId = uuidv4();
    const now = new Date().toISOString();
    set({
      hydrated: true,
      notes: [
        migrateNote({
          id: welcomeId,
          folderId: DEFAULT_FOLDER_ID,
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
    void get().persist();
  },

  persist: async () => {
    if (!get().hydrated) return;
    const data = getPersistableData(get());

    if (window.electronAPI?.isElectron) {
      const ok = window.electronAPI.saveDataSync
        ? window.electronAPI.saveDataSync(data)
        : await window.electronAPI.saveData(data);
      if (!ok) console.error('Failed to save notes to disk');
    } else {
      localStorage.setItem('notes-app-data', JSON.stringify(data));
    }
  },

  flushPersist: async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    if (!get().hydrated) return;
    const data = getPersistableData(get());
    if (window.electronAPI?.saveDataSync) {
      const ok = window.electronAPI.saveDataSync(data);
      if (!ok) console.error('Failed to save notes to disk');
      return;
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

  setViewMode: (viewMode) => set({ viewMode }),

  selectAllNotes: () => {
    set({ selectedFolderId: ALL_NOTES_ID, selectedNoteId: null, viewMode: 'notes' });
    scheduleSave(get);
  },

  selectFolder: (selectedFolderId) => {
    set({ selectedFolderId, selectedNoteId: null, viewMode: 'notes' });
    scheduleSave(get);
  },

  selectNote: (selectedNoteId) => {
    set({ selectedNoteId, viewMode: 'notes' });
    scheduleSave(get);
  },

  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  requestFolderDialog: (type) => set({ folderDialogRequest: type }),
  clearFolderDialogRequest: () => set({ folderDialogRequest: null }),

  createFolder: (name) => {
    const activeCount = get().folders.filter((f) => !isFolderArchived(f)).length;
    const folder: Folder = migrateFolder({
      id: uuidv4(),
      name,
      order: activeCount,
      calendarColor: 'blue',
      archived: false,
    });
    set((s) => ({ folders: [...s.folders, folder] }));
    scheduleSave(get);
  },

  renameFolder: (id, name) => {
    set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
    scheduleSave(get);
  },

  updateFolder: (id, updates) => {
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
    scheduleSave(get);
  },

  reorderFolders: (folderIds) => {
    set((s) => ({
      folders: s.folders.map((f) => {
        const order = folderIds.indexOf(f.id);
        return order >= 0 ? { ...f, order } : f;
      }),
    }));
    scheduleSave(get);
  },

  deleteFolder: (id) => {
    if (id === DEFAULT_FOLDER_ID) return;
    set({
      folders: get().folders.filter((f) => f.id !== id),
      notes: get().notes.filter((n) => n.folderId !== id),
      folderLinks: get().folderLinks.filter((l) => l.folderId !== id),
      folderSecrets: get().folderSecrets.filter((s) => s.folderId !== id),
      selectedFolderId:
        get().selectedFolderId === id ? ALL_NOTES_ID : get().selectedFolderId,
    });
    scheduleSave(get);
  },

  createNote: (folderId, title = 'Untitled', options) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const folderNotes = get().notes.filter((n) => n.folderId === folderId);
    const note: Note = migrateNote({
      id,
      folderId,
      title,
      content: '',
      contentType: 'html',
      createdAt: now,
      updatedAt: now,
      isTask: false,
      order: folderNotes.length,
    });
    set((s) => ({
      notes: [...s.notes, note],
      selectedNoteId: options?.keepView ? s.selectedNoteId : id,
      selectedFolderId: folderId,
      viewMode: options?.keepView ? s.viewMode : 'notes',
    }));
    scheduleSave(get);
    return id;
  },

  createNoteFromImport: (partial, folderId = DEFAULT_FOLDER_ID) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const note: Note = migrateNote({
      id,
      folderId,
      title: partial.title ?? 'Imported Note',
      content: partial.content ?? '',
      contentType: partial.contentType ?? 'html',
      tags: partial.tags ?? [],
      createdAt: now,
      updatedAt: now,
      isTask: false,
      order: get().notes.filter((n) => n.folderId === folderId).length,
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
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
    }));
    scheduleSave(get);
  },

  duplicateNote: (id) => {
    const source = get().notes.find((n) => n.id === id);
    if (!source) return '';

    const newId = uuidv4();
    const now = new Date().toISOString();
    const folderNotes = get().notes.filter((n) => n.folderId === source.folderId);
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
      selectedFolderId: source.folderId,
      viewMode: 'notes',
    }));
    scheduleSave(get);
    return newId;
  },

  archiveNote: (noteId) => {
    const state = get();
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return;

    const sourceFolder = state.folders.find((f) => f.id === note.folderId);
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
    if (folderId === DEFAULT_FOLDER_ID) return;

    const state = get();
    const folder = state.folders.find((f) => f.id === folderId);
    if (!folder || isFolderArchived(folder)) return;

    const archiveOrder = state.folders.filter((f) => isFolderArchived(f)).length;
    const folders = state.folders.map((f) =>
      f.id === folderId ? { ...f, archived: true, order: archiveOrder } : f,
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

    const activeCount = state.folders.filter((f) => !isFolderArchived(f)).length;
    const folders = state.folders.map((f) =>
      f.id === folderId ? { ...f, archived: false, order: activeCount } : f,
    );

    set({ folders });
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
    const folderNotes = get().notes.filter((n) => n.folderId === folderId);
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId ? { ...n, folderId, order: folderNotes.length } : n
      ),
    }));
    scheduleSave(get);
  },

  reorderNotes: (folderId, noteIds) => {
    set((s) => ({
      notes: s.notes.map((n) => {
        if (n.folderId !== folderId) return n;
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
    const { notes, selectedFolderId } = get();
    let filtered = notes;
    if (selectedFolderId && selectedFolderId !== ALL_NOTES_ID) {
      filtered = filtered.filter((n) => n.folderId === selectedFolderId);
    }
    return filtered.sort((a, b) => {
      if (selectedFolderId === ALL_NOTES_ID) {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return a.order - b.order;
    });
  },

  getNotesByFolder: (folderId) =>
    get()
      .notes.filter((n) => n.folderId === folderId)
      .sort((a, b) => a.order - b.order),

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

export { ALL_NOTES_ID, DEFAULT_FOLDER_ID };
