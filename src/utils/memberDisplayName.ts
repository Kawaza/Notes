import type { CompanyMember } from '../types/company';
import type { UserProfile } from '../types/profile';
import { profileFullName } from '../types/profile';

function isEmailLikeHandle(value: string): boolean {
  const v = value.trim();
  if (!v || v.includes(' ')) return false;
  return v.includes('@') || /^[a-z0-9._+-]+$/i.test(v);
}

export function memberDisplayName(
  userId: string,
  profilesByUserId: Record<string, UserProfile>,
  members: CompanyMember[],
  currentUserId: string | null,
  currentUserProfile?: UserProfile | null,
): string {
  if (userId === currentUserId && currentUserProfile) {
    const self = profileFullName(currentUserProfile);
    if (self) return `${self} (you)`;
  }
  const profile = profilesByUserId[userId];
  if (profile) {
    const name = profileFullName(profile);
    if (name) return userId === currentUserId ? `${name} (you)` : name;
  }
  const member = members.find((m) => m.userId === userId);
  if (member?.displayName?.trim()) {
    const n = member.displayName.trim();
    if (!isEmailLikeHandle(n)) {
      return userId === currentUserId ? `${n} (you)` : n;
    }
  }
  if (userId === currentUserId) return 'You';
  return `Member ${userId.slice(0, 8)}…`;
}
