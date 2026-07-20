import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { Plus, Trash2, Archive } from 'lucide-react';
import { useStore } from '../store/useStore';
import { DEFAULT_FOLDER_ID, isFolderArchived } from '../types';
import { getEventStyle } from '../constants/calendarColors';
import { Editor } from './Editor';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { FolderSelect } from './FolderSelect';
import { MobileNavButton } from './MobileNavButton';

export function CalendarView({ onOpenNav }: { onOpenNav?: () => void } = {}) {
  const notes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const theme = useStore((s) => s.theme);
  const updateNote = useStore((s) => s.updateNote);
  const createNote = useStore((s) => s.createNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const archiveNote = useStore((s) => s.archiveNote);
  const selectNote = useStore((s) => s.selectNote);
  const setViewMode = useStore((s) => s.setViewMode);

  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickFolderId, setQuickFolderId] = useState(DEFAULT_FOLDER_ID);
  const [panelNoteId, setPanelNoteId] = useState<string | null>(null);
  const [timeTick, setTimeTick] = useState(0);
  const [eventMenu, setEventMenu] = useState<{ x: number; y: number; noteId: string; title: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ noteId: string; title: string } | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const getFolderColor = (folderId: string) =>
    folders.find((f) => f.id === folderId)?.calendarColor ?? 'blue';

  const events = useMemo(() => {
    return notes
      .filter((n) => {
        if (!n.scheduledAt) return false;
        const folder = folders.find((f) => f.id === n.folderId);
        return !isFolderArchived(folder);
      })
      .map((n) => {
        const style = getEventStyle(getFolderColor(n.folderId), isDark);
        return {
          id: n.id,
          title: n.title || 'Untitled',
          start: n.scheduledAt!,
          end: n.scheduledEnd || undefined,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          textColor: style.textColor,
        };
      });
  }, [notes, folders, isDark]);

  const handleEventClick = (info: EventClickArg) => {
    setPanelNoteId(info.event.id);
  };

  const handleEventDrop = (info: EventDropArg) => {
    updateNote(info.event.id, {
      scheduledAt: info.event.start?.toISOString(),
      scheduledEnd: info.event.end?.toISOString(),
      isTask: true,
    });
  };

  const handleEventResize = (info: EventResizeDoneArg) => {
    updateNote(info.event.id, {
      scheduledAt: info.event.start?.toISOString(),
      scheduledEnd: info.event.end?.toISOString(),
    });
  };

  const openTaskPanel = (noteId: string) => {
    setPanelNoteId(noteId);
  };

  const handleDateSelect = (info: DateSelectArg) => {
    const noteId = createNote(DEFAULT_FOLDER_ID, 'New Task', { keepView: true });
    updateNote(noteId, {
      scheduledAt: info.start.toISOString(),
      scheduledEnd: info.end?.toISOString(),
      isTask: true,
      calendarColor: getFolderColor(DEFAULT_FOLDER_ID),
    });
    openTaskPanel(noteId);
    calendarRef.current?.getApi().unselect();
  };

  const handleQuickAdd = () => {
    if (!quickTitle.trim()) return;
    const noteId = createNote(quickFolderId, quickTitle.trim(), { keepView: true });
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    updateNote(noteId, {
      scheduledAt: now.toISOString(),
      scheduledEnd: new Date(now.getTime() + 3600000).toISOString(),
      isTask: true,
      calendarColor: getFolderColor(quickFolderId),
    });
    openTaskPanel(noteId);
    setQuickTitle('');
    setShowQuickAdd(false);
  };

  const handleExpand = () => {
    if (!panelNoteId) return;
    selectNote(panelNoteId);
    setViewMode('notes');
    setPanelNoteId(null);
  };

  const confirmDeleteEvent = () => {
    if (!deleteTarget) return;
    deleteNote(deleteTarget.noteId);
    if (panelNoteId === deleteTarget.noteId) {
      setPanelNoteId(null);
    }
    setDeleteTarget(null);
  };

  const handleArchiveEvent = (noteId: string) => {
    archiveNote(noteId);
    if (panelNoteId === noteId) {
      setPanelNoteId(null);
    }
  };

  const canArchiveEvent = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return false;
    const folder = folders.find((f) => f.id === note.folderId);
    return folder && !isFolderArchived(folder);
  };

  const slotLaneClassNames = useCallback(
    (arg: { date?: Date }) => {
      void timeTick;
      if (!arg.date) return [];
      const now = new Date();
      const currentSlot =
        Math.floor((now.getHours() * 60 + now.getMinutes()) / 30) * 30;
      const slotMinutes = arg.date.getHours() * 60 + arg.date.getMinutes();
      return slotMinutes === currentSlot ? ['fc-current-slot'] : [];
    },
    [timeTick],
  );

  return (
    <div className="flex-1 flex h-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {onOpenNav && <MobileNavButton onClick={onOpenNav} />}
            <div className="min-w-0">
              <h2 className="text-lg font-medium">Calendar</h2>
              <p className="text-sm text-muted-foreground font-normal hidden sm:block">
                Drag to reschedule · Click to edit · Right-click for options
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setQuickFolderId(DEFAULT_FOLDER_ID);
              setShowQuickAdd(true);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-normal hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>

        {showQuickAdd && (
          <div className="px-4 md:px-6 py-3 border-b border-border bg-muted/30 space-y-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <input
                autoFocus
                placeholder="Task title..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickAdd();
                  if (e.key === 'Escape') setShowQuickAdd(false);
                }}
                className="flex-1 px-3 py-2 text-sm rounded-md bg-background border border-border outline-none focus:ring-1 focus:ring-primary/40"
              />
              <FolderSelect
                value={quickFolderId}
                onChange={setQuickFolderId}
                size="md"
              />
              <button
                onClick={handleQuickAdd}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                Add
              </button>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="px-4 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={calendarContainerRef} className="flex-1 p-2 md:p-4 calendar-container overflow-auto min-h-0">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            events={events}
            editable
            selectable
            selectMirror
            dayMaxEvents
            nowIndicator={false}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            height="100%"
            slotLaneClassNames={slotLaneClassNames}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            select={handleDateSelect}
            eventDurationEditable
            eventDidMount={(info) => {
              info.el.dataset.noteId = info.event.id;
              info.el.title = 'Click to edit · Right-click for options';
              info.el.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const newTitle = prompt('Rename task:', info.event.title);
                if (newTitle?.trim()) {
                  updateNote(info.event.id, { title: newTitle.trim() });
                }
              });
              info.el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                setEventMenu({
                  x: e.clientX,
                  y: e.clientY,
                  noteId: info.event.id,
                  title: info.event.title || 'Untitled',
                });
              });
            }}
          />
        </div>
      </div>

      {panelNoteId && (
        <aside className="max-md:fixed max-md:inset-0 max-md:z-50 w-full md:w-[500px] shrink-0 border-l border-border flex flex-col bg-background shadow-lg">
          <Editor
            key={panelNoteId}
            noteId={panelNoteId}
            compact
            onExpand={handleExpand}
            onClose={() => setPanelNoteId(null)}
          />
        </aside>
      )}

      {eventMenu && (
        <ContextMenu
          x={eventMenu.x}
          y={eventMenu.y}
          onClose={() => setEventMenu(null)}
          items={[
            {
              label: 'Archive',
              icon: <Archive size={14} />,
              disabled: !canArchiveEvent(eventMenu.noteId),
              onClick: () => handleArchiveEvent(eventMenu.noteId),
            },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              danger: true,
              onClick: () => {
                setDeleteTarget({ noteId: eventMenu.noteId, title: eventMenu.title });
              },
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete task?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be permanently deleted.`
            : ''
        }
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteEvent}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
