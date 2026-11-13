import { useMemo, useState, useEffect, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { memberDisplayName } from '../utils/memberDisplayName';
import { WORKSPACE_TASK_STATUS_STYLES } from '../constants/workspaceTaskStatusStyles';
import { LinkIcon } from './LinkIcon';
import { Plus, GripVertical, CalendarClock, Star, Trash2, Pencil, PinOff, Copy, Archive, ArchiveRestore, MoreVertical } from 'lucide-react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store/useStore';
import { useCompanyStore } from '../store/companyStore';
import {
  MY_TASKS_ID,
  getNewNoteFolderId,
  isFolderArchived,
  isNoteFolder,
  isPersonalFolderView,
} from '../types';
import {
  WORKSPACE_TASK_STATUS_LABELS,
  isWorkspaceArchiveSelectionId,
  isWorkspaceFolderSelectionId,
  parseWorkspaceFolderSelectionId,
} from '../types/company';
import { workspaceLinkToFolderLink, workspaceNoteToNote, workspaceTaskToNote } from '../utils/workspaceMappers';
import { useAuthStore } from '../store/authStore';
import { WorkspaceAddTaskDialog } from './WorkspaceAddTaskDialog';
import type { Note, FolderLink } from '../types';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { AddItemMenu } from './AddItemMenu';
import { QuickLinkDialog } from './QuickLinkDialog';
import { SecretDialog, type SecretFormData } from './SecretDialog';
import { OverflowMenu } from './OverflowMenu';
import { MobileNavButton } from './MobileNavButton';
import { useIsMobile } from '../hooks/useIsMobile';
import { openExternalUrl } from '../utils/openExternal';
import { useMyTasksList } from '../hooks/useMyTasksList';
import { useWorkspaceFolderRealtime } from '../hooks/useWorkspaceFolderRealtime';
import { findWorkspaceFolder } from '../utils/workspaceFolderTree';
import { membersWithCurrentUser } from '../utils/companyMembers';

function useDisplayedNotes() {
  const allNotes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const notesByFolder = useCompanyStore((s) => s.notesByFolder);
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);

  return useMemo(() => {
    const ws = parseWorkspaceFolderSelectionId(selectedFolderId);
    if (ws) {
      const archiveView = isWorkspaceArchiveSelectionId(selectedFolderId);
      const wsFolder = findWorkspaceFolder(foldersByCompany, ws.folderId);
      const folderArchived = Boolean(wsFolder?.archived);
      return (notesByFolder[ws.folderId] ?? [])
        .filter((n) => {
          if (archiveView && folderArchived) return true;
          return archiveView ? n.archived : !n.archived;
        })
        .map(workspaceNoteToNote)
        .sort((a, b) => a.order - b.order);
    }
    if (!selectedFolderId || selectedFolderId === MY_TASKS_ID) return [];
    const filtered = allNotes.filter(
      (n) => n.folderId === selectedFolderId && !n.isTask && !n.isCalendarBlock,
    );
    return [...filtered].sort((a, b) => a.order - b.order);
  }, [allNotes, folders, selectedFolderId, notesByFolder, foldersByCompany]);
}

function useWorkspaceTasks(
  folderId: string | null,
  archiveView: boolean,
  folderArchived: boolean,
) {
  const tasksByFolder = useCompanyStore((s) => s.tasksByFolder);
  return useMemo(() => {
    if (!folderId) return [];
    return (tasksByFolder[folderId] ?? [])
      .filter((t) => {
        if (archiveView && folderArchived) return true;
        return archiveView ? t.archived : !t.archived;
      })
      .map(workspaceTaskToNote)
      .sort((a, b) => a.order - b.order);
  }, [tasksByFolder, folderId, archiveView, folderArchived]);
}

function NoteListItemContent({
  note,
  isSelected,
  showFolder,
  workspaceFolderLabel,
  dragHandle,
  itemRef,
  itemStyle,
  workspaceArchiveView = false,
}: {
  note: Note;
  isSelected: boolean;
  showFolder?: boolean;
  workspaceFolderLabel?: string | null;
  dragHandle?: React.ReactNode;
  itemRef?: (node: HTMLElement | null) => void;
  itemStyle?: React.CSSProperties;
  workspaceArchiveView?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const overflowRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const selectNote = useStore((s) => s.selectNote);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const duplicateNote = useStore((s) => s.duplicateNote);
  const archiveNote = useStore((s) => s.archiveNote);
  const restoreNote = useStore((s) => s.restoreNote);
  const togglePinNote = useStore((s) => s.togglePinNote);
  const folders = useStore((s) => s.folders);
  const profilesByUserId = useCompanyStore((s) => s.profilesByUserId);
  const membersByCompany = useCompanyStore((s) => s.membersByCompany);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const currentUserProfile = useAuthStore((s) => s.profile);

  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true });
  const taskMeta = note.workspaceTaskMeta;
  const personalMeta =
    note.personalTaskMeta ?? (note.isTask && !note.workspaceTaskMeta ? { status: 'todo' as const } : undefined);
  const folder = folders.find((f) => f.id === note.folderId);
  const displayTitle = note.title || 'Untitled';
  const isWorkspaceItem =
    note.id.startsWith('wsn:') || note.id.startsWith('wst:');
  const canArchive =
    !workspaceArchiveView && (isWorkspaceItem || Boolean(folder && !isFolderArchived(folder)));
  const canRestoreWorkspace = workspaceArchiveView && isWorkspaceItem;
  const dueRaw = taskMeta?.dueAt ?? note.scheduledAt;
  const dueOverdue = Boolean(dueRaw && new Date(dueRaw).getTime() < Date.now());

  useEffect(() => {
    if (!editing) setEditTitle(note.title);
  }, [note.title, editing]);

  const saveTitle = () => {
    updateNote(note.id, { title: editTitle.trim() || 'Untitled' });
    setEditing(false);
  };

  const startRename = () => {
    setEditTitle(note.title);
    setEditing(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const noteMenuItems = [
    ...(!note.id.startsWith('wst:')
      ? [
          {
            label: note.pinned ? 'Unpin from folder top' : 'Pin to folder top',
            icon: <Star size={14} className={note.pinned ? 'fill-primary text-primary' : ''} />,
            onClick: () => togglePinNote(note.id),
          },
        ]
      : []),
    {
      label: 'Rename',
      icon: <Pencil size={14} />,
      onClick: startRename,
    },
    {
      label: 'Duplicate',
      icon: <Copy size={14} />,
      onClick: () => duplicateNote(note.id),
    },
    ...(canRestoreWorkspace
      ? [
          {
            label: 'Restore to workspace',
            icon: <ArchiveRestore size={14} />,
            onClick: () => restoreNote(note.id),
          },
        ]
      : [
          {
            label: 'Archive',
            icon: <Archive size={14} />,
            disabled: !canArchive,
            onClick: () => archiveNote(note.id),
          },
        ]),
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: handleDelete,
    },
  ];

  return (
    <>
      <div
        ref={itemRef}
        style={itemStyle}
        onClick={() => !editing && selectNote(note.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        className={`group flex gap-2 px-3 py-3 cursor-pointer border-b border-border/50 transition-colors ${
          isSelected ? 'bg-accent' : 'hover:bg-muted/60'
        }`}
      >
        {dragHandle ?? <div className="w-3.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {note.pinned && <Star size={11} className="shrink-0 text-primary fill-primary" />}
            {editing ? (
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') {
                    setEditTitle(note.title);
                    setEditing(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-primary"
              />
            ) : (
              <h3
                className="text-sm font-medium truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRename();
                }}
                title="Double-click to rename"
              >
                {displayTitle}
              </h3>
            )}
            {note.scheduledAt && !showFolder && !taskMeta && (
              <CalendarClock size={12} className="shrink-0 text-primary opacity-70" />
            )}
          </div>
          {showFolder && (workspaceFolderLabel || folder) && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              {workspaceFolderLabel ?? folder?.name}
            </p>
          )}
          {(taskMeta || personalMeta) && (
            <p className="text-[11px] text-muted-foreground/80 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${WORKSPACE_TASK_STATUS_STYLES[(taskMeta ?? personalMeta)!.status]}`}
              >
                {WORKSPACE_TASK_STATUS_LABELS[(taskMeta ?? personalMeta)!.status]}
              </span>
              {taskMeta?.assigneeId && (
                <span>
                  {memberDisplayName(
                    taskMeta.assigneeId,
                    profilesByUserId,
                    membersByCompany[taskMeta.companyId] ?? [],
                    currentUserId,
                    currentUserProfile,
                  )}
                </span>
              )}
              {personalMeta && currentUserId && (
                <span>
                  {memberDisplayName(
                    currentUserId,
                    profilesByUserId,
                    [],
                    currentUserId,
                    currentUserProfile,
                  )}{' '}
                  (you)
                </span>
              )}
              {((taskMeta?.dueAt ?? personalMeta?.dueAt) || note.scheduledAt) && (
                <span className={dueOverdue ? 'text-destructive font-medium' : undefined}>
                  · Due{' '}
                  {format(
                    new Date(taskMeta?.dueAt ?? personalMeta?.dueAt ?? note.scheduledAt!),
                    'MMM d, h:mm a',
                  )}
                </span>
              )}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo}</p>
        </div>
        {isMobile && !editing && (
          <button
            ref={overflowRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOverflowOpen((v) => !v);
            }}
            className="self-start p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
            aria-label="Note options"
          >
            <MoreVertical size={16} />
          </button>
        )}
      </div>

      {overflowOpen && (
        <OverflowMenu
          anchorRef={overflowRef}
          items={noteMenuItems}
          onClose={() => setOverflowOpen(false)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={noteMenuItems}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete note?"
        message={`"${displayTitle}" will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteNote(note.id)}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

function FolderPinnedBar({
  folderId,
  notes,
  onSelectNote,
}: {
  folderId: string;
  notes: Note[];
  onSelectNote: (id: string) => void;
}) {
  const folderLinks = useStore((s) => s.folderLinks);
  const linksByFolder = useCompanyStore((s) => s.linksByFolder);
  const togglePinFolderLink = useStore((s) => s.togglePinFolderLink);
  const togglePinNote = useStore((s) => s.togglePinNote);
  const ws = parseWorkspaceFolderSelectionId(folderId);

  const links = useMemo(() => {
    if (ws) {
      return (linksByFolder[ws.folderId] ?? [])
        .filter((l) => l.pinned)
        .map(workspaceLinkToFolderLink)
        .sort((a, b) => a.order - b.order);
    }
    return folderLinks
      .filter((l) => l.folderId === folderId && l.pinned)
      .sort((a, b) => a.order - b.order);
  }, [folderLinks, folderId, ws, linksByFolder]);

  const pinnedNotes = useMemo(
    () => notes.filter((n) => n.pinned && !n.isTask).sort((a, b) => a.order - b.order),
    [notes],
  );

  if (links.length === 0 && pinnedNotes.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-border/50 bg-muted/20 space-y-2">
      {links.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Star size={10} className="text-primary fill-primary" />
            Pinned links
          </p>
          <div className="space-y-1">
            {links.map((link) => (
              <PinnedLinkRow key={link.id} link={link} onUnpin={() => togglePinFolderLink(link.id)} />
            ))}
          </div>
        </div>
      )}
      {pinnedNotes.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Star size={10} className="text-primary fill-primary" />
            Pinned notes
          </p>
          <div className="space-y-1">
            {pinnedNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onSelectNote(note.id)}
                className="flex w-full items-center gap-2 text-xs text-foreground/90 hover:text-primary truncate py-1 cursor-pointer text-left"
              >
                <Star size={10} className="shrink-0 text-primary fill-primary" />
                <span className="truncate flex-1">{note.title || 'Untitled'}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinNote(note.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      togglePinNote(note.id);
                    }
                  }}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground shrink-0"
                  title="Unpin"
                >
                  <PinOff size={12} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PinnedLinkRow({ link, onUnpin }: { link: FolderLink; onUnpin: () => void }) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const menuItems = [
    {
      label: 'Unpin from sidebar',
      icon: <PinOff size={14} />,
      onClick: onUnpin,
    },
  ];

  return (
    <>
      <div className="flex items-center gap-1 group">
        <a
          href={link.url}
          className="flex flex-1 items-center gap-2 text-xs text-foreground/80 hover:text-primary truncate py-1 min-w-0 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            openExternalUrl(link.url);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          <LinkIcon url={link.url} size={14} className="!w-7 !h-7 rounded-md" />
          <span className="truncate flex-1">{link.title}</span>
          <Star size={10} className="shrink-0 text-primary fill-primary opacity-60 group-hover:opacity-100 max-md:opacity-100" />
        </a>
        {isMobile && (
          <>
            <button
              ref={overflowRef}
              type="button"
              onClick={() => setOverflowOpen((v) => !v)}
              className="p-1 rounded-md text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
              aria-label="Link options"
            >
              <MoreVertical size={14} />
            </button>
            {overflowOpen && (
              <OverflowMenu anchorRef={overflowRef} items={menuItems} onClose={() => setOverflowOpen(false)} />
            )}
          </>
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={menuItems}
        />
      )}
    </>
  );
}

function SortableNoteListItem({
  note,
  isSelected,
  workspaceArchiveView,
}: {
  note: Note;
  isSelected: boolean;
  workspaceArchiveView?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.35 : 1,
    pointerEvents: isDragging ? ('none' as const) : undefined,
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="mt-0.5 opacity-0 group-hover:opacity-40 hover:!opacity-70 max-md:opacity-40 cursor-grab active:cursor-grabbing shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical size={14} />
    </button>
  );

  return (
    <NoteListItemContent
      note={note}
      isSelected={isSelected}
      dragHandle={dragHandle}
      itemRef={setNodeRef}
      itemStyle={style}
      workspaceArchiveView={workspaceArchiveView}
    />
  );
}

export function NoteList({
  onOpenNav,
  onShowFolderOverview,
  showFolderOverviewToggle = false,
}: {
  onOpenNav?: () => void;
  onShowFolderOverview?: () => void;
  showFolderOverviewToggle?: boolean;
} = {}) {
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const folders = useStore((s) => s.folders);
  const createNote = useStore((s) => s.createNote);
  const createFolderLink = useStore((s) => s.createFolderLink);
  const createFolderSecret = useStore((s) => s.createFolderSecret);
  const requestFolderDialog = useStore((s) => s.requestFolderDialog);
  const notes = useDisplayedNotes();
  const myTasks = useMyTasksList();
  const showMyTasks = selectedFolderId === MY_TASKS_ID;
  const isWorkspaceFolder = isWorkspaceFolderSelectionId(selectedFolderId);
  const workspaceListTab = useStore((s) => s.workspaceListTab);
  const setWorkspaceListTab = useStore((s) => s.setWorkspaceListTab);
  const createWorkspaceTask = useStore((s) => s.createWorkspaceTask);
  const createPersonalTask = useStore((s) => s.createPersonalTask);
  const allNotes = useStore((s) => s.notes);
  const folder = folders.find((f) => f.id === selectedFolderId);
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);
  const companies = useCompanyStore((s) => s.companies);
  const membersByCompany = useCompanyStore((s) => s.membersByCompany);
  const profilesByUserId = useCompanyStore((s) => s.profilesByUserId);
  const isArchiveView = isWorkspaceArchiveSelectionId(selectedFolderId);
  const isPersonalNoteFolder = isPersonalFolderView(folder, isWorkspaceFolder, showMyTasks);
  const isActivePersonalNoteFolder = Boolean(
    folder && isNoteFolder(folder) && !isWorkspaceFolder && !showMyTasks,
  );
  const personalTasks = useMemo(() => {
    if (!isPersonalNoteFolder || !selectedFolderId) return [];
    return allNotes
      .filter((n) => n.folderId === selectedFolderId && n.isTask && !n.isCalendarBlock)
      .sort((a, b) => a.order - b.order);
  }, [allNotes, selectedFolderId, isPersonalNoteFolder]);
  const wsFolderId = parseWorkspaceFolderSelectionId(selectedFolderId)?.folderId;
  const loadFolderContent = useCompanyStore((s) => s.loadFolderContent);

  useWorkspaceFolderRealtime(wsFolderId);

  useEffect(() => {
    if (!wsFolderId) return;
    void loadFolderContent(wsFolderId);
    const id = window.setInterval(() => void loadFolderContent(wsFolderId), 45_000);
    return () => window.clearInterval(id);
  }, [wsFolderId, loadFolderContent]);
  const wsFolder = wsFolderId ? findWorkspaceFolder(foldersByCompany, wsFolderId) : null;
  const wsFolderArchived = Boolean(wsFolder?.archived);
  const workspaceTasks = useWorkspaceTasks(wsFolderId ?? null, isArchiveView, wsFolderArchived);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const currentUserProfile = useAuthStore((s) => s.profile);
  const wsCompanyId = useMemo(() => {
    if (!wsFolderId) return null;
    for (const list of Object.values(foldersByCompany)) {
      const hit = list.find((f) => f.id === wsFolderId);
      if (hit) return hit.companyId;
    }
    return null;
  }, [foldersByCompany, wsFolderId]);
  const workspaceMembers = wsCompanyId
    ? membersWithCurrentUser(
        membersByCompany[wsCompanyId] ?? [],
        wsCompanyId,
        currentUserId,
        currentUserProfile,
      )
    : [];
  const wsFolderName = useMemo(() => {
    if (!wsFolderId) return null;
    for (const list of Object.values(foldersByCompany)) {
      const hit = list.find((f) => f.id === wsFolderId);
      if (hit) return hit.name;
    }
    return null;
  }, [foldersByCompany, wsFolderId]);
  const wsCompanyName = wsCompanyId ? companies.find((c) => c.id === wsCompanyId)?.name ?? null : null;
  const listTitle = showMyTasks
    ? 'My Tasks'
    : isArchiveView && wsFolderName
      ? wsCompanyName
        ? `${wsCompanyName} - ${wsFolderName}`
        : wsFolderName
      : wsFolderName ?? folder?.name ?? 'Notes';
  const noteIds = useMemo(() => notes.map((n) => n.id), [notes]);
  const folderHasTaskTabs =
    isWorkspaceFolder || isArchiveView || isPersonalNoteFolder;
  const showingTasks =
    showMyTasks ||
    (isArchiveView && workspaceListTab === 'tasks') ||
    (folderHasTaskTabs && workspaceListTab === 'tasks');
  const listItems = showingTasks
    ? showMyTasks
      ? myTasks
      : isPersonalNoteFolder
        ? personalTasks
        : workspaceTasks
    : notes;
  const workspaceFolderLabelFor = (note: Note) => {
    const rawId = note.workspaceTaskMeta?.rawFolderId;
    if (!rawId) return null;
    for (const list of Object.values(foldersByCompany)) {
      const hit = list.find((f) => f.id === rawId);
      if (hit) return hit.name;
    }
    return null;
  };

  const listCountLabel = showingTasks
    ? `${listItems.length} task${listItems.length === 1 ? '' : 's'}`
  : `${notes.length} note${notes.length === 1 ? '' : 's'}`;

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showSecretDialog, setShowSecretDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const handleNewNote = () => {
    createNote(getNewNoteFolderId(selectedFolderId));
  };

  const handleSaveLink = (title: string, url: string) => {
    if (!selectedFolderId) return;
    createFolderLink(selectedFolderId, title, url);
  };

  return (
    <div className="flex flex-col w-full md:w-72 shrink-0 border-r border-border bg-background h-full">
      <div className="flex items-center justify-between px-3 md:px-4 py-3.5 border-b border-border gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {onOpenNav && <MobileNavButton onClick={onOpenNav} />}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{listTitle}</h2>
            <p className="text-xs text-muted-foreground">{listCountLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(showFolderOverviewToggle || isWorkspaceFolderSelectionId(selectedFolderId)) &&
            onShowFolderOverview && (
            <button
              type="button"
              onClick={onShowFolderOverview}
              className="md:hidden px-2 py-1 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-muted cursor-pointer"
            >
              Folder
            </button>
          )}
          {!showMyTasks && !isArchiveView && (
            <button
              ref={addButtonRef}
              onClick={() => setShowAddMenu((v) => !v)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      {!showMyTasks &&
        selectedFolderId &&
        (isWorkspaceFolder ||
          isPersonalNoteFolder ||
          (folder && !isFolderArchived(folder) && !isArchiveView)) && (
          <FolderPinnedBar
            folderId={selectedFolderId}
            notes={notes}
            onSelectNote={(id) => useStore.getState().selectNote(id)}
          />
        )}

      {folderHasTaskTabs && !showMyTasks && (
        <div className="flex border-b border-border px-2">
          <button
            type="button"
            onClick={() => setWorkspaceListTab('notes')}
            className={`flex-1 py-4 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              workspaceListTab === 'notes'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Notes
            <span className="ml-1 opacity-50 tabular-nums">{notes.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceListTab('tasks')}
            className={`flex-1 py-4 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              workspaceListTab === 'tasks'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Tasks
            <span className="ml-1 opacity-50 tabular-nums">
              {isPersonalNoteFolder ? personalTasks.length : workspaceTasks.length}
            </span>
          </button>
        </div>
      )}

      {showAddMenu && !showMyTasks && (
        <AddItemMenu
          anchorRef={addButtonRef}
          onClose={() => setShowAddMenu(false)}
          onNewNote={handleNewNote}
          newNoteLabel={isWorkspaceFolder ? 'Add Note' : 'New Note'}
          onNewTask={
            isWorkspaceFolder
              ? () => setShowAddTaskDialog(true)
              : isActivePersonalNoteFolder
                ? () => setShowAddTaskDialog(true)
                : undefined
          }
          onQuickLink={() => setShowLinkDialog(true)}
          onSecret={() => {
            if (isWorkspaceFolder) setShowSecretDialog(true);
            else requestFolderDialog('secret');
          }}
        />
      )}

      <WorkspaceAddTaskDialog
        open={showAddTaskDialog}
        onClose={() => setShowAddTaskDialog(false)}
        members={workspaceMembers}
        profilesByUserId={profilesByUserId}
        currentUserId={currentUserId}
        currentUserProfile={currentUserProfile}
        onSave={(title, assigneeId) => {
          if (isActivePersonalNoteFolder && currentUserId) {
            createPersonalTask(title);
          } else {
            createWorkspaceTask(assigneeId, title);
          }
        }}
        soloAssignee={isActivePersonalNoteFolder}
      />

      <QuickLinkDialog
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onSave={handleSaveLink}
        folderName={wsFolderName ?? folder?.name}
      />

      <SecretDialog
        open={showSecretDialog}
        onClose={() => setShowSecretDialog(false)}
        onSave={(data: SecretFormData) => {
          if (selectedFolderId) createFolderSecret(selectedFolderId, data);
          setShowSecretDialog(false);
        }}
        folderName={wsFolderName ?? folder?.name}
      />

      <div className="flex-1 overflow-y-auto">
        {listItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <p className="text-sm text-muted-foreground">
              {showingTasks ? 'No tasks here yet' : 'No notes in this folder'}
            </p>
            {!showMyTasks && !isArchiveView && (
              <button
                onClick={() =>
                  showingTasks && folderHasTaskTabs
                    ? setShowAddTaskDialog(true)
                    : handleNewNote()
                }
                className="mt-3 text-sm text-primary hover:underline cursor-pointer"
              >
                {showingTasks ? 'Add a task' : 'Create a note'}
              </button>
            )}
          </div>
        ) : showingTasks ? (
          listItems.map((note) => (
            <NoteListItemContent
              key={note.id}
              note={note}
              isSelected={selectedNoteId === note.id}
              showFolder={showMyTasks}
              workspaceFolderLabel={showMyTasks ? workspaceFolderLabelFor(note) : null}
              workspaceArchiveView={isArchiveView}
            />
          ))
        ) : (
          <SortableContext items={noteIds} strategy={verticalListSortingStrategy}>
            {notes.map((note) => (
              <SortableNoteListItem
                key={note.id}
                note={note}
                isSelected={selectedNoteId === note.id}
                workspaceArchiveView={isArchiveView}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
