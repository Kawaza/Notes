import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';
import { getSessionUserId } from './syncUtils';
import type { Note } from '../types';
import type { MemberCalendarBlock, MemberCalendarBlockPatch } from '../types/memberCalendar';
import {
  mapMemberCalendarRow,
  noteToMemberCalendarRow,
  patchToMemberCalendarRow,
} from '../utils/memberCalendarMappers';

export async function fetchMemberCalendarBlocks(ownerUserId: string): Promise<MemberCalendarBlock[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('member_calendar_blocks')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapMemberCalendarRow(row as Record<string, unknown>));
}

export async function upsertMemberCalendarBlockFromNote(
  note: Note,
  ownerUserId: string,
): Promise<void> {
  if (!supabase) return;
  const row = noteToMemberCalendarRow(note, ownerUserId);
  if (!row) return;
  const { error } = await supabase.from('member_calendar_blocks').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertMemberCalendarBlocksFromNotes(
  notes: Note[],
  ownerUserId: string,
): Promise<void> {
  if (!supabase) return;
  const rows = notes
    .map((n) => noteToMemberCalendarRow(n, ownerUserId))
    .filter((r): r is Record<string, unknown> => Boolean(r));
  if (!rows.length) return;
  const { error } = await supabase.from('member_calendar_blocks').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteMemberCalendarBlock(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('member_calendar_blocks').delete().eq('id', id);
  if (error) throw error;
}

export async function createMemberCalendarBlock(
  ownerUserId: string,
  partial: MemberCalendarBlockPatch & {
    scheduledAt: string;
    title?: string;
    id?: string;
  },
): Promise<MemberCalendarBlock> {
  if (!supabase) throw new Error('Sync not configured');
  await getSessionUserId();
  const now = new Date().toISOString();
  const id = partial.id ?? uuidv4();
  const row = {
    id,
    owner_user_id: ownerUserId,
    title: partial.title ?? 'Planning',
    content: partial.content ?? '',
    content_type: partial.contentType ?? 'html',
    scheduled_at: partial.scheduledAt,
    scheduled_end: partial.scheduledEnd ?? null,
    calendar_color: partial.calendarColor ?? null,
    linked_task_id: partial.linkedTaskId ?? null,
    sort_order: partial.order ?? 0,
    updated_at: now,
    created_at: now,
  };
  const { data, error } = await supabase
    .from('member_calendar_blocks')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return mapMemberCalendarRow(data as Record<string, unknown>);
}

export async function updateMemberCalendarBlock(
  id: string,
  patch: MemberCalendarBlockPatch,
): Promise<MemberCalendarBlock | null> {
  if (!supabase) return null;
  const row = patchToMemberCalendarRow(patch);
  const { data, error } = await supabase
    .from('member_calendar_blocks')
    .update(row)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapMemberCalendarRow(data as Record<string, unknown>);
}