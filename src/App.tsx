import { useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { Editor } from './components/Editor';
import { CalendarView } from './components/CalendarView';
import { GlobalSearch } from './components/GlobalSearch';
import { SettingsPanel } from './components/SettingsPanel';
import { UpdateBanner } from './components/UpdateUI';
import { useAppUpdater } from './hooks/useAppUpdater';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { applyPalette } from './constants/palettes';
import { ALL_NOTES_ID, DEFAULT_FOLDER_ID, SORTABLE_FOLDER_PREFIX, folderIdFromSortable, isFolderArchived } from './types';

export default function App() {
  const {
    bannerState,
    state: updateState,
    isElectron,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissBanner,
  } = useAppUpdater();

  const hydrated = useStore((s) => s.hydrated);
  const theme = useStore((s) => s.theme);
  const colorPalette = useStore((s) => s.colorPalette);
  const viewMode = useStore((s) => s.viewMode);
  const hydrate = useStore((s) => s.hydrate);
  const moveNote = useStore((s) => s.moveNote);
  const reorderNotes = useStore((s) => s.reorderNotes);
  const reorderFolders = useStore((s) => s.reorderFolders);
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const createNote = useStore((s) => s.createNote);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  useKeyboardShortcuts();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const interval = setInterval(() => {
      void useStore.getState().persist();
    }, 5000);
    return () => clearInterval(interval);
  }, [hydrated]);

  useEffect(() => {
    if (!window.electronAPI?.onFlushSave) return;
    return window.electronAPI.onFlushSave(() => {
      void useStore.getState().flushPersist().then(() => {
        window.electronAPI?.notifyFlushSaveDone?.();
      });
    });
  }, []);

  useEffect(() => {
    applyPalette(colorPalette, theme);
    window.electronAPI?.setBrandIcons?.(colorPalette, theme);

    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (link) {
      link.href = theme === 'dark' ? '/favicon-dark.png' : '/favicon.png';
    }
  }, [theme, colorPalette]);

  useEffect(() => {
    if (window.electronAPI?.onQuickCapture) {
      window.electronAPI.onQuickCapture(() => {
        const folderId =
          selectedFolderId && selectedFolderId !== ALL_NOTES_ID
            ? selectedFolderId
            : DEFAULT_FOLDER_ID;
        createNote(folderId);
      });
    }
  }, [createNote, selectedFolderId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId.startsWith(SORTABLE_FOLDER_PREFIX)) {
      if (!overId.startsWith(SORTABLE_FOLDER_PREFIX)) return;
      const folders = [...useStore.getState().folders]
        .filter((f) => !isFolderArchived(f))
        .sort((a, b) => a.order - b.order);
      const folderIds = folders.map((f) => f.id);
      const activeFolderId = folderIdFromSortable(activeId);
      const overFolderId = folderIdFromSortable(overId);
      const oldIndex = folderIds.indexOf(activeFolderId);
      const newIndex = folderIds.indexOf(overFolderId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const newOrder = [...folderIds];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, activeFolderId);
      reorderFolders(newOrder);
      return;
    }

    const noteId = activeId;

    if (overId.startsWith('folder-')) {
      moveNote(noteId, overId.replace('folder-', ''));
      return;
    }

    if (overId.startsWith(SORTABLE_FOLDER_PREFIX)) {
      moveNote(noteId, folderIdFromSortable(overId));
      return;
    }

    if (selectedFolderId === ALL_NOTES_ID) return;

    const folderId = selectedFolderId || DEFAULT_FOLDER_ID;
    const notes = useStore.getState().getNotesByFolder(folderId);
    const noteIds = notes.map((n) => n.id);
    const oldIndex = noteIds.indexOf(noteId);
    const newIndex = noteIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const newOrder = [...noteIds];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, noteId);
    reorderNotes(folderId, newOrder);
  };

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
        <UpdateBanner
          state={bannerState}
          onDownload={downloadUpdate}
          onInstall={installUpdate}
          onDismiss={dismissBanner}
          onOpenSettings={() => {
            dismissBanner();
            setSettingsOpen(true);
          }}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />
          {viewMode === 'calendar' ? (
            <CalendarView />
          ) : (
            <>
              <NoteList />
              <Editor key={selectedNoteId ?? selectedFolderId ?? 'none'} />
            </>
          )}
        </div>
      </div>
      <GlobalSearch />
      <SettingsPanel
        updateState={updateState}
        isElectron={isElectron}
        checkForUpdates={checkForUpdates}
        downloadUpdate={downloadUpdate}
        installUpdate={installUpdate}
      />
      <DragOverlay />
    </DndContext>
  );
}
