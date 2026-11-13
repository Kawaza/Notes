import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { Trash2, Archive } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useCompanyStore } from '../store/companyStore';
import { defaultCalendarColorForPalette } from '../utils/defaultCalendarColor';
import { resolveCalendarEventStyle } from '../utils/themeCalendarColor';
import { resolveLinkedTaskTitle } from '../utils/linkedTaskResolve';
import { Editor } from './Editor';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { MobileNavButton } from './MobileNavButton';
import { useIsMobile } from '../hooks/useIsMobile';

export function CalendarView({ onOpenNav }: { onOpenNav?: () => void } = {}) {
  const isMobile = useIsMobile();
  const notes = useStore((s) => s.notes);
  const tasksByFolder = useCompanyStore((s) => s.tasksByFolder);
  const myAssignedTasks = useCompanyStore((s) => s.myAssignedTasks);
  const theme = useStore((s) => s.theme);
  const colorPalette = useStore((s) => s.colorPalette);
  const createNote = useStore((s) => s.createNote);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const selectNote = useStore((s) => s.selectNote);
  const setViewMode = useStore((s) => s.setViewMode);

  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  const [panelNoteId, setPanelNoteId] = useState<string | null>(null);
  const [timeTick, setTimeTick] = useState(0);
  const [eventMenu, setEventMenu] = useState<{ x: number; y: number; noteId: string; title: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ noteId: string; title: string } | null>(null);

  const isDark = theme === 'dark';

  const applyEventColors = useCallback(
    (eventId: string) => {
      const block = notes.find((n) => n.id === eventId);
      if (!block) return;
      const api = calendarRef.current?.getApi();
      const ev = api?.getEventById(eventId);
      if (!ev) return;
      const style = resolveCalendarEventStyle(block.calendarColor, isDark, colorPalette);
      ev.setProp('backgroundColor', style.backgroundColor);
      ev.setProp('borderColor', style.borderColor);
      ev.setProp('textColor', style.textColor);
    },
    [notes, isDark, colorPalette],
  );

  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const events = useMemo(() => {
    return notes
      .filter((n) => n.isCalendarBlock && n.scheduledAt)
      .map((n) => {
        const title = n.linkedTaskId
          ? resolveLinkedTaskTitle(n.linkedTaskId, notes, tasksByFolder, myAssignedTasks)
          : n.title || 'Untitled';
        const style = resolveCalendarEventStyle(
          n.calendarColor ?? defaultCalendarColorForPalette(colorPalette),
          isDark,
          colorPalette,
        );
        return {
          id: n.id,
          title: title || 'Untitled',
          start: n.scheduledAt!,
          end: n.scheduledEnd || undefined,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          textColor: style.textColor,
        };
      });
  }, [notes, tasksByFolder, myAssignedTasks, isDark, colorPalette]);

  const handleEventClick = (info: EventClickArg) => {
    setPanelNoteId(info.event.id);
  };

  const handleDateSelect = (info: DateSelectArg) => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.unselect();

    const noteId = createNote(null, 'Planning', { keepView: true, calendarBlock: true });
    updateNote(noteId, {
      scheduledAt: info.start.toISOString(),
      scheduledEnd: info.end?.toISOString(),
      isTask: false,
      isCalendarBlock: true,
      folderId: null,
      linkedTaskId: null,
      calendarColor: defaultCalendarColorForPalette(colorPalette),
    });
    setPanelNoteId(noteId);
  };

  const handleEventDrop = (info: EventDropArg) => {
    updateNote(info.event.id, {
      scheduledAt: info.event.start?.toISOString(),
      scheduledEnd: info.event.end?.toISOString(),
    });
    applyEventColors(info.event.id);
  };

  const handleEventResize = (info: EventResizeDoneArg) => {
    updateNote(info.event.id, {
      scheduledAt: info.event.start?.toISOString(),
      scheduledEnd: info.event.end?.toISOString(),
    });
    applyEventColors(info.event.id);
  };

  const handleExpand = () => {
    if (!panelNoteId) return;
    const block = notes.find((n) => n.id === panelNoteId);
    const target = block?.linkedTaskId ?? panelNoteId;
    selectNote(target);
    setViewMode('notes');
    setPanelNoteId(null);
  };

  const removeFromCalendar = (noteId: string) => {
    deleteNote(noteId);
    if (panelNoteId === noteId) {
      setPanelNoteId(null);
    }
  };

  const confirmDeleteEvent = () => {
    if (!deleteTarget) return;
    const block = notes.find((n) => n.id === deleteTarget.noteId);
    if (block?.linkedTaskId) {
      deleteNote(block.linkedTaskId);
    }
    deleteNote(deleteTarget.noteId);
    if (panelNoteId === deleteTarget.noteId) {
      setPanelNoteId(null);
    }
    setDeleteTarget(null);
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
                Drag on the calendar to book time · Link blocks to tasks (same task can appear many times) ·
                Right-click to remove a block
              </p>
            </div>
          </div>
        </div>

        <div ref={calendarContainerRef} className="flex-1 p-1 md:p-4 calendar-container overflow-auto min-h-0">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
            headerToolbar={
              isMobile
                ? {
                    left: 'prev,next',
                    center: 'title',
                    right: 'today,listWeek,dayGridMonth',
                  }
                : {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                  }
            }
            events={events}
            editable
            selectable
            selectMirror
            select={handleDateSelect}
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
            eventDragStop={(info) => applyEventColors(info.event.id)}
            eventDurationEditable
            eventDidMount={(info) => {
              info.el.dataset.noteId = info.event.id;
              info.el.title = 'Click to edit · Right-click for options';
              info.el.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const block = notes.find((n) => n.id === info.event.id);
                if (!block) return;
                const current =
                  block.linkedTaskId
                    ? resolveLinkedTaskTitle(block.linkedTaskId, notes, tasksByFolder, myAssignedTasks)
                    : block.title || 'Planning';
                const newTitle = prompt('Rename block label (unlink to edit linked task title):', current);
                if (!newTitle?.trim() || block.linkedTaskId) return;
                updateNote(info.event.id, { title: newTitle.trim() });
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
            calendarBlockMode
            onExpand={handleExpand}
            onClose={() => setPanelNoteId(null)}
            onActiveNoteIdChange={(id) => setPanelNoteId(id || null)}
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
              label: 'Remove from calendar',
              icon: <Archive size={14} />,
              onClick: () => {
                removeFromCalendar(eventMenu.noteId);
                setEventMenu(null);
              },
            },
            {
              label: 'Delete block',
              icon: <Trash2 size={14} />,
              danger: true,
              onClick: () => {
                setDeleteTarget({ noteId: eventMenu.noteId, title: eventMenu.title });
                setEventMenu(null);
              },
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete block?"
        message={
          deleteTarget
            ? (() => {
                const block = notes.find((n) => n.id === deleteTarget.noteId);
                if (block?.linkedTaskId) {
                  return `"${deleteTarget.title}" and its linked task will be permanently deleted.`;
                }
                return `"${deleteTarget.title}" will be permanently deleted.`;
              })()
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
