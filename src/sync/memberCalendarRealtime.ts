import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { MemberCalendarBlock } from '../types/memberCalendar';
import { mapMemberCalendarRow } from '../utils/memberCalendarMappers';

export function subscribeMemberCalendarBlocks(
  ownerUserId: string,
  handlers: {
    onUpsert: (block: MemberCalendarBlock) => void;
    onDelete: (id: string) => void;
  },
): () => void {
  if (!supabase) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`member-calendar:${ownerUserId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'member_calendar_blocks',
        filter: `owner_user_id=eq.${ownerUserId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as { id?: string };
          if (old.id) handlers.onDelete(old.id);
          return;
        }
        const row = payload.new as Record<string, unknown>;
        handlers.onUpsert(mapMemberCalendarRow(row));
      },
    )
    .subscribe();

  return () => {
    if (supabase) void supabase.removeChannel(channel);
  };
}