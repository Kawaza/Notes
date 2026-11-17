import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { useStore } from '../store/useStore';
import { useCompanyStore } from '../store/companyStore';
import { parseWorkspaceTaskSelectionId, isWorkspaceTaskSelectionId } from '../types/company';
import { useMyTasksList } from '../hooks/useMyTasksList';
import { dueDateToAllDayStart, isDueDateOverdue } from '../utils/dueDate';
import { defaultCalendarColorForPalette } from '../utils/defaultCalendarColor';
import {
  paintCalendarBlockEventElement,
  resolveCalendarEventStyle,
} from '../utils/themeCalendarColor';
import { resolveActiveLinkedTaskNote, resolveLinkedTaskTitle } from '../utils/linkedTaskResolve';
import { Editor } from './Editor';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { MobileNavButton } from './MobileNavButton';
import { useIsMobile } from '../hooks/useIsMobile';

export function CalendarView({ onOpenNav }: { onOpenNav?: () => void } = {}) {
  const isMobile = useIsMobile();
  const notes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const tasksByFolder = useCompanyStore((s) => s.tasksByFolder);
  const myAssignedTasks = useCompanyStore((s) => s.myAssignedTasks);
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);
  const theme = useStore((s) => s.theme);
  const colorPalette = useStore((s) => s.colorPalette);
  const createNote = useStore((s) => s.createNote);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const selectNote = useStore((s) => s.selectNote);
  const setViewMode = useStore((s) => s.setViewMode);
  const openWorkspaceTask = useStore((s) => s.openWorkspaceTask);
  const myTasks = useMyTasksList();

  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  const [panelNoteId, setPanelNoteId] = useState<string | null>(null);
  const [timeTick, setTimeTick] = useState(0);
  const [eventMenu, setEventMenu] = useState<{ x: number; y: number; noteId: string; title: string } | null>(null);
  const [confirmRemoveBlock, setConfirmRemoveBlock] = useState<{ noteId: string; title: string } | null>(null);

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
      const el = calendarContainerRef.current?.querySelector<HTMLElement>(
        `[data-note-id="${CSS.escape(eventId)}"]`,
      );
      if (el) paintCalendarBlockEventElement(el, style);
    },
    [notes, isDark, colorPalette],
  );

  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const timeBlockEvents = useMemo(() => {
    return notes
      .filter((n) => {
        if (!n.isCalendarBlock || !n.scheduledAt) return false;
        if (!n.linkedTaskId) return true;
        return Boolean(
          resolveActiveLinkedTaskNote(
            n.linkedTaskId,
            notes,
            tasksByFolder,
            myAssignedTasks,
            folders,
            foldersByCompany,
          ),
        );
      })
      .map((n) => {
        const title = n.linkedTaskId
          ? resolveLinkedTaskTitle(
              n.linkedTaskId,
              notes,
              tasksByFolder,
              myAssignedTasks,
              folders,
              foldersByCompany,
            )
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
          display: 'block',
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          textColor: style.textColor,
          classNames: ['fc-calendar-time-block'],
        };
      });
  }, [notes, folders, tasksByFolder, myAssignedTasks, foldersByCompany, isDark, colorPalette]);

  const dueTaskEvents = useMemo(() => {
    const overdueStyle = isDark
      ? {
          backgroundColor: 'rgba(248, 113, 113, 0.22)',
          borderColor: 'rgba(248, 113, 113, 0.55)',
          textColor: '#fecaca',
        }
      : {
          backgroundColor: 'rgba(254, 202, 202, 0.85)',
          borderColor: 'rgba(239, 68, 68, 0.55)',
          textColor: '#7f1d1d',
        };
    const dueStyle = isDark
      ? {
          backgroundColor: 'rgba(251, 191, 36, 0.2)',
          borderColor: 'rgba(251, 191, 36, 0.5)',
          textColor: '#fde68a',
        }
      : {
          backgroundColor: 'rgba(253, 230, 138, 0.9)',
          borderColor: 'rgba(217, 119, 6, 0.45)',
          textColor: '#78350f',
        };

    return myTasks
      .filter((note) => {
        const due = note.workspaceTaskMeta?.dueAt ?? note.personalTaskMeta?.dueAt;
        if (!due) return false;
        const status = note.workspaceTaskMeta?.status ?? note.personalTaskMeta?.status;
        if (status === 'complete') return false;
        return true;
      })
      .map((note) => {
        const due = (note.workspaceTaskMeta?.dueAt ?? note.personalTaskMeta?.dueAt)!;
        const title = note.title?.trim() || 'Untitled task';
        const isWs = Boolean(note.workspaceTaskMeta);
        const rawTaskId =
          isWs && isWorkspaceTaskSelectionId(note.id)
            ? (parseWorkspaceTaskSelectionId(note.id)?.taskId ?? note.id)
            : note.id;
        const id = isWs ? `due-ws-${rawTaskId}` : `due-p-${note.id}`;
        const palette = isDueDateOverdue(due) ? overdueStyle : dueStyle;
        return {
          id,
          title: `Due: ${title}`,
          start: dueDateToAllDayStart(due),
          allDay: true,
          editable: false,
          durationEditable: false,
          ...palette,
          extendedProps: { kind: 'due-task' as const },
        };
      });
  }, [myTasks, isDark]);

  const events = useMemo(
    () => [...dueTaskEvents, ...timeBlockEvents],
    [dueTaskEvents, timeBlockEvents],
  );

  const isDueTaskEventId = (id: string) => id.startsWith('due-ws-') || id.startsWith('due-p-');

  const handleEventClick = (info: EventClickArg) => {
    const id = info.event.id;
    if (id.startsWith('due-ws-')) {
      const taskId = id.slice('due-ws-'.length);
      const hit =
        myAssignedTasks.find((t) => t.id === taskId) ??
        Object.values(tasksByFolder)
          .flat()
          .find((t) => t.id === taskId);
      if (hit) openWorkspaceTask(hit.id, hit.folderId);
      return;
    }
    if (id.startsWith('due-p-')) {
      const noteId = id.slice('due-p-'.length);
      selectNote(noteId);
      setViewMode('notes');
      return;
    }
    setPanelNoteId(id);
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
    if (isDueTaskEventId(info.event.id)) {
      info.revert();
      return;
    }
    updateNote(info.event.id, {
      scheduledAt: info.event.start?.toISOString(),
      scheduledEnd: info.event.end?.toISOString(),
    });
    applyEventColors(info.event.id);
  };

  const handleEventResize = (info: EventResizeDoneArg) => {
    if (isDueTaskEventId(info.event.id)) {
      info.revert();
      return;
    }
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

  /** Drops the time block only; linked task is untouched. */
  const removeFromCalendar = (noteId: string) => {
    deleteNote(noteId);
    if (panelNoteId === noteId) {
      setPanelNoteId(null);
    }
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
                Due tasks show at the top of each day · Drag blocks to book time · Right-click a block to remove
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
            allDaySlot
            allDayText="Tasks"
            eventOrder="start,-title"
            height="100%"
            slotLaneClassNames={slotLaneClassNames}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventDragStop={(info) => applyEventColors(info.event.id)}
            eventDurationEditable
            eventClassNames={(arg) => {
              const id = arg.event.id ?? '';
              if (isDueTaskEventId(id)) return ['fc-event-due-task'];
              if (!arg.event.allDay) return ['fc-calendar-time-block'];
              return [];
            }}
            eventDidMount={(info) => {
              const dueTask = isDueTaskEventId(info.event.id);
              if (!dueTask) {
                info.el.dataset.noteId = info.event.id;
                const block = notes.find((n) => n.id === info.event.id);
                const style = block
                  ? resolveCalendarEventStyle(
                      block.calendarColor ?? defaultCalendarColorForPalette(colorPalette),
                      isDark,
                      colorPalette,
                    )
                  : {
                      backgroundColor: info.event.backgroundColor ?? '',
                      borderColor: info.event.borderColor ?? '',
                      textColor: info.event.textColor ?? '',
                    };
                if (style.backgroundColor && style.borderColor) {
                  paintCalendarBlockEventElement(info.el, style);
                }
              }
              info.el.title = dueTask ? 'Click to open task' : 'Click to edit · Right-click to remove';
              info.el.addEventListener('dblclick', (e) => {
                if (dueTask) return;
                e.stopPropagation();
                const block = notes.find((n) => n.id === info.event.id);
                if (!block) return;
                const current =
                  block.linkedTaskId
                    ? resolveLinkedTaskTitle(
                        block.linkedTaskId,
                        notes,
                        tasksByFolder,
                        myAssignedTasks,
                        folders,
                        foldersByCompany,
                      )
                    : block.title || 'Planning';
                const newTitle = prompt('Rename block label (unlink to edit linked task title):', current);
                if (!newTitle?.trim() || block.linkedTaskId) return;
                updateNote(info.event.id, { title: newTitle.trim() });
              });
              info.el.addEventListener('contextmenu', (e) => {
                if (dueTask) return;
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
              label: 'Remove',
              danger: true,
              onClick: () => {
                setConfirmRemoveBlock({
                  noteId: eventMenu.noteId,
                  title: eventMenu.title,
                });
                setEventMenu(null);
              },
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!confirmRemoveBlock}
        title="Remove from calendar?"
        message={
          confirmRemoveBlock
            ? `"${confirmRemoveBlock.title}" will be removed from the calendar. Any linked task stays in My Tasks.`
            : ''
        }
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (confirmRemoveBlock) removeFromCalendar(confirmRemoveBlock.noteId);
        }}
        onClose={() => setConfirmRemoveBlock(null)}
      />
    </div>
  );
}
