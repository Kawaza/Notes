import { format } from 'date-fns';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Note } from '../types';
import { isWorkspaceTaskSelectionId } from '../types/company';
import { FolderSelect } from './FolderSelect';
import { CalendarTaskLinkSelect } from './CalendarTaskLinkSelect';
import { CalendarColorPicker } from './CalendarColorPicker';

function formatScheduleDisplay(note: Note) {
  if (!note.scheduledAt) return '';
  const start = new Date(note.scheduledAt);
  if (note.scheduledEnd) {
    const end = new Date(note.scheduledEnd);
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return `${format(start, 'MMM d, yyyy · h:mm a')} – ${format(end, 'h:mm a')}`;
    }
    return `${format(start, 'MMM d, h:mm a')} – ${format(end, 'MMM d, h:mm a')}`;
  }
  return format(start, 'MMM d, yyyy · h:mm a');
}

export function TaskSchedulePanel({
  note,
  compact,
  onActiveNoteIdChange,
}: {
  note: Note;
  compact?: boolean;
  onActiveNoteIdChange?: (id: string) => void;
}) {
  const updateNote = useStore((s) => s.updateNote);
  const moveNote = useStore((s) => s.moveNote);
  const linkCalendarBlockToTask = useStore((s) => s.linkCalendarBlockToTask);
  const isCalendarBlock = Boolean(note.isCalendarBlock);
  const isWorkspaceTask = isWorkspaceTaskSelectionId(note.id);

  const clearSchedule = () => {
    if (isCalendarBlock) {
      useStore.getState().deleteNote(note.id);
      onActiveNoteIdChange?.('');
      return;
    }
    updateNote(note.id, {
      scheduledAt: undefined,
      scheduledEnd: undefined,
    });
  };

  if (!note.scheduledAt) return null;

  const pad = compact ? 'px-4' : 'px-4 md:px-8';

  const folderSelect = isCalendarBlock ? (
    <CalendarTaskLinkSelect
      note={note}
      size="sm"
      onLinkTask={(taskId) => {
        linkCalendarBlockToTask(note.id, taskId);
      }}
      onClearLink={() => updateNote(note.id, { linkedTaskId: null })}
    />
  ) : isWorkspaceTask ? (
    <span className="text-xs text-muted-foreground truncate max-w-[120px]">Company task</span>
  ) : (
    <FolderSelect
      value={note.folderId}
      onChange={(folderId) => moveNote(note.id, folderId)}
      size="sm"
    />
  );

  if (isCalendarBlock) {
    return (
      <div className={`border-t border-border ${pad} py-2.5 bg-muted/30 shrink-0`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-muted-foreground shrink-0">Block color</span>
            <CalendarColorPicker
              compact
              value={note.calendarColor}
              onChange={(calendarColor) => updateNote(note.id, { calendarColor })}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {folderSelect}
            <button
              type="button"
              onClick={clearSchedule}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
              title="Remove from calendar"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t border-border ${pad} py-2 bg-muted/30 shrink-0`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground min-w-0">{formatScheduleDisplay(note)}</p>
        <div className="flex items-center gap-2 shrink-0">
          {folderSelect}
          <button
            type="button"
            onClick={clearSchedule}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
            title="Remove from calendar"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

