import { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Calendar,
  FileText,
  Moon,
  Sun,
  Star,
  Search,
  Settings,
  Pencil,
  Trash2,
  Link2,
  GripVertical,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store/useStore';
import { NotesLogo } from './NotesLogo';
import { ALL_NOTES_ID, DEFAULT_FOLDER_ID, isFolderArchived, sortableFolderId } from '../types';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { QuickLinkDialog } from './QuickLinkDialog';
import { OverflowMenu } from './OverflowMenu';
import { useIsMobile } from '../hooks/useIsMobile';

function FolderItem({
  id,
  name,
  isSelected,
  onAddQuickLink,
}: {
  id: string;
  name: string;
  isSelected: boolean;
  onAddQuickLink: (folderId: string, folderName: string) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const overflowRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const selectFolder = useStore((s) => s.selectFolder);
  const renameFolder = useStore((s) => s.renameFolder);
  const deleteFolder = useStore((s) => s.deleteFolder);
  const archiveFolder = useStore((s) => s.archiveFolder);
  const notes = useStore((s) => s.notes);
  const noteCount = useMemo(
    () => notes.filter((n) => n.folderId === id).length,
    [notes, id],
  );

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableFolderId(id) });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({ id: `folder-${id}` });

  const setNodeRef = (node: HTMLElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    setEditName(name);
  }, [name]);

  const handleRename = () => {
    if (editName.trim()) renameFolder(id, editName.trim());
    else setEditName(name);
    setEditing(false);
  };

  const startRename = () => {
    setEditName(name);
    setEditing(true);
  };

  const canDelete = id !== DEFAULT_FOLDER_ID;
  const canArchive = id !== DEFAULT_FOLDER_ID;

  const handleAddLink = () => {
    selectFolder(id);
    onAddQuickLink(id, name);
  };

  const folderMenuItems = [
    {
      label: 'Add Quick Link',
      icon: <Link2 size={14} />,
      onClick: handleAddLink,
    },
    {
      label: 'Rename',
      icon: <Pencil size={14} />,
      onClick: startRename,
    },
    {
      label: 'Archive folder',
      icon: <Archive size={14} />,
      disabled: !canArchive,
      onClick: () => {
        if (canArchive) setConfirmAction('archive');
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      danger: true,
      disabled: !canDelete,
      onClick: () => {
        if (canDelete) setConfirmAction('delete');
      },
    },
  ];

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-all duration-150 cursor-pointer ${
          isSelected
            ? 'bg-accent text-accent-foreground'
            : isOver
              ? 'bg-accent/50 ring-2 ring-primary/30'
              : 'hover:bg-muted text-foreground/80'
        }`}
        onClick={() => !editing && selectFolder(id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-40 hover:!opacity-70 max-md:opacity-40 cursor-grab active:cursor-grabbing shrink-0 p-0.5 -ml-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={12} />
        </button>
        <FolderOpen size={15} className="shrink-0 opacity-60" />
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditName(name);
                setEditing(false);
              }
            }}
            className="flex-1 bg-transparent outline-none text-sm border-b border-primary"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate" onDoubleClick={(e) => { e.stopPropagation(); startRename(); }}>
            {name}
          </span>
        )}
        <span className="text-xs opacity-40 tabular-nums">{noteCount}</span>
        {isMobile && !editing && (
          <button
            ref={overflowRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOverflowOpen((v) => !v);
            }}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted/80 cursor-pointer shrink-0"
            aria-label="Folder options"
          >
            <MoreVertical size={14} />
          </button>
        )}
      </div>

      {overflowOpen && (
        <OverflowMenu
          anchorRef={overflowRef}
          items={folderMenuItems}
          onClose={() => setOverflowOpen(false)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={folderMenuItems}
        />
      )}

      <ConfirmDialog
        open={confirmAction === 'archive'}
        title="Archive folder?"
        message={`"${name}" and all ${noteCount} note${noteCount === 1 ? '' : 's'} will be moved to Archive.`}
        confirmLabel="Archive"
        onConfirm={() => archiveFolder(id)}
        onClose={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === 'delete'}
        title="Delete folder?"
        message={`"${name}" and all ${noteCount} note${noteCount === 1 ? '' : 's'} will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteFolder(id)}
        onClose={() => setConfirmAction(null)}
      />
    </>
  );
}

function ArchiveFolderItem({ id, name, isSelected }: { id: string; name: string; isSelected: boolean }) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const overflowRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const selectFolder = useStore((s) => s.selectFolder);
  const deleteFolder = useStore((s) => s.deleteFolder);
  const restoreFolder = useStore((s) => s.restoreFolder);
  const notes = useStore((s) => s.notes);
  const noteCount = useMemo(
    () => notes.filter((n) => n.folderId === id).length,
    [notes, id],
  );

  const archiveMenuItems = [
    {
      label: 'Restore to Folders',
      icon: <ArchiveRestore size={14} />,
      onClick: () => restoreFolder(id),
    },
    {
      label: 'Delete permanently',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => setShowDeleteConfirm(true),
    },
  ];

  return (
    <>
      <div
        className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-150 cursor-pointer ${
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-foreground/80'
        }`}
        onClick={() => selectFolder(id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <Archive size={14} className="shrink-0 opacity-50" />
        <span className="flex-1 truncate">{name}</span>
        <span className="text-xs opacity-40 tabular-nums">{noteCount}</span>
        {isMobile && (
          <button
            ref={overflowRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOverflowOpen((v) => !v);
            }}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted/80 cursor-pointer shrink-0"
            aria-label="Folder options"
          >
            <MoreVertical size={14} />
          </button>
        )}
      </div>

      {overflowOpen && (
        <OverflowMenu
          anchorRef={overflowRef}
          items={archiveMenuItems}
          onClose={() => setOverflowOpen(false)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={archiveMenuItems}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete folder permanently?"
        message={`"${name}" and all ${noteCount} note${noteCount === 1 ? '' : 's'} will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteFolder(id)}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

function PinnedNoteItem({ id, title }: { id: string; title: string }) {
  const selectNote = useStore((s) => s.selectNote);
  const selectedNoteId = useStore((s) => s.selectedNoteId);

  return (
    <button
      onClick={() => selectNote(id)}
      className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left transition-colors cursor-pointer ${
        selectedNoteId === id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-foreground/80'
      }`}
    >
      <Star size={13} className="shrink-0 text-primary fill-primary" />
      <span className="truncate">{title || 'Untitled'}</span>
    </button>
  );
}

const ARCHIVE_OPEN_KEY = 'sidebar-archive-open';

function readArchiveOpenPreference(): boolean {
  try {
    return localStorage.getItem(ARCHIVE_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeArchiveOpenPreference(open: boolean) {
  try {
    localStorage.setItem(ARCHIVE_OPEN_KEY, String(open));
  } catch {
    // ignore
  }
}

function getNewNoteFolderId(selectedFolderId: string | null): string {
  return selectedFolderId && selectedFolderId !== ALL_NOTES_ID
    ? selectedFolderId
    : DEFAULT_FOLDER_ID;
}

export function Sidebar() {
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [linkDialog, setLinkDialog] = useState<{ folderId: string; folderName: string } | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(readArchiveOpenPreference);

  const folders = useStore((s) => s.folders);
  const theme = useStore((s) => s.theme);
  const viewMode = useStore((s) => s.viewMode);
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setViewMode = useStore((s) => s.setViewMode);
  const selectAllNotes = useStore((s) => s.selectAllNotes);
  const createFolder = useStore((s) => s.createFolder);
  const createNote = useStore((s) => s.createNote);
  const createFolderLink = useStore((s) => s.createFolderLink);
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const mobileNavOpen = useStore((s) => s.mobileNavOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const notes = useStore((s) => s.notes);

  const activeNoteCount = useMemo(
    () =>
      notes.filter((n) => {
        const folder = folders.find((f) => f.id === n.folderId);
        return !isFolderArchived(folder);
      }).length,
    [notes, folders],
  );

  const pinnedNotes = useMemo(
    () =>
      notes
        .filter((n) => {
          if (!n.pinned) return false;
          const folder = folders.find((f) => f.id === n.folderId);
          return !isFolderArchived(folder);
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [notes, folders],
  );

  const isAllNotesSelected = viewMode === 'notes' && selectedFolderId === ALL_NOTES_ID;

  const activeFolders = useMemo(
    () => [...folders].filter((f) => !isFolderArchived(f)).sort((a, b) => a.order - b.order),
    [folders],
  );

  const archivedFolders = useMemo(
    () => [...folders].filter((f) => isFolderArchived(f)).sort((a, b) => a.order - b.order),
    [folders],
  );

  useEffect(() => {
    if (
      selectedFolderId &&
      archivedFolders.some((f) => f.id === selectedFolderId) &&
      !archiveOpen
    ) {
      setArchiveOpen(true);
      writeArchiveOpenPreference(true);
    }
  }, [selectedFolderId, archivedFolders, archiveOpen]);

  const sortableFolderIds = useMemo(
    () => activeFolders.map((f) => sortableFolderId(f.id)),
    [activeFolders],
  );

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const handleNewNote = () => {
    createNote(getNewNoteFolderId(selectedFolderId));
  };

  const toggleArchiveOpen = () => {
    setArchiveOpen((open) => {
      const next = !open;
      writeArchiveOpenPreference(next);
      return next;
    });
  };

  return (
    <aside
      className={`flex flex-col w-56 shrink-0 border-r border-border bg-sidebar h-full max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-xl max-md:transition-transform max-md:duration-200 max-md:ease-out ${
        mobileNavOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
      } md:relative`}
    >
      <QuickLinkDialog
        open={!!linkDialog}
        onClose={() => setLinkDialog(null)}
        onSave={(title, url) => {
          if (linkDialog) createFolderLink(linkDialog.folderId, title, url);
        }}
        folderName={linkDialog?.folderName}
      />
      <div className="border-b border-border">
        <NotesLogo />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <button
          onClick={() => {
            setSearchOpen(true);
            useStore.getState().closeMobileNav();
          }}
          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-muted text-foreground/70 transition-colors cursor-pointer"
        >
          <Search size={16} />
          Search
          <kbd className="ml-auto text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">⌘K</kbd>
        </button>

        <button
          onClick={selectAllNotes}
          className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
            isAllNotesSelected
              ? 'bg-accent text-accent-foreground font-medium'
              : 'hover:bg-muted text-foreground/70'
          }`}
        >
          <FileText size={16} />
          All Notes
          <span className="ml-auto text-xs opacity-40">{activeNoteCount}</span>
        </button>

        <button
          onClick={() => setViewMode('calendar')}
          className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
            viewMode === 'calendar'
              ? 'bg-accent text-accent-foreground font-medium'
              : 'hover:bg-muted text-foreground/70'
          }`}
        >
          <Calendar size={16} />
          Calendar
        </button>

        {pinnedNotes.length > 0 && (
          <>
            <div className="mt-5 pt-1 pb-1.5 px-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Pinned
              </span>
            </div>
            {pinnedNotes.map((n) => (
              <PinnedNoteItem key={n.id} id={n.id} title={n.title} />
            ))}
          </>
        )}

        <div className="mt-5 pt-1 pb-1.5 px-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Folders
            </span>
            <button
              onClick={() => setShowNewFolder(true)}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {showNewFolder && (
          <div className="px-1 mb-1">
            <input
              autoFocus
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolder(false);
              }}
              onBlur={() => {
                if (newFolderName.trim()) handleCreateFolder();
                else setShowNewFolder(false);
              }}
              className="w-full px-2 py-1.5 text-sm rounded-md bg-muted border border-border outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        )}

        <SortableContext items={sortableFolderIds} strategy={verticalListSortingStrategy}>
          {activeFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              id={folder.id}
              name={folder.name}
              isSelected={viewMode === 'notes' && selectedFolderId === folder.id}
              onAddQuickLink={(folderId, folderName) => setLinkDialog({ folderId, folderName })}
            />
          ))}
        </SortableContext>

        {archivedFolders.length > 0 && (
          <>
            <button
              type="button"
              onClick={toggleArchiveOpen}
              className="w-full mt-5 pt-1 pb-1.5 px-2 flex items-center gap-1.5 text-left rounded-md hover:bg-muted/60 transition-colors cursor-pointer group"
              aria-expanded={archiveOpen}
            >
              {archiveOpen ? (
                <ChevronDown size={14} className="shrink-0 text-muted-foreground opacity-60" />
              ) : (
                <ChevronRight size={14} className="shrink-0 text-muted-foreground opacity-60" />
              )}
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Archive
              </span>
              <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                {archivedFolders.length}
              </span>
            </button>
            {archiveOpen &&
              archivedFolders.map((folder) => (
                <ArchiveFolderItem
                  key={folder.id}
                  id={folder.id}
                  name={folder.name}
                  isSelected={viewMode === 'notes' && selectedFolderId === folder.id}
                />
              ))}
          </>
        )}
      </nav>

      <div className="border-t border-border p-3 space-y-1.5">
        <button
          onClick={handleNewNote}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={16} />
          New Note
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-muted text-foreground/70 transition-colors cursor-pointer"
        >
          <Settings size={16} />
          Settings
        </button>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-muted text-foreground/70 transition-colors cursor-pointer"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>
      </div>
    </aside>
  );
}
