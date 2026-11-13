import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  format,
  isThisWeek,
  isToday,
} from 'date-fns';
import { Search } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useCompanyStore } from '../store/companyStore';
import type { Note } from '../types';
import { WORKSPACE_TASK_STATUS_LABELS } from '../types/company';
import { WORKSPACE_TASK_STATUS_STYLES } from '../constants/workspaceTaskStatusStyles';
import { useMyTasksList, compareMyTasks } from '../hooks/useMyTasksList';
import { MobileNavButton } from './MobileNavButton';
import { Editor } from './Editor';
import { useIsMobile } from '../hooks/useIsMobile';

type TasksTab = 'open' | 'overdue';

type DueBucket = 'overdue' | 'today' | 'week' | 'later' | 'none';

const BUCKET_ORDER: DueBucket[] = ['overdue', 'today', 'week', 'later', 'none'];

const BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  none: 'No due date',
};

const BUCKET_HEADER_CLASS: Record<DueBucket, string> = {
  overdue: 'text-red-400',
  today: 'text-amber-400',
  week: 'text-muted-foreground',
  later: 'text-muted-foreground',
  none: 'text-muted-foreground',
};

function isTaskComplete(note: Note): boolean {
  return note.workspaceTaskMeta?.status === 'complete';
}

function taskDueAt(note: Note): string | undefined {
  return note.workspaceTaskMeta?.dueAt ?? note.scheduledAt;
}

function isTaskOverdue(note: Note, now = Date.now()): boolean {
  const due = taskDueAt(note);
  if (!due) return false;
  return new Date(due).getTime() < now;
}

function dueBucket(note: Note, now: Date): DueBucket {
  const dueRaw = taskDueAt(note);
  if (!dueRaw) return 'none';
  const due = new Date(dueRaw);
  if (isTaskOverdue(note, now.getTime())) return 'overdue';
  if (isToday(due)) return 'today';
  if (isThisWeek(due, { weekStartsOn: 0 })) return 'week';
  return 'later';
}

function taskLocationLine(
  note: Note,
  companies: { id: string; name: string }[],
  foldersByCompany: Record<string, { id: string; name: string; companyId: string }[]>,
  personalFolderName: string | null,
): string {
  if (note.workspaceTaskMeta) {
    const company = companies.find((c) => c.id === note.workspaceTaskMeta!.companyId);
    let folderName: string | null = null;
    for (const list of Object.values(foldersByCompany)) {
      const hit = list.find((f) => f.id === note.workspaceTaskMeta!.rawFolderId);
      if (hit) {
        folderName = hit.name;
        break;
      }
    }
    if (company && folderName) return `${company.name} / ${folderName}`;
    return folderName ?? company?.name ?? 'Workspace';
  }
  return personalFolderName ?? 'Personal';
}

function matchesSearch(note: Note, query: string, locationLine: string, companies: { name: string }[]): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const plain = note.content.replace(/<[^>]+>/g, ' ').toLowerCase();
  const companyHit = companies.some((c) => c.name.toLowerCase().includes(q));
  return (
    (note.title || '').toLowerCase().includes(q) ||
    plain.includes(q) ||
    locationLine.toLowerCase().includes(q) ||
    (companyHit && Boolean(note.workspaceTaskMeta))
  );
}

function dueLine(note: Note, now: number): { text: string; className: string } | null {
  const dueRaw = taskDueAt(note);
  if (!dueRaw) return null;
  const due = new Date(dueRaw);
  const overdue = due.getTime() < now;
  if (overdue) {
    return {
      text: `Overdue ${format(due, 'MMM d, yyyy')}`,
      className: 'text-red-400',
    };
  }
  return {
    text: `Due ${format(due, 'MMM d, yyyy')}${isToday(due) ? `, ${format(due, 'h:mm a')}` : ''}`,
    className: isToday(due) ? 'text-amber-400/90' : 'text-muted-foreground',
  };
}

function TaskRow({
  note,
  selected,
  locationLine,
  onSelect,
}: {
  note: Note;
  selected: boolean;
  locationLine: string;
  onSelect: () => void;
}) {
  const taskMeta = note.workspaceTaskMeta;
  const now = Date.now();
  const due = dueLine(note, now);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left flex py-3.5 px-4 transition-colors cursor-pointer border-l-2 ${
        selected
          ? 'border-l-primary bg-primary/10'
          : 'border-l-transparent hover:bg-muted/40'
      }`}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <span className="block text-sm font-medium leading-snug line-clamp-2 pr-1">
          {note.title || 'Untitled'}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-relaxed">
          {taskMeta && (
            <span
              className={`inline-flex rounded-md px-2 py-0.5 font-medium ${WORKSPACE_TASK_STATUS_STYLES[taskMeta.status]}`}
            >
              {WORKSPACE_TASK_STATUS_LABELS[taskMeta.status]}
            </span>
          )}
          <span className="text-muted-foreground truncate">{locationLine}</span>
        </div>
        {due && <p className={`text-[11px] leading-relaxed ${due.className}`}>{due.text}</p>}
      </div>
    </button>
  );
}

export function MyTasksView({ onOpenNav }: { onOpenNav?: () => void } = {}) {
  const isMobile = useIsMobile();
  const tasks = useMyTasksList();
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const selectNote = useStore((s) => s.selectNote);
  const folders = useStore((s) => s.folders);
  const companies = useCompanyStore((s) => s.companies);
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);
  const loadFolderContent = useCompanyStore((s) => s.loadFolderContent);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TasksTab>('open');

  const openTasks = useMemo(() => tasks.filter((t) => !isTaskComplete(t)), [tasks]);
  const overdueCount = useMemo(
    () => openTasks.filter((t) => isTaskOverdue(t)).length,
    [openTasks],
  );

  const tabTasks = useMemo(() => {
    const base =
      tab === 'overdue' ? openTasks.filter((t) => isTaskOverdue(t)) : openTasks;
    return base
      .filter((note) => {
        const personalFolderName = note.folderId
          ? folders.find((f) => f.id === note.folderId)?.name ?? null
          : null;
        const locationLine = taskLocationLine(
          note,
          companies,
          foldersByCompany,
          personalFolderName,
        );
        return matchesSearch(note, search, locationLine, companies);
      })
      .sort(compareMyTasks);
  }, [openTasks, tab, search, folders, companies, foldersByCompany]);

  const grouped = useMemo(() => {
    if (tab === 'overdue' || search.trim()) {
      return null;
    }
    const now = new Date();
    const map = new Map<DueBucket, Note[]>();
    for (const bucket of BUCKET_ORDER) map.set(bucket, []);
    for (const note of tabTasks) {
      map.get(dueBucket(note, now))!.push(note);
    }
    return BUCKET_ORDER.map((key) => ({
      key,
      items: map.get(key) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [tab, tabTasks, search]);

  const selectTask = (note: Note) => {
    selectNote(note.id);
    if (note.workspaceTaskMeta) {
      void loadFolderContent(note.workspaceTaskMeta.rawFolderId);
    }
  };

  useEffect(() => {
    if (isMobile) return;
    if (selectedNoteId && tabTasks.some((t) => t.id === selectedNoteId)) return;
    if (tabTasks[0]) selectTask(tabTasks[0]);
  }, [tab, search, tabTasks, isMobile, selectedNoteId]);

  const showEditor = Boolean(selectedNoteId) && tabTasks.some((t) => t.id === selectedNoteId);
  const listHidden = isMobile && showEditor;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-background">
      <TasksListPane listHidden={listHidden} showEditor={showEditor && !isMobile}>
        <div className="flex flex-col h-full min-h-0 border-r border-border">
          <div className="px-4 pt-4 pb-3 shrink-0 border-b border-border/60">
            <div className="flex items-center gap-2 mb-1">
              {onOpenNav && <MobileNavButton onClick={onOpenNav} />}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold tracking-tight">My Tasks</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {openTasks.length} open
                  {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
                </p>
              </div>
            </div>
            <div className="relative mt-3">
              <Search
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-muted/20 text-sm outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-0 mt-3 pt-4 border-b border-border/60">
              {(
                [
                  { id: 'open' as const, label: 'Open', count: openTasks.length },
                  { id: 'overdue' as const, label: 'Overdue', count: overdueCount },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 pb-2 text-xs font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
                    tab === t.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label} {t.count}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tabTasks.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {openTasks.length === 0
                  ? 'No open tasks assigned to you.'
                  : 'No tasks match your search.'}
              </p>
            ) : grouped ? (
              grouped.map((group) => (
                <section key={group.key}>
                  <p
                    className={`px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider ${BUCKET_HEADER_CLASS[group.key]}`}
                  >
                    {BUCKET_LABEL[group.key]} {group.items.length}
                  </p>
                  {group.items.map((note) => {
                    const personalFolderName = note.folderId
                      ? folders.find((f) => f.id === note.folderId)?.name ?? null
                      : null;
                    const locationLine = taskLocationLine(
                      note,
                      companies,
                      foldersByCompany,
                      personalFolderName,
                    );
                    return (
                      <TaskRow
                        key={note.id}
                        note={note}
                        selected={selectedNoteId === note.id}
                        locationLine={locationLine}
                        onSelect={() => selectTask(note)}
                      />
                    );
                  })}
                </section>
              ))
            ) : (
              tabTasks.map((note) => {
                const personalFolderName = note.folderId
                  ? folders.find((f) => f.id === note.folderId)?.name ?? null
                  : null;
                const locationLine = taskLocationLine(
                  note,
                  companies,
                  foldersByCompany,
                  personalFolderName,
                );
                return (
                  <TaskRow
                    key={note.id}
                    note={note}
                    selected={selectedNoteId === note.id}
                    locationLine={locationLine}
                    onSelect={() => selectTask(note)}
                  />
                );
              })
            )}
          </div>
        </div>
      </TasksListPane>

      {showEditor ? (
        <aside
          className={`flex flex-col min-h-0 bg-background ${
            isMobile ? 'fixed inset-0 z-50 flex-1' : 'flex-1 min-w-0'
          }`}
        >
          <Editor
            key={selectedNoteId}
            onMobileBack={isMobile ? () => selectNote(null) : undefined}
          />
        </aside>
      ) : (
        !isMobile && (
          <TasksListPane listHidden={false} showEditor flex>
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a task
            </div>
          </TasksListPane>
        )
      )}
    </div>
  );
}

function TasksListPane({
  children,
  listHidden,
  showEditor,
  flex,
}: {
  children: ReactNode;
  listHidden: boolean;
  showEditor: boolean;
  flex?: boolean;
}) {
  return (
    <aside
      className={`flex flex-col min-h-0 bg-background ${
        listHidden ? 'hidden' : showEditor ? 'w-full max-w-md shrink-0' : flex ? 'flex-1' : 'w-full max-w-md shrink-0'
      }`}
    >
      {children}
    </aside>
  );
}
