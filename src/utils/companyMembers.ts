import type { CompanyMember } from '../types/company';
import type { UserProfile } from '../types/profile';
import { profileFullName } from '../types/profile';

/** Ensure the signed-in user appears in assignee lists when membership fetch is stale. */
export function membersWithCurrentUser(
  members: CompanyMember[],
  companyId: string,
  currentUserId: string | null,
  currentUserProfile?: UserProfile | null,
): CompanyMember[] {
  if (!currentUserId || members.some((m) => m.userId === currentUserId)) return members;
  const displayName = currentUserProfile ? profileFullName(currentUserProfile) || null : null;
  return [
    ...members,
    {
      companyId,
      userId: currentUserId,
      role: 'member',
      displayName,
      joinedAt: new Date().toISOString(),
    },
  ];
}
