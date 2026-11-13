import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { WorkspaceNote } from '../types/company';

export function NoteCollaborationBanner({
  serverNote,
  onLoadTheirs,
  onKeepMine,
  onDismiss,
}: {
  serverNote: WorkspaceNote;
  onLoadTheirs: () => void;
  onKeepMine: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 flex flex-wrap items-center gap-2 text-sm text-foreground">
      <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
      <span className="flex-1 min-w-[12rem]">
        Someone else updated this note while you were editing. Choose which version to keep.
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onLoadTheirs}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-background border border-border hover:bg-muted cursor-pointer"
        >
          <RefreshCw size={13} />
          Load their version
        </button>
        <button
          type="button"
          onClick={onKeepMine}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
        >
          Keep my edits
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted cursor-pointer"
          >
            Later
          </button>
        )}
      </div>
      <span className="sr-only">Server updated at {serverNote.updatedAt}</span>
    </div>
  );
}
