export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  updatedAt: string;
}

export function profileFullName(profile: Pick<UserProfile, 'firstName' | 'lastName' | 'displayName'>): string {
  const first = profile.firstName?.trim() ?? '';
  const last = profile.lastName?.trim() ?? '';
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  if (profile.displayName?.trim()) return profile.displayName.trim();
  return '';
}

export function profileInitials(profile: Pick<UserProfile, 'firstName' | 'lastName' | 'displayName'>): string {
  const first = profile.firstName?.trim().charAt(0) ?? '';
  const last = profile.lastName?.trim().charAt(0) ?? '';
  if (first || last) return `${first}${last}`.toUpperCase();
  const dn = profile.displayName?.trim() ?? '';
  return (dn.charAt(0) || '?').toUpperCase();
}
