import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { Editor } from './components/Editor';
import { CalendarView } from './components/CalendarView';
import { FolderOverview } from './components/FolderOverview';
import { GlobalSearch } from './components/GlobalSearch';
import { SettingsPanel } from './components/SettingsPanel';
import { DndDragOverlay } from './components/DndDragOverlay';
import { UpdateBanner } from './components/UpdateUI';
import { useAppUpdater } from './hooks/useAppUpdater';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { applyPalette } from './constants/palettes';
import {
  expandParentSection,
  folderDragCollisionDetection,
  normalizeFolderDragOverId,
  resolveFolderDragOverId,
} from './utils/folderDragCollision';
import { dndLog, dndFail } from './utils/dndDebug';
import {
  ALL_NOTES_ID,
  SORTABLE_FOLDER_PREFIX,
  folderIdFromSortable,
  getNewNoteFolderId,
  isFolderArchived,
  ARCHIVE_DROP_ID,
  FOLDER_ROOT_DROP_ID,
  isParentDropId,
  isNoteFolderDroppableId,
  parentIdFromDropId,
} from './types';
import { useIsMobile } from './hooks/useIsMobile';

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
  const moveFolderInTree = useStore((s) => s.moveFolderInTree);
  const archiveFolder = useStore((s) => s.archiveFolder);
  const folderDragOverRef = useRef<string | null>(null);
  const lastLoggedOverRef = useRef<string | null>(null);
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const mobileNavOpen = useStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useStore((s) => s.setMobileNavOpen);
  const selectNote = useStore((s) => s.selectNote);
  const createNote = useStore((s) => s.createNote);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  const isMobile = useIsMobile();
  const [mobileFolderPane, setMobileFolderPane] = useState<'notes' | 'overview'>('notes');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  useEffect(() => {
    setMobileFolderPane('notes');
  }, [selectedFolderId]);

  const showMobileFolderOverview =
    isMobile &&
    viewMode === 'notes' &&
    !selectedNoteId &&
    selectedFolderId !== ALL_NOTES_ID &&
    mobileFolderPane === 'overview';
  const showMobileNoteList =
    isMobile && viewMode === 'notes' && !selectedNoteId && !showMobileFolderOverview;
  const showMobileEditor = isMobile && viewMode === 'notes' && !!selectedNoteId;

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
        createNote(getNewNoteFolderId(selectedFolderId));
      });
    }
  }, [createNote, selectedFolderId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    setActiveDragId(activeId);
    lastLoggedOverRef.current = null;
    dndLog('dragStart', {
      activeId,
      type: activeId.startsWith(SORTABLE_FOLDER_PREFIX) ? 'folder' : 'note',
    });
  };

  const clearDragState = () => {
    setActiveDragId(null);
    folderDragOverRef.current = null;
    lastLoggedOverRef.current = null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const rawOverId = event.over?.id ? String(event.over.id) : null;
    if (!rawOverId) {
      // Keep last valid target — pointer can briefly leave all droppables on release.
      return;
    }

    const overId = normalizeFolderDragOverId(rawOverId);
    folderDragOverRef.current = overId;

    if (overId !== lastLoggedOverRef.current) {
      lastLoggedOverRef.current = overId;
      dndLog('dragOver', {
        activeId: String(event.active.id),
        rawOverId,
        overId,
      });
    }

    if (isParentDropId(overId)) {
      expandParentSection(parentIdFromDropId(overId));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = event.active.id as string;
    const lastOverId = folderDragOverRef.current;
    const overId = resolveFolderDragOverId(event, lastOverId);

    dndLog('dragEnd', {
      activeId,
      overId,
      eventOver: event.over?.id ?? null,
      lastOverId,
      collisionIds: (event.collisions ?? []).map((c) => c.id),
    });

    try {
      if (!overId) {
        dndFail('no drop target resolved', {
          activeId,
          eventOver: event.over?.id ?? null,
          lastOverId,
          collisionIds: (event.collisions ?? []).map((c) => c.id),
        });
        return;
      }

    if (activeId.startsWith(SORTABLE_FOLDER_PREFIX)) {
      const folders = [...useStore.getState().folders].filter((f) => !isFolderArchived(f));
      const activeFolderId = folderIdFromSortable(activeId);
      const activeFolder = folders.find((f) => f.id === activeFolderId);

      if (!activeFolder) {
        dndFail('folder drag: active folder not found', { activeFolderId });
        return;
      }
      if (activeFolder.isParent) {
        dndFail('folder drag: cannot move parent folder rows', { activeFolderId });
        return;
      }

      if (overId === ARCHIVE_DROP_ID) {
        dndLog('folder drag → archive', { activeFolderId });
        archiveFolder(activeFolderId);
        return;
      }

      if (overId === FOLDER_ROOT_DROP_ID) {
        dndLog('folder drag → root', {
          activeFolderId,
          hadParent: Boolean(activeFolder.parentId),
        });
        if (activeFolder.parentId) {
          moveFolderInTree(activeFolderId, { parentId: null });
        }
        return;
      }

      if (isParentDropId(overId)) {
        const parentId = parentIdFromDropId(overId);
        const parent = folders.find((f) => f.id === parentId);
        dndLog('folder drag → parent drop', {
          activeFolderId,
          activeFolderName: activeFolder.name,
          activeParentId: activeFolder.parentId ?? null,
          targetParentId: parentId,
          targetParentName: parent?.name ?? '?',
          targetIsParent: parent?.isParent ?? false,
          willMove: activeFolder.parentId !== parentId,
        });
        if (activeFolder.parentId !== parentId) {
          moveFolderInTree(activeFolderId, { parentId });
          expandParentSection(parentId);
        }
        return;
      }

      if (!overId.startsWith(SORTABLE_FOLDER_PREFIX)) {
        dndFail('folder drag: unexpected drop target', { overId, activeFolderId });
        return;
      }

      const overFolderId = folderIdFromSortable(overId);
      const overFolder = folders.find((f) => f.id === overFolderId);
      if (!overFolder) {
        dndLog('folder drag → abort', { reason: 'overFolder not found', overFolderId });
        return;
      }
      if (overFolder.isParent) {
        dndLog('folder drag → abort', { reason: 'overFolder is parent', overFolderId });
        return;
      }

      const activeParent = activeFolder.parentId ?? null;
      const overParent = overFolder.parentId ?? null;

      if (activeParent !== overParent) {
        dndLog('folder drag → cross-parent via folder', {
          activeFolderId,
          activeFolderName: activeFolder.name,
          overFolderId,
          overFolderName: overFolder.name,
          fromParentId: activeParent,
          toParentId: overParent,
        });
        moveFolderInTree(activeFolderId, {
          parentId: overParent,
          insertBeforeId: overFolderId,
        });
        if (overParent) expandParentSection(overParent);
        return;
      }

      const siblings = folders
        .filter((f) => (f.parentId ?? null) === activeParent)
        .sort((a, b) => a.order - b.order);
      const folderIds = siblings.map((f) => f.id);
      const oldIndex = folderIds.indexOf(activeFolderId);
      const newIndex = folderIds.indexOf(overFolderId);
      dndLog('folder drag → reorder', { activeFolderId, overFolderId, oldIndex, newIndex });
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        dndLog('folder drag → abort', { reason: 'invalid reorder indices', oldIndex, newIndex });
        return;
      }
      const newOrder = [...folderIds];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, activeFolderId);
      reorderFolders(newOrder);
      return;
    }

    const noteId = activeId;

    if (isParentDropId(overId)) {
      const parentId = parentIdFromDropId(overId);
      const childFolders = useStore
        .getState()
        .folders.filter(
          (f) => !isFolderArchived(f) && !f.isParent && f.parentId === parentId,
        )
        .sort((a, b) => a.order - b.order);
      dndLog('note drag → parent drop', {
        noteId,
        parentId,
        childCount: childFolders.length,
        childNames: childFolders.map((f) => f.name),
        willMove: childFolders.length > 0,
      });
      if (childFolders.length > 0) {
        moveNote(noteId, childFolders[0].id);
      }
      return;
    }

    if (isNoteFolderDroppableId(overId)) {
      const targetFolderId = overId.replace('folder-', '');
      dndLog('note drag → folder droppable', { noteId, targetFolderId });
      moveNote(noteId, targetFolderId);
      return;
    }

    if (overId.startsWith(SORTABLE_FOLDER_PREFIX)) {
      const targetFolderId = folderIdFromSortable(overId);
      dndLog('note drag → sortable folder', { noteId, targetFolderId });
      moveNote(noteId, targetFolderId);
      return;
    }

    if (!selectedFolderId || selectedFolderId === ALL_NOTES_ID) {
      dndLog('note drag → abort', { reason: 'all notes view, not a folder target', overId });
      return;
    }

    const folderId = selectedFolderId;
    const notes = useStore.getState().getNotesByFolder(folderId);
    const noteIds = notes.map((n) => n.id);
    const oldIndex = noteIds.indexOf(noteId);
    const newIndex = noteIds.indexOf(overId);
    dndLog('note drag → reorder', { noteId, overId, folderId, oldIndex, newIndex });
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      dndLog('note drag → abort', { reason: 'invalid reorder indices', oldIndex, newIndex });
      return;
    }

    const newOrder = [...noteIds];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, noteId);
    reorderNotes(folderId, newOrder);
    } finally {
      clearDragState();
    }
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
    <DndContext
      sensors={sensors}
      collisionDetection={folderDragCollisionDetection}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={clearDragState}
    >
      <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
        <UpdateBanner
          state={bannerState}
          onDownload={downloadUpdate}
          onInstall={installUpdate}
          onDismiss={dismissBanner}
          onRetry={checkForUpdates}
          onOpenSettings={() => {
            dismissBanner();
            setSettingsOpen(true);
          }}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {isMobile && mobileNavOpen && (
            <button
              type="button"
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            />
          )}
          <Sidebar />
          {viewMode === 'calendar' ? (
            <CalendarView onOpenNav={() => setMobileNavOpen(true)} />
          ) : isMobile ? (
            <>
              {showMobileNoteList && (
                <NoteList
                  onOpenNav={() => setMobileNavOpen(true)}
                  onShowFolderOverview={() => setMobileFolderPane('overview')}
                  showFolderOverviewToggle={
                    !!selectedFolderId && selectedFolderId !== ALL_NOTES_ID
                  }
                />
              )}
              {showMobileFolderOverview && selectedFolderId && (
                <FolderOverview
                  folderId={selectedFolderId}
                  onMobileBack={() => setMobileFolderPane('notes')}
                />
              )}
              {showMobileEditor && (
                <Editor
                  key={selectedNoteId ?? 'none'}
                  onMobileBack={() => selectNote(null)}
                />
              )}
            </>
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
      <DndDragOverlay activeId={activeDragId} />
    </DndContext>
  );
}
