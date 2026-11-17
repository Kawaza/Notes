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
    <div className="shrink-0">
      <MemberPicker
        value={viewingOther ? viewUserId : null}
        members={members}
        profilesByUserId={profilesByUserId}
        currentUserId={currentUserId}
        onChange={(id) => setViewUserId(id)}
        allowUnassigned
        clearLabel="My calendar"
        placeholder="My calendar"
        menuPlacement="below"
        menuAlign="right"
        className="max-w-[min(200px,40vw)]"
      />
    </div>
  );
}