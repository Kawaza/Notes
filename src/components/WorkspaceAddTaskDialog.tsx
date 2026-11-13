import { useEffect, useState } from 'react';
import type { CompanyMember } from '../types/company';
import type { UserProfile } from '../types/profile';
import { MemberPicker } from './MemberPicker';

interface WorkspaceAddTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (title: string, assigneeId: string) => void;
  members: CompanyMember[];
  profilesByUserId: Record<string, UserProfile>;
  currentUserId: string | null;
  currentUserProfile?: UserProfile | null;
  /** Personal folders: assignee is always you. */
  soloAssignee?: boolean;
}

export function WorkspaceAddTaskDialog({
  open,
  onClose,
  onSave,
  members,
  profilesByUserId,
  currentUserId,
  currentUserProfile,
  soloAssignee,
}: WorkspaceAddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    const defaultId =
      currentUserId && members.some((m) => m.userId === currentUserId)
        ? currentUserId
        : (members[0]?.userId ?? null);
    setAssigneeId(defaultId);
  }, [open, members, currentUserId]);

  if (!open) return null;

  const effectiveAssignee = soloAssignee ? currentUserId : assigneeId;
  const canSave = title.trim().length > 0 && Boolean(effectiveAssignee);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl p-5"
        role="dialog"
        aria-labelledby="add-workspace-task-title"
      >
        <h2 id="add-workspace-task-title" className="text-lg font-semibold">
          Add task
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {soloAssignee ? 'This task is assigned to you.' : 'Assign to someone on this workspace.'}
        </p>

        <label className="block mt-4 text-xs font-medium text-muted-foreground">Title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave && effectiveAssignee) {
              onSave(title.trim(), effectiveAssignee);
              onClose();
            }
          }}
        />

        {!soloAssignee && (
          <>
            <p className="mt-4 text-xs font-medium text-muted-foreground">Assign to</p>
            <div className="mt-2">
              <MemberPicker
                value={assigneeId}
                members={members}
                profilesByUserId={profilesByUserId}
                currentUserId={currentUserId}
                currentUserProfile={currentUserProfile}
                onChange={setAssigneeId}
                allowUnassigned={false}
                placeholder="Choose teammate"
                className="w-full"
                menuPlacement="below"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg hover:bg-muted cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => {
              if (!canSave || !effectiveAssignee) return;
              onSave(title.trim(), effectiveAssignee);
              onClose();
            }}
            className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-40 cursor-pointer"
          >
            Create task
          </button>
        </div>
      </div>
    </div>
  );
}
