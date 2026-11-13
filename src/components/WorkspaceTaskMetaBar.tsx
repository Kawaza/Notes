import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { DueDatePicker } from './DueDatePicker';
import type { CompanyMember } from '../types/company';
import {
  WORKSPACE_TASK_STATUSES,
  WORKSPACE_TASK_STATUS_LABELS,
  type WorkspaceTaskStatus,
} from '../types/company';
import type { UserProfile } from '../types/profile';
import { MemberPicker } from './MemberPicker';

const STATUS_DOT: Record<WorkspaceTaskStatus, string> = {
  todo: 'bg-muted-foreground',
  in_progress: 'bg-blue-400',
  on_hold: 'bg-amber-500',
  in_review: 'bg-violet-400',
  complete: 'bg-emerald-500',
};

const STATUS_TEXT: Record<WorkspaceTaskStatus, string> = {
  todo: 'text-muted-foreground',
  in_progress: 'text-blue-400',
  on_hold: 'text-amber-500',
  in_review: 'text-violet-400',
  complete: 'text-emerald-500',
};

const PILL =
  'inline-flex items-center gap-1.5 h-8 rounded-lg border border-border/70 bg-muted/25 text-xs shrink-0 max-w-full';

function StatusPicker({
  value,
  onChange,
}: {
  value: WorkspaceTaskStatus;
  onChange: (status: WorkspaceTaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${PILL} pl-2.5 pr-2 min-w-[8.25rem]`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full min-w-0 text-left cursor-pointer"
      >
        <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[value]}`} aria-hidden />
        <span className={`truncate font-medium flex-1 ${STATUS_TEXT[value]}`}>
          {WORKSPACE_TASK_STATUS_LABELS[value]}
        </span>
        <ChevronDown size={12} className="shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[10.5rem] py-1 rounded-lg border border-border bg-background shadow-lg">
          {WORKSPACE_TASK_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer ${
                value === s ? 'text-primary font-medium' : 'text-foreground'
              }`}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[s]}`} />
              {WORKSPACE_TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface WorkspaceTaskMetaBarProps {
  assigneeId: string | null;
  status: WorkspaceTaskStatus;
  dueAt?: string;
  members: CompanyMember[];
  profilesByUserId: Record<string, UserProfile>;
  currentUserId: string | null;
  currentUserProfile?: UserProfile | null;
  updatedAt?: string;
  variant?: 'footer' | 'header';
  assigneeLocked?: boolean;
  onChange: (patch: {
    assigneeId?: string | null;
    status?: WorkspaceTaskStatus;
    dueAt?: string | null;
  }) => void;
}

export function WorkspaceTaskMetaBar({
  assigneeId,
  status,
  dueAt,
  members,
  profilesByUserId,
  currentUserId,
  currentUserProfile,
  updatedAt,
  variant = 'footer',
  assigneeLocked,
  onChange,
}: WorkspaceTaskMetaBarProps) {
  const isHeader = variant === 'header';

  return (
    <div
      className={
        isHeader
          ? 'px-4 md:px-8 py-3 border-b border-border/50'
          : 'border-t border-border px-4 md:px-8 py-3'
      }
    >
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPicker value={status} onChange={(s) => onChange({ status: s })} />

        <MemberPicker
          value={assigneeId}
          members={members}
          profilesByUserId={profilesByUserId}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onChange={(id) => onChange({ assigneeId: id })}
          placeholder="Assign"
          showAvatar
          compactPill
          menuPlacement="below"
          disabled={assigneeLocked}
          className={PILL + ' px-2.5 min-w-0 max-w-[11rem]'}
        />

        <DueDatePicker dueAt={dueAt} onChange={(iso) => onChange({ dueAt: iso })} />

        {isHeader && updatedAt && (
          <span className="ml-auto text-[11px] text-muted-foreground/80 shrink-0 hidden sm:inline">
            Updated {format(new Date(updatedAt), 'MMM d, h:mm a')}
          </span>
        )}
      </div>
    </div>
  );
}

