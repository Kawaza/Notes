import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Note } from '../types';

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
}: {
  note: Note;
  compact?: boolean;
}) {
  const updateNote = useStore((s) => s.updateNote);
  const moveNote = useStore((s) => s.moveNote);
  const folders = useStore((s) => s.folders);
  const [editing, setEditing] = useState(false);

  const handleSchedule = (date: string, time: string, endTime?: string) => {
    if (!date) return;
    const scheduledAt = new Date(`${date}T${time || '09:00'}`).toISOString();
    let scheduledEnd: string | undefined;
    if (endTime) {
      scheduledEnd = new Date(`${date}T${endTime}`).toISOString();
    }
    const folder = folders.find((f) => f.id === note.folderId);
    updateNote(note.id, {
      scheduledAt,
      scheduledEnd,
      isTask: true,
      calendarColor: note.calendarColor ?? folder?.calendarColor ?? 'blue',
    });
  };

  const clearSchedule = () => {
    updateNote(note.id, {
      scheduledAt: undefined,
      scheduledEnd: undefined,
      isTask: false,
    });
    setEditing(false);
  };

  const dateValue = note.scheduledAt
    ? format(new Date(note.scheduledAt), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');
  const timeValue = note.scheduledAt
    ? format(new Date(note.scheduledAt), 'HH:mm')
    : '09:00';
  const endTimeValue = note.scheduledEnd
    ? format(new Date(note.scheduledEnd), 'HH:mm')
    : '10:00';

  const pad = compact ? 'px-4' : 'px-8';
  const inputClass =
    'px-1.5 py-1 text-xs rounded-md bg-background border border-border outline-none focus:ring-1 focus:ring-primary/40 min-w-0';

  const folderSelect = (
    <select
      value={note.folderId}
      onChange={(e) => moveNote(note.id, e.target.value)}
      className="text-xs px-1.5 py-1 rounded-md bg-background border border-border outline-none max-w-[110px] shrink-0 cursor-pointer truncate"
      title="Folder"
    >
      {folders.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );

  const closeEditing = () => {
    if (!note.scheduledAt) setEditing(false);
    else setEditing(false);
  };

  return (
    <div className={`border-t border-border ${pad} py-2 bg-muted/30 shrink-0`}>
      {note.scheduledAt && !editing ? (
        <div className="flex items-center gap-2">
          <CalendarClock size={14} className="text-primary shrink-0" />
          <button
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-sm hover:text-primary transition-colors cursor-pointer truncate min-w-0"
            title="Click to change schedule"
          >
            {formatScheduleDisplay(note)}
          </button>
          {folderSelect}
          <button
            onClick={clearSchedule}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
            title="Remove from calendar"
          >
            <X size={15} />
          </button>
        </div>
      ) : editing ? (
        <>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateValue}
              onChange={(e) => handleSchedule(e.target.value, timeValue, endTimeValue)}
              className={`${inputClass} flex-[1.3]`}
            />
            <input
              type="time"
              value={timeValue}
              onChange={(e) => handleSchedule(dateValue, e.target.value, endTimeValue)}
              className={`${inputClass} flex-1`}
            />
            <input
              type="time"
              value={endTimeValue}
              onChange={(e) => handleSchedule(dateValue, timeValue, e.target.value)}
              className={`${inputClass} flex-1`}
            />
            {folderSelect}
            <button
              onClick={note.scheduledAt ? closeEditing : () => setEditing(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
              title={note.scheduledAt ? 'Done' : 'Cancel'}
            >
              <X size={15} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <CalendarClock size={14} className="text-muted-foreground shrink-0" />
          <button
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Add to calendar
          </button>
          {folderSelect}
        </div>
      )}
    </div>
  );
}
