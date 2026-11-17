import { Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import { useMemberCalendarStore } from '../store/memberCalendarStore';
import { useWorkspaceCalendarMembers } from '../hooks/useWorkspaceCalendarMembers';
import { MemberPicker } from './MemberPicker';
import { isSyncAvailable } from '../sync/cloudSync';

export function CalendarViewOthersPicker() {
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const viewUserId = useMemberCalendarStore((s) => s.viewUserId);
  const setViewUserId = useMemberCalendarStore((s) => s.setViewUserId);
  const members = useWorkspaceCalendarMembers();
  const profilesByUserId = useCompanyStore((s) => s.profilesByUserId);

  if (!isSyncAvailable() || !currentUserId || members.length === 0) return null;

  const viewingOther = Boolean(viewUserId && viewUserId !== currentUserId);

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Users size={15} className="text-muted-foreground hidden sm:block" />
      <div className="flex flex-col items-end gap-0.5 min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground hidden sm:block">
          View others
        </span>
        <MemberPicker
          value={viewingOther ? viewUserId : null}
          members={members}
          profilesByUserId={profilesByUserId}
          currentUserId={currentUserId}
          onChange={(id) => setViewUserId(id)}
          allowUnassigned
          placeholder="My calendar"
          className="max-w-[min(200px,40vw)]"
        />
      </div>
    </div>
  );
}