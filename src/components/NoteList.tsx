import { useMemo, useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { LinkIcon } from './LinkIcon';
import { Plus, GripVertical, CalendarClock, Star, Trash2, Pencil, PinOff, Copy, Archive } from 'lucide-react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store/useStore';
import { stripContent } from '../utils/markdown';
import { ALL_NOTES_ID, DEFAULT_FOLDER_ID, isFolderArchived } from '../types';
import type { Note, FolderLink } from '../types';
import { ContextMenu } from './ContextMenu';
import { AddItemMenu } from './AddItemMenu';
import { QuickLinkDialog } from './QuickLinkDialog';

function getNewNoteFolderId(selectedFolderId: string | null): string {
  return selectedFolderId && selectedFolderId !== ALL_NOTES_ID
    ? selectedFolderId
    : DEFAULT_FOLDER_ID;
}

function useDisplayedNotes() {
  const allNotes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const selectedFolderId = useStore((s) => s.selectedFolderId);

  return useMemo(() => {
    let filtered = allNotes;
    if (selectedFolderId && selectedFolderId !== ALL_NOTES_ID) {
      filtered = filtered.filter((n) => n.folderId === selectedFolderId);
    } else if (selectedFolderId === ALL_NOTES_ID) {
      filtered = filtered.filter((n) => {
        const folder = folders.find((f) => f.id === n.folderId);
        return !isFolderArchived(folder);
      });
    }
    return [...filtered].sort((a, b) => {
      if (selectedFolderId === ALL_NOTES_ID) {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return a.order - b.order;
    });
  }, [allNotes, folders, selectedFolderId]);
}

function NoteListItemContent({
  note,
  isSelected,
  showFolder,
  dragHandle,
  itemRef,
  itemStyle,
}: {
  note: Note;
  isSelected: boolean;
  showFolder?: boolean;
  dragHandle?: React.ReactNode;
  itemRef?: (node: HTMLElement | null) => void;
  itemStyle?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const selectNote = useStore((s) => s.selectNote);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const duplicateNote = useStore((s) => s.duplicateNote);
  const archiveNote = useStore((s) => s.archiveNote);
  const folders = useStore((s) => s.folders);

  const preview = stripContent(note.content, note.contentType).slice(0, 120);
  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true });
  const folder = folders.find((f) => f.id === note.folderId);
  const displayTitle = note.title || 'Untitled';
  const canArchive = folder && !isFolderArchived(folder);

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
    if (confirm(`Delete "${displayTitle}"?`)) {
      deleteNote(note.id);
    }
  };

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
            {note.scheduledAt && (
              <CalendarClock size={12} className="shrink-0 text-primary opacity-70" />
            )}
          </div>
          {showFolder && folder && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{folder.name}</p>
          )}
          {preview && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{preview}</p>
          )}
          <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo}</p>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
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
            {
              label: 'Archive',
              icon: <Archive size={14} />,
              disabled: !canArchive,
              onClick: () => archiveNote(note.id),
            },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              danger: true,
              onClick: handleDelete,
            },
          ]}
        />
      )}
    </>
  );
}

function PinnedLinksSection({ folderId }: { folderId: string }) {
  const folderLinks = useStore((s) => s.folderLinks);
  const togglePinFolderLink = useStore((s) => s.togglePinFolderLink);

  const links = useMemo(
    () =>
      folderLinks
        .filter((l) => l.folderId === folderId && l.pinned)
        .sort((a, b) => a.order - b.order),
    [folderLinks, folderId],
  );

  if (links.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-border/50 bg-muted/20">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
        <Star size={10} className="text-primary fill-primary" />
        Pinned Links
      </p>
      <div className="space-y-1">
        {links.map((link) => (
          <PinnedLinkRow key={link.id} link={link} onUnpin={() => togglePinFolderLink(link.id)} />
        ))}
      </div>
    </div>
  );
}

function PinnedLinkRow({ link, onUnpin }: { link: FolderLink; onUnpin: () => void }) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        className="flex items-center gap-2 text-xs text-foreground/80 hover:text-primary truncate py-1 group"
      >
        <LinkIcon url={link.url} size={14} className="!w-7 !h-7 rounded-md" />
        <span className="truncate flex-1">{link.title}</span>
        <Star size={10} className="shrink-0 text-primary fill-primary opacity-60 group-hover:opacity-100" />
      </a>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Unpin from sidebar',
              icon: <PinOff size={14} />,
              onClick: onUnpin,
            },
          ]}
        />
      )}
    </>
  );
}

function SortableNoteListItem({
  note,
  isSelected,
}: {
  note: Note;
  isSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="mt-0.5 opacity-0 group-hover:opacity-40 hover:!opacity-70 cursor-grab active:cursor-grabbing shrink-0"
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
    />
  );
}

export function NoteList() {
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const folders = useStore((s) => s.folders);
  const createNote = useStore((s) => s.createNote);
  const createFolderLink = useStore((s) => s.createFolderLink);
  const requestFolderDialog = useStore((s) => s.requestFolderDialog);
  const notes = useDisplayedNotes();
  const showAll = selectedFolderId === ALL_NOTES_ID;
  const folder = folders.find((f) => f.id === selectedFolderId);
  const listTitle = showAll ? 'All Notes' : folder?.name || 'Notes';
  const noteIds = useMemo(() => notes.map((n) => n.id), [notes]);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const handleNewNote = () => {
    createNote(getNewNoteFolderId(selectedFolderId));
  };

  const handleSaveLink = (title: string, url: string) => {
    const folderId = getNewNoteFolderId(selectedFolderId);
    createFolderLink(folderId, title, url);
  };

  return (
    <div className="flex flex-col w-72 shrink-0 border-r border-border bg-background h-full">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">{listTitle}</h2>
          <p className="text-xs text-muted-foreground">{notes.length} notes</p>
        </div>
        <button
          ref={addButtonRef}
          onClick={() => {
            if (showAll) handleNewNote();
            else setShowAddMenu((v) => !v);
          }}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Plus size={18} />
        </button>
      </div>

      {showAddMenu && !showAll && (
        <AddItemMenu
          anchorRef={addButtonRef}
          onClose={() => setShowAddMenu(false)}
          onNewNote={handleNewNote}
          onQuickLink={() => setShowLinkDialog(true)}
          onSecret={() => requestFolderDialog('secret')}
        />
      )}

      <QuickLinkDialog
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onSave={handleSaveLink}
        folderName={folder?.name}
      />

      <div className="flex-1 overflow-y-auto">
        {!showAll && selectedFolderId && folder && !isFolderArchived(folder) && (
          <PinnedLinksSection folderId={selectedFolderId} />
        )}
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <p className="text-sm text-muted-foreground">No notes in this folder</p>
            <button
              onClick={handleNewNote}
              className="mt-3 text-sm text-primary hover:underline cursor-pointer"
            >
              Create a note
            </button>
          </div>
        ) : showAll ? (
          notes.map((note) => (
            <NoteListItemContent
              key={note.id}
              note={note}
              isSelected={selectedNoteId === note.id}
              showFolder
            />
          ))
        ) : (
          <SortableContext items={noteIds} strategy={verticalListSortingStrategy}>
            {notes.map((note) => (
              <SortableNoteListItem
                key={note.id}
                note={note}
                isSelected={selectedNoteId === note.id}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
