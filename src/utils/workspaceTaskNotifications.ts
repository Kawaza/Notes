import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import { useNotificationStore } from '../store/notificationStore';
import type { WorkspaceTask } from '../types/company';
import { memberDisplayName } from './memberDisplayName';

function shouldNotifyAssignment(
  userId: string,
  existing: WorkspaceTask | undefined,
  task: WorkspaceTask,
): boolean {
  if (task.archived || task.assigneeId !== userId) return false;
  if (!existing && task.createdBy === userId) return false;
  if (existing?.assigneeId === userId) return false;
  return true;
}

export function maybeNotifyWorkspaceTaskAssigned(existing: WorkspaceTask | undefined, task: WorkspaceTask) {
  const userId = useAuthStore.getState().user?.id ?? null;
  if (!userId || !shouldNotifyAssignment(userId, existing, task)) return;

  const companyState = useCompanyStore.getState();
  const members = companyState.membersByCompany[task.companyId] ?? [];
  const profiles = companyState.profilesByUserId;
  const profile = useAuthStore.getState().profile;

  const fromUserId = task.createdBy || null;
  const fromLabel =
    fromUserId && fromUserId !== userId
      ? memberDisplayName(fromUserId, profiles, members, userId, profile)
      : 'A teammate';

  useNotificationStore.getState().pushTaskAssigned({
    taskId: task.id,
    folderId: task.folderId,
    taskTitle: task.title,
    fromUserId,
    fromLabel,
  });
}
