import { useEffect, useMemo } from 'react';
import { useCompanyStore } from '../store/companyStore';
import { useAuthStore } from '../store/authStore';
import type { CompanyMember } from '../types/company';

/** Deduped workspace coworkers for the calendar "View others" menu. */
export function useWorkspaceCalendarMembers(): CompanyMember[] {
  const companies = useCompanyStore((s) => s.companies);
  const membersByCompany = useCompanyStore((s) => s.membersByCompany);
  const loadCompanyMembers = useCompanyStore((s) => s.loadCompanyMembers);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    for (const c of companies) {
      void loadCompanyMembers(c.id);
    }
  }, [companies, loadCompanyMembers]);

  return useMemo(() => {
    const byUser = new Map<string, CompanyMember>();
    for (const c of companies) {
      for (const m of membersByCompany[c.id] ?? []) {
        if (m.userId === currentUserId) continue;
        if (!byUser.has(m.userId)) byUser.set(m.userId, m);
      }
    }
    return [...byUser.values()].sort((a, b) =>
      (a.displayName ?? a.userId).localeCompare(b.displayName ?? b.userId),
    );
  }, [companies, membersByCompany, currentUserId]);
}