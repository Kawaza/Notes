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
import { ALL_NOTES_ID, DEFAULT_FOLDERS_SECTION_NAME, getNewNoteFolderId, isFolderArchived, sortableFolderId, FOLDER_ROOT_DROP_ID, ARCHIVE_DROP_ID, parentDropId, parentBodyDropId } from '../types';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { QuickLinkDialog } from './QuickLinkDialog';
import { OverflowMenu } from './OverflowMenu';
import { AddFolderMenu } from './AddFolderMenu';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Folder } from '../types';
import { parentOpenStorageKey } from '../utils/folderDragCollision';

function FolderDropZone({
  id,
  children,
  className = '',
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'rounded-lg ring-2 ring-primary/30 bg-primary/5' : ''}`}
    >
      {children}
    </div>
  );
}

function FolderItem({
  id,
  name,
  isSelected,
  onAddQuickLink,
  indented = false,
}: {
  id: string;
  name: string;
  isSelected: boolean;
  onAddQuickLink: (folderId: string, folderName: string) => void;
  indented?: boolean;
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
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.35 : 1,
    pointerEvents: isDragging ? ('none' as const) : undefined,
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
      disabled: false,
      onClick: () => setConfirmAction('archive'),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      danger: true,
      disabled: false,
      onClick: () => {
        setConfirmAction('delete');
      },
    },
  ];

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-all duration-150 cursor-pointer ${
          indented ? 'ml-4' : ''
        } ${
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

type NewFolderTarget =
  | { type: 'folder' }
  | { type: 'parent' }
  | { type: 'child'; parentId: string };

function parentOpenKey(parentId: string) {
  return parentOpenStorageKey(parentId);
}

function ParentFolderSection({
  parent,
  childFolders,
  viewMode,
  selectedFolderId,
  onAddQuickLink,
  onAddChildFolder,
  showNewFolderInput,
  newFolderName,
  onNewFolderNameChange,
  onSubmitNewFolder,
  onCancelNewFolder,
}: {
  parent: Folder;
  childFolders: Folder[];
  viewMode: string;
  selectedFolderId: string | null;
  onAddQuickLink: (folderId: string, folderName: string) => void;
  onAddChildFolder: (parentId: string) => void;
  showNewFolderInput?: boolean;
  newFolderName?: string;
  onNewFolderNameChange?: (value: string) => void;
  onSubmitNewFolder?: () => void;
  onCancelNewFolder?: () => void;
}) {
  const [open, setOpen] = useState(() => readSectionOpen(parentOpenKey(parent.id)));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'delete' | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(parent.name);

  const renameFolder = useStore((s) => s.renameFolder);
  const deleteFolder = useStore((s) => s.deleteFolder);
  const foldersSectionName = useStore((s) => s.foldersSectionName);

  useEffect(() => {
    setEditName(parent.name);
  }, [parent.name]);

  useEffect(() => {
    if (childFolders.some((folder) => folder.id === selectedFolderId)) {
      setOpen(true);
      writeSectionOpen(parentOpenKey(parent.id), true);
    }
  }, [selectedFolderId, childFolders, parent.id]);

  useEffect(() => {
    const handleExpand = (event: Event) => {
      if ((event as CustomEvent<string>).detail === parent.id) {
        setOpen(true);
      }
    };
    window.addEventListener('notes-expand-parent', handleExpand);
    return () => window.removeEventListener('notes-expand-parent', handleExpand);
  }, [parent.id]);

  useEffect(() => {
    if (showNewFolderInput) {
      setOpen(true);
      writeSectionOpen(parentOpenKey(parent.id), true);
    }
  }, [showNewFolderInput, parent.id]);

  const handleRename = () => {
    if (editName.trim()) renameFolder(parent.id, editName.trim());
    else setEditName(parent.name);
    setEditing(false);
  };

  const toggleOpen = () => {
    setOpen((value) => {
      const next = !value;
      writeSectionOpen(parentOpenKey(parent.id), next);
      return next;
    });
  };

  const parentMenuItems = [
    {
      label: 'Add folder here',
      icon: <Plus size={14} />,
      onClick: () => onAddChildFolder(parent.id),
    },
    {
      label: 'Rename',
      icon: <Pencil size={14} />,
      onClick: () => {
        setEditName(parent.name);
        setEditing(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => setConfirmAction('delete'),
    },
  ];

  return (
    <>
      <div className="mt-5">
        <FolderDropZone id={parentDropId(parent.id)} className="min-h-9">
          <div
            className="py-2 px-2 flex items-center gap-1 min-h-9"
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }}
          >
            <button
              type="button"
              onClick={toggleOpen}
              className="flex flex-1 min-w-0 items-center gap-1.5 text-left rounded-md hover:bg-muted/60 transition-colors cursor-pointer py-0.5"
              aria-expanded={open}
            >
              {open ? (
                <ChevronDown size={14} className="shrink-0 text-muted-foreground opacity-60" />
              ) : (
                <ChevronRight size={14} className="shrink-0 text-muted-foreground opacity-60" />
              )}
              {editing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') {
                      setEditName(parent.name);
                      setEditing(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[11px] font-medium uppercase tracking-wider border-b border-primary"
                />
              ) : (
                <span
                  className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditName(parent.name);
                    setEditing(true);
                  }}
                >
                  {parent.name}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/60 tabular-nums shrink-0">
                {childFolders.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onAddChildFolder(parent.id)}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              aria-label={`Add folder to ${parent.name}`}
            >
              <Plus size={14} />
            </button>
          </div>
        </FolderDropZone>

        {open && showNewFolderInput && (
          <div className="px-1 mb-1">
            <input
              autoFocus
              placeholder="Folder name..."
              value={newFolderName ?? ''}
              onChange={(e) => onNewFolderNameChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmitNewFolder?.();
                if (e.key === 'Escape') onCancelNewFolder?.();
              }}
              onBlur={() => {
                if (newFolderName?.trim()) onSubmitNewFolder?.();
                else onCancelNewFolder?.();
              }}
              className="w-full px-2 py-1.5 text-sm rounded-md bg-muted border border-border outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        )}

        <div className={open ? '' : 'h-0 overflow-hidden pointer-events-none opacity-0'}>
          <FolderDropZone id={parentBodyDropId(parent.id)} className={childFolders.length === 0 && open ? 'min-h-8' : ''}>
            <SortableContext
              items={childFolders.map((folder) => sortableFolderId(folder.id))}
              strategy={verticalListSortingStrategy}
            >
              {childFolders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  id={folder.id}
                  name={folder.name}
                  isSelected={viewMode === 'notes' && selectedFolderId === folder.id}
                  onAddQuickLink={onAddQuickLink}
                />
              ))}
            </SortableContext>
          </FolderDropZone>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={parentMenuItems}
        />
      )}

      <ConfirmDialog
        open={confirmAction === 'delete'}
        title="Delete group?"
        message={`"${parent.name}" will be deleted. Its folders will move to the ${foldersSectionName} list.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteFolder(parent.id)}
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
  const foldersSectionName = useStore((s) => s.foldersSectionName);
  const notes = useStore((s) => s.notes);
  const noteCount = useMemo(
    () => notes.filter((n) => n.folderId === id).length,
    [notes, id],
  );

  const archiveMenuItems = [
    {
      label: `Restore to ${foldersSectionName}`,
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
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-all duration-150 cursor-pointer ${
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-foreground/80'
        }`}
        onClick={() => selectFolder(id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <span className="w-4 shrink-0" aria-hidden />
        <Archive size={15} className="shrink-0 opacity-50" />
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
const FOLDERS_OPEN_KEY = 'sidebar-folders-open';

function readSectionOpen(key: string, defaultOpen = true): boolean {
  try {
    return localStorage.getItem(key) !== 'false';
  } catch {
    return defaultOpen;
  }
}

function writeSectionOpen(key: string, open: boolean) {
  try {
    localStorage.setItem(key, String(open));
  } catch {
    // ignore
  }
}

/** Expand a sidebar section when the user navigates into it (not when they collapse it). */
function useExpandSectionOnSelect(
  selectedId: string | null,
  sectionIds: string[],
  setOpen: (open: boolean) => void,
  storageKey: string,
) {
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    const navigated = prevSelectedRef.current !== selectedId;
    prevSelectedRef.current = selectedId;

    if (navigated && selectedId && sectionIds.includes(selectedId)) {
      setOpen(true);
      writeSectionOpen(storageKey, true);
    }
  }, [selectedId, sectionIds, setOpen, storageKey]);
}

export function Sidebar() {
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderTarget, setNewFolderTarget] = useState<NewFolderTarget | null>(null);
  const [showAddFolderMenu, setShowAddFolderMenu] = useState(false);
  const addFolderButtonRef = useRef<HTMLButtonElement>(null);
  const [linkDialog, setLinkDialog] = useState<{ folderId: string; folderName: string } | null>(null);
  const [foldersOpen, setFoldersOpen] = useState(() => readSectionOpen(FOLDERS_OPEN_KEY));
  const [archiveOpen, setArchiveOpen] = useState(() => readSectionOpen(ARCHIVE_OPEN_KEY));
  const [foldersSectionEditing, setFoldersSectionEditing] = useState(false);
  const [foldersSectionEditName, setFoldersSectionEditName] = useState(DEFAULT_FOLDERS_SECTION_NAME);
  const [foldersSectionMenu, setFoldersSectionMenu] = useState<{ x: number; y: number } | null>(null);

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
  const foldersSectionName = useStore((s) => s.foldersSectionName);
  const setFoldersSectionName = useStore((s) => s.setFoldersSectionName);
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

  const sectionFolders = useMemo(
    () =>
      [...folders]
        .filter((f) => !isFolderArchived(f) && !f.parentId && !f.isParent)
        .sort((a, b) => a.order - b.order),
    [folders],
  );

  const sectionFolderSortableIds = useMemo(
    () => sectionFolders.map((f) => sortableFolderId(f.id)),
    [sectionFolders],
  );

  const parentSections = useMemo(
    () =>
      [...folders]
        .filter((f) => !isFolderArchived(f) && f.isParent)
        .sort((a, b) => a.order - b.order),
    [folders],
  );

  const archivedFolders = useMemo(
    () => [...folders].filter((f) => isFolderArchived(f)).sort((a, b) => a.order - b.order),
    [folders],
  );

  const archivedFolderIds = useMemo(
    () => archivedFolders.map((f) => f.id),
    [archivedFolders],
  );

  const sectionFolderIds = useMemo(
    () => sectionFolders.map((f) => f.id),
    [sectionFolders],
  );

  useExpandSectionOnSelect(selectedFolderId, archivedFolderIds, setArchiveOpen, ARCHIVE_OPEN_KEY);
  useExpandSectionOnSelect(selectedFolderId, sectionFolderIds, setFoldersOpen, FOLDERS_OPEN_KEY);

  const handleCreateFolder = () => {
    if (!newFolderTarget || !newFolderName.trim()) return;
    const name = newFolderName.trim();
    const target = newFolderTarget;
    let createdId: string | undefined;
    if (target.type === 'parent') {
      createdId = createFolder(name, { isParent: true });
    } else if (target.type === 'child') {
      createdId = createFolder(name, { parentId: target.parentId });
      writeSectionOpen(parentOpenKey(target.parentId), true);
    } else {
      createdId = createFolder(name);
    }
    setNewFolderName('');
    setNewFolderTarget(null);
    if (target.type === 'parent' && createdId) {
      writeSectionOpen(parentOpenKey(createdId), true);
    }
  };

  const startNewFolder = (target: NewFolderTarget) => {
    if (target.type === 'folder') {
      setFoldersOpen(true);
      writeSectionOpen(FOLDERS_OPEN_KEY, true);
    }
    setNewFolderTarget(target);
    setNewFolderName('');
  };

  const cancelNewFolder = () => {
    setNewFolderTarget(null);
    setNewFolderName('');
  };

  const handleNewNote = () => {
    createNote(getNewNoteFolderId(selectedFolderId));
  };

  const toggleFoldersOpen = () => {
    setFoldersOpen((open) => {
      const next = !open;
      writeSectionOpen(FOLDERS_OPEN_KEY, next);
      return next;
    });
  };

  const toggleArchiveOpen = () => {
    setArchiveOpen((open) => {
      const next = !open;
      writeSectionOpen(ARCHIVE_OPEN_KEY, next);
      return next;
    });
  };

  const handleShowAddFolderMenu = () => {
    setShowAddFolderMenu((open) => !open);
  };

  useEffect(() => {
    setFoldersSectionEditName(foldersSectionName);
  }, [foldersSectionName]);

  const commitFoldersSectionRename = () => {
    if (foldersSectionEditName.trim()) {
      setFoldersSectionName(foldersSectionEditName.trim());
    } else {
      setFoldersSectionEditName(foldersSectionName);
    }
    setFoldersSectionEditing(false);
  };

  const foldersSectionMenuItems = [
    {
      label: 'Rename',
      icon: <Pencil size={14} />,
      onClick: () => {
        setFoldersSectionEditName(foldersSectionName);
        setFoldersSectionEditing(true);
      },
    },
  ];

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

        <FolderDropZone id={FOLDER_ROOT_DROP_ID}>
          <div
            className="mt-5 pt-1 pb-1.5 px-2 flex items-center gap-1"
            onContextMenu={(e) => {
              e.preventDefault();
              setFoldersSectionMenu({ x: e.clientX, y: e.clientY });
            }}
          >
            <button
              type="button"
              onClick={toggleFoldersOpen}
              className="flex flex-1 min-w-0 items-center gap-1.5 text-left rounded-md hover:bg-muted/60 transition-colors cursor-pointer py-0.5"
              aria-expanded={foldersOpen}
            >
              {foldersOpen ? (
                <ChevronDown size={14} className="shrink-0 text-muted-foreground opacity-60" />
              ) : (
                <ChevronRight size={14} className="shrink-0 text-muted-foreground opacity-60" />
              )}
              {foldersSectionEditing ? (
                <input
                  autoFocus
                  value={foldersSectionEditName}
                  onChange={(e) => setFoldersSectionEditName(e.target.value)}
                  onBlur={commitFoldersSectionRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitFoldersSectionRename();
                    if (e.key === 'Escape') {
                      setFoldersSectionEditName(foldersSectionName);
                      setFoldersSectionEditing(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[11px] font-medium uppercase tracking-wider border-b border-primary"
                />
              ) : (
                <span
                  className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setFoldersSectionEditName(foldersSectionName);
                    setFoldersSectionEditing(true);
                  }}
                >
                  {foldersSectionName}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                {sectionFolders.length}
              </span>
            </button>
            <button
              ref={addFolderButtonRef}
              type="button"
              onClick={handleShowAddFolderMenu}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              aria-label="Add folder"
            >
              <Plus size={14} />
            </button>
          </div>
        </FolderDropZone>

        {foldersSectionMenu && (
          <ContextMenu
            x={foldersSectionMenu.x}
            y={foldersSectionMenu.y}
            onClose={() => setFoldersSectionMenu(null)}
            items={foldersSectionMenuItems}
          />
        )}

        {showAddFolderMenu && (
          <AddFolderMenu
            anchorRef={addFolderButtonRef}
            onClose={() => setShowAddFolderMenu(false)}
            onAddFolder={() => startNewFolder({ type: 'folder' })}
            onAddParentFolder={() => startNewFolder({ type: 'parent' })}
          />
        )}

        {foldersOpen && newFolderTarget?.type === 'folder' && (
          <div className="px-1 mb-1">
            <input
              autoFocus
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') cancelNewFolder();
              }}
              onBlur={() => {
                if (newFolderName.trim()) handleCreateFolder();
                else cancelNewFolder();
              }}
              className="w-full px-2 py-1.5 text-sm rounded-md bg-muted border border-border outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        )}

        <SortableContext items={sectionFolderSortableIds} strategy={verticalListSortingStrategy}>
          {foldersOpen &&
            sectionFolders.map((folder) => (
              <FolderItem
                key={folder.id}
                id={folder.id}
                name={folder.name}
                isSelected={viewMode === 'notes' && selectedFolderId === folder.id}
                onAddQuickLink={(folderId, folderName) => setLinkDialog({ folderId, folderName })}
              />
            ))}
        </SortableContext>

        {newFolderTarget?.type === 'parent' && (
            <div className="mt-5 px-1 mb-1">
              <input
                autoFocus
                placeholder="Parent folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') cancelNewFolder();
                }}
                onBlur={() => {
                  if (newFolderName.trim()) handleCreateFolder();
                  else cancelNewFolder();
                }}
                className="w-full px-2 py-1.5 text-sm rounded-md bg-muted border border-border outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          )}

          {parentSections.map((parent) => {
            const childFolders = folders
              .filter(
                (f) => !isFolderArchived(f) && !f.isParent && f.parentId === parent.id,
              )
              .sort((a, b) => a.order - b.order);
            const isAddingChild =
              newFolderTarget?.type === 'child' && newFolderTarget.parentId === parent.id;
            return (
              <ParentFolderSection
                key={parent.id}
                parent={parent}
                childFolders={childFolders}
                viewMode={viewMode}
                selectedFolderId={selectedFolderId}
                onAddQuickLink={(folderId, folderName) => setLinkDialog({ folderId, folderName })}
                onAddChildFolder={(parentId) => startNewFolder({ type: 'child', parentId })}
                showNewFolderInput={isAddingChild}
                newFolderName={newFolderName}
                onNewFolderNameChange={setNewFolderName}
                onSubmitNewFolder={handleCreateFolder}
                onCancelNewFolder={cancelNewFolder}
              />
            );
          })}

        <FolderDropZone id={ARCHIVE_DROP_ID}>
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
          {archiveOpen && archivedFolders.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-muted-foreground">Drop folders here to archive</p>
          )}
        </FolderDropZone>
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
