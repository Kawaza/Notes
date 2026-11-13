import { format } from 'date-fns';
import type { CompanyMember } from '../types/company';
import {
  WORKSPACE_TASK_STATUSES,
  WORKSPACE_TASK_STATUS_LABELS,
  type WorkspaceTaskStatus,
} from '../types/company';
import type { UserProfile } from '../types/profile';
import { memberDisplayName } from '../utils/memberDisplayName';

interface WorkspaceTaskPanelProps {
  taskId: string;
  assigneeId: string | null;
  status: WorkspaceTaskStatus;
  dueAt?: string;
  members: CompanyMember[];
  profilesByUserId: Record<string, UserProfile>;
  currentUserId: string | null;
  onChange: (patch: {
    assigneeId?: string | null;
    status?: WorkspaceTaskStatus;
    dueAt?: string | null;
  }) => void;
  compact?: boolean;
}

export function WorkspaceTaskPanel({
  assigneeId,
  status,
  dueAt,
  members,
  profilesByUserId,
  currentUserId,
  onChange,
  compact,
}: WorkspaceTaskPanelProps) {
  const pad = compact ? 'px-4' : 'px-8';
  const dueValue = dueAt ? format(new Date(dueAt), "yyyy-MM-dd'T'HH:mm") : '';

  return (
    <div className={`${pad} py-3 border-b border-border/50 bg-muted/20 space-y-3`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block text-xs">
          <span className="text-muted-foreground font-medium">Assign to</span>
          <select
            value={assigneeId ?? ''}
            onChange={(e) => onChange({ assigneeId: e.target.value || null })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {memberDisplayName(m.userId, profilesByUserId, members, currentUserId)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs">
          <span className="text-muted-foreground font-medium">Status</span>
          <select
            value={status}
            onChange={(e) => onChange({ status: e.target.value as WorkspaceTaskStatus })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            {WORKSPACE_TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {WORKSPACE_TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs">
          <span className="text-muted-foreground font-medium">Deadline</span>
          <input
            type="datetime-local"
            value={dueValue}
            onChange={(e) =>
              onChange({
                dueAt: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
            className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      {assigneeId && (
        <p className="text-xs text-muted-foreground">
          Assigned to{' '}
          <span className="text-foreground font-medium">
            {memberDisplayName(assigneeId, profilesByUserId, members, currentUserId)}
          </span>
        </p>
      )}
    </div>
  );
}
