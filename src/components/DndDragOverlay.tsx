import { DragOverlay, defaultDropAnimationSideEffects, type DropAnimation } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { GripVertical, FolderOpen, Star } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SORTABLE_FOLDER_PREFIX, folderIdFromSortable } from '../types';

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export function DndDragOverlay({ activeId }: { activeId: string | null }) {
  const folders = useStore((s) => s.folders);
  const notes = useStore((s) => s.notes);

  let content: ReactNode = null;

  if (activeId?.startsWith(SORTABLE_FOLDER_PREFIX)) {
    const folderId = folderIdFromSortable(activeId);
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      const noteCount = notes.filter((n) => n.folderId === folderId).length;
      content = (
        <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm bg-muted/60 text-foreground/80 cursor-grabbing w-52 opacity-50">
          <GripVertical size={12} className="shrink-0 opacity-40" />
          <FolderOpen size={15} className="shrink-0 opacity-60" />
          <span className="flex-1 truncate">{folder.name}</span>
          <span className="text-xs opacity-40 tabular-nums">{noteCount}</span>
        </div>
      );
    }
  } else if (activeId) {
    const note = notes.find((n) => n.id === activeId);
    if (note) {
      content = (
        <div className="flex gap-2 px-3 py-3 bg-muted/60 text-foreground/80 cursor-grabbing w-72 opacity-50">
          <GripVertical size={14} className="shrink-0 opacity-40 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {note.pinned && <Star size={11} className="shrink-0 text-primary fill-primary" />}
              <span className="text-sm truncate">{note.title || 'Untitled'}</span>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <DragOverlay dropAnimation={dropAnimation} style={{ pointerEvents: 'none' }}>
      {content}
    </DragOverlay>
  );
}
