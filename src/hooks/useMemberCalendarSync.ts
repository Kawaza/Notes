import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useStore } from '../store/useStore';
import { useMemberCalendarStore } from '../store/memberCalendarStore';
import { isSyncAvailable } from '../sync/cloudSync';
import { subscribeMemberCalendarBlocks } from '../sync/memberCalendarRealtime';

/** Backfill own calendar blocks to coworkers + live updates when others edit your calendar. */
export function useMemberCalendarSync(enabled: boolean) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const hydrated = useStore((s) => s.hydrated);
  const viewUserId = useMemberCalendarStore((s) => s.viewUserId);
  const backfilled = useRef(false);

  useEffect(() => {
    if (!enabled || !userId || !hydrated || !isSyncAvailable()) return;
    if (backfilled.current) return;
    backfilled.current = true;
    const calendarNotes = useStore
      .getState()
      .notes.filter((n) => n.isCalendarBlock && n.scheduledAt);
    void useMemberCalendarStore.getState().syncAllLocalCalendarBlocks(userId, calendarNotes);
  }, [enabled, userId, hydrated]);

  useEffect(() => {
    if (!enabled || !userId || !isSyncAvailable()) return;

    return subscribeMemberCalendarBlocks(userId, {
      onUpsert: (block) => {
        useMemberCalendarStore.getState().applyRemoteToLocal(block);
        const view = useMemberCalendarStore.getState().viewUserId;
        if (view === userId) {
          void useMemberCalendarStore.getState().loadBlocksForUser(userId);
        }
      },
      onDelete: (id) => {
        useMemberCalendarStore.getState().removeRemoteFromLocal(id);
        if (useMemberCalendarStore.getState().viewUserId === userId) {
          useMemberCalendarStore.setState((s) => ({
            blocksByUser: {
              ...s.blocksByUser,
              [userId]: (s.blocksByUser[userId] ?? []).filter((b) => b.id !== id),
            },
          }));
        }
      },
    });
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || !viewUserId || viewUserId === userId) return;
    void useMemberCalendarStore.getState().loadBlocksForUser(viewUserId);

    return subscribeMemberCalendarBlocks(viewUserId, {
      onUpsert: (block) => {
        useMemberCalendarStore.setState((s) => ({
          blocksByUser: {
            ...s.blocksByUser,
            [viewUserId]: upsertInList(s.blocksByUser[viewUserId] ?? [], block),
          },
        }));
      },
      onDelete: (id) => {
        useMemberCalendarStore.setState((s) => ({
          blocksByUser: {
            ...s.blocksByUser,
            [viewUserId]: (s.blocksByUser[viewUserId] ?? []).filter((b) => b.id !== id),
          },
        }));
      },
    });
  }, [enabled, viewUserId, userId]);
}

function upsertInList(list: import('../types/memberCalendar').MemberCalendarBlock[], block: import('../types/memberCalendar').MemberCalendarBlock) {
  const idx = list.findIndex((b) => b.id === block.id);
  const next = idx >= 0 ? list.map((b, i) => (i === idx ? block : b)) : [...list, block];
  next.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  return next;
}