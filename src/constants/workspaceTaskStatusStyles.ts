import type { WorkspaceTaskStatus } from '../types/company';

export const WORKSPACE_TASK_STATUS_STYLES: Record<WorkspaceTaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/15 text-blue-400',
  on_hold: 'bg-amber-500/15 text-amber-500',
  in_review: 'bg-violet-500/15 text-violet-400',
  complete: 'bg-emerald-500/15 text-emerald-500',
};
