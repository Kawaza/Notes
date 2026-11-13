import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ClipboardList } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useCompanyStore } from '../store/companyStore';
import { isFolderArchived } from '../types';
import { workspaceTaskSelectionId } from '../types/company';
import type { Note } from '../types';

type CalendarTaskLinkSelectProps = {
  note: Note;
  onLinkTask: (taskSelectionId: string) => void;
  onClearLink: () => void;
  size?: 'sm' | 'md';
  className?: string;
};

type MenuPosition = { top: number; left: number; minWidth: number };

const MENU_GAP = 4;

function estimateMenuHeight(count: number) {
  return (count + 2) * 32 + 12;
}

export function CalendarTaskLinkSelect({
  note,
  onLinkTask,
  onClearLink,
  size = 'md',
  className = '',
}: CalendarTaskLinkSelectProps) {
  const notes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const myAssignedTasks = useCompanyStore((s) => s.myAssignedTasks);
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);

  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const personalTasks = useMemo(
    () =>
      notes
        .filter((n) => {
          if (!n.isTask || n.isCalendarBlock || n.id === note.id) return false;
          if (n.folderId) {
            const folder = folders.find((f) => f.id === n.folderId);
            if (isFolderArchived(folder)) return false;
          }
          return true;
        })
        .sort((a, b) => (a.title || '').localeCompare(b.title || '')),
    [notes, folders, note.id],
  );

  const workspaceTasks = useMemo(
    () =>
      myAssignedTasks
        .filter((t) => !t.archived)
        .map((t) => {
          let folderLabel = 'Company';
          for (const list of Object.values(foldersByCompany)) {
            const hit = list.find((f) => f.id === t.folderId);
            if (hit) {
              folderLabel = hit.name;
              break;
            }
          }
          return {
            id: workspaceTaskSelectionId(t.id),
            title: t.title || 'Untitled task',
            content: t.content,
            contentType: t.contentType,
            folderLabel,
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title)),
    [myAssignedTasks, foldersByCompany],
  );

  const linkedId = note.linkedTaskId ?? null;

  const selectedLabel = useMemo(() => {
    if (!linkedId) return 'No folder';
    if (workspaceTasks.some((t) => t.id === linkedId)) {
      return workspaceTasks.find((t) => t.id === linkedId)!.title;
    }
    const hit = personalTasks.find((t) => t.id === linkedId);
    return hit?.title ?? 'Linked task';
  }, [linkedId, workspaceTasks, personalTasks]);

  const itemCount = personalTasks.length + workspaceTasks.length;

  const computeMenuPosition = () => {
    const el = rootRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? estimateMenuHeight(itemCount);
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const spaceAbove = rect.top - MENU_GAP;
    const openAbove = menuHeight > spaceBelow && spaceAbove >= spaceBelow;
    return {
      top: openAbove ? rect.top - MENU_GAP - menuHeight : rect.bottom + MENU_GAP,
      left: rect.left,
      minWidth: rect.width,
    };
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const pos = computeMenuPosition();
      if (pos) setMenuPos(pos);
    };
    update();
    const raf = requestAnimationFrame(update);
    const onReposition = () => update();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, itemCount]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const timeoutId = window.setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const sizeClass =
    size === 'sm'
      ? 'h-6 px-1.5 text-xs gap-1 min-w-[88px] max-w-[140px]'
      : 'h-7 px-2 text-[13px] gap-1.5 min-w-[108px] max-w-[168px]';

  const chevronSize = size === 'sm' ? 11 : 12;

  const menu =
    open &&
    createPortal(
      <div
        ref={menuRef}
        className="fixed z-[100] py-1 rounded-lg border border-border bg-background shadow-lg max-h-[min(320px,50vh)] overflow-y-auto"
        style={{
          top: menuPos?.top ?? -9999,
          left: menuPos?.left ?? 0,
          minWidth: menuPos?.minWidth,
          maxWidth: 280,
          visibility: menuPos ? 'visible' : 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => {
            onClearLink();
            setOpen(false);
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
            !linkedId ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
          }`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
          <span className="truncate">No folder — planning only</span>
        </button>
        {(personalTasks.length > 0 || workspaceTasks.length > 0) && (
          <div className="my-1 border-t border-border" />
        )}
        {personalTasks.length > 0 && (
          <p className="px-2.5 pt-1 pb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            My tasks
          </p>
        )}
        {personalTasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => {
              onLinkTask(task.id);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
              linkedId === task.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
            }`}
          >
            <ClipboardList size={12} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{task.title || 'Untitled task'}</span>
          </button>
        ))}
        {workspaceTasks.length > 0 && (
          <p className="px-2.5 pt-2 pb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Company tasks
          </p>
        )}
        {workspaceTasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => {
              onLinkTask(task.id);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
              linkedId === task.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
            }`}
          >
            <ClipboardList size={12} className="shrink-0 text-muted-foreground" />
            <span className="truncate">
              {task.title}
              <span className="text-muted-foreground"> · {task.folderLabel}</span>
            </span>
          </button>
        ))}
      </div>,
      document.body,
    );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors cursor-pointer outline-none focus:ring-inset focus:ring-1 focus:ring-primary/40 ${sizeClass}`}
        title="Link a task or keep as planning only"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${linkedId ? 'bg-primary' : 'bg-muted-foreground/40'}`}
        />
        <span className={`flex-1 truncate text-left ${linkedId ? '' : 'text-muted-foreground'}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={chevronSize}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}
