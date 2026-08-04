import { useEffect, useMemo, useRef } from 'react';
import { Draggable } from '@fullcalendar/interaction';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { isFolderArchived } from '../types';
import { getCalendarColor } from '../constants/calendarColors';

type AddTasksPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function AddTasksPanel({ open, onClose }: AddTasksPanelProps) {
  const notes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const listRef = useRef<HTMLDivElement>(null);

  const outstandingNotes = useMemo(
    () =>
      notes
        .filter((n) => {
          if (n.scheduledAt) return false;
          const folder = folders.find((f) => f.id === n.folderId);
          return !isFolderArchived(folder);
        })
        .sort((a, b) => a.title.localeCompare(b.title)),
    [notes, folders],
  );

  useEffect(() => {
    if (!open || !listRef.current) return;

    const draggable = new Draggable(listRef.current, {
      itemSelector: '.add-task-draggable',
      eventData: (el) => ({
        title: el.getAttribute('data-title') || 'Untitled task',
        duration: { hours: 1 },
        create: false,
      }),
    });

    return () => draggable.destroy();
  }, [open, outstandingNotes.length]);

  if (!open) return null;

  return (
    <div className="px-4 md:px-6 py-3 border-b border-border bg-muted/30 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium">Outstanding tasks</p>
          <p className="text-xs text-muted-foreground">Drag a note onto the calendar to schedule it</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {outstandingNotes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          All notes are scheduled, or you have no notes yet. Click the calendar to add a new task.
        </p>
      ) : (
        <div ref={listRef} className="flex flex-wrap gap-2 max-h-40 overflow-y-auto py-1">
          {outstandingNotes.map((note) => {
            const folder = folders.find((f) => f.id === note.folderId);
            const color = getCalendarColor(folder?.calendarColor ?? note.calendarColor);
            return (
              <div
                key={note.id}
                data-note-id={note.id}
                data-title={note.title || 'Untitled note'}
                className="add-task-draggable fc-event flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-card text-sm cursor-grab active:cursor-grabbing select-none max-w-full"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: color.border,
                }}
              >
                <span className="truncate font-medium">{note.title || 'Untitled note'}</span>
                {folder && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{folder.name}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
