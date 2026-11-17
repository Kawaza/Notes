import type { Note } from '../types';
import type { MemberCalendarBlock, MemberCalendarBlockPatch } from '../types/memberCalendar';

export function mapMemberCalendarRow(row: Record<string, unknown>): MemberCalendarBlock {
  return {
    id: row.id as string,
    ownerUserId: row.owner_user_id as string,
    title: (row.title as string) ?? 'Planning',
    content: (row.content as string) ?? '',
    contentType: (row.content_type as 'html' | 'markdown') ?? 'html',
    scheduledAt: row.scheduled_at as string,
    scheduledEnd: (row.scheduled_end as string) ?? undefined,
    calendarColor: (row.calendar_color as string) ?? undefined,
    linkedTaskId: (row.linked_task_id as string) ?? null,
    order: (row.sort_order as number) ?? 0,
    updatedAt: row.updated_at as string,
    createdAt: row.created_at as string,
  };
}

export function memberCalendarBlockToNote(block: MemberCalendarBlock): Note {
  return {
    id: block.id,
    folderId: null,
    title: block.title,
    content: block.content,
    contentType: block.contentType,
    tags: [],
    pinned: false,
    attachments: [],
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    scheduledAt: block.scheduledAt,
    scheduledEnd: block.scheduledEnd,
    isTask: false,
    order: block.order,
    calendarColor: block.calendarColor,
    isCalendarBlock: true,
    linkedTaskId: block.linkedTaskId ?? null,
  };
}

export function noteToMemberCalendarRow(
  note: Note,
  ownerUserId: string,
): Record<string, unknown> | null {
  if (!note.isCalendarBlock || !note.scheduledAt) return null;
  return {
    id: note.id,
    owner_user_id: ownerUserId,
    title: note.title || 'Planning',
    content: note.content ?? '',
    content_type: note.contentType ?? 'html',
    scheduled_at: note.scheduledAt,
    scheduled_end: note.scheduledEnd ?? null,
    calendar_color: note.calendarColor ?? null,
    linked_task_id: note.linkedTaskId ?? null,
    sort_order: note.order ?? 0,
    updated_at: note.updatedAt,
    created_at: note.createdAt,
  };
}

export function patchToMemberCalendarRow(
  patch: MemberCalendarBlockPatch,
): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.contentType !== undefined) row.content_type = patch.contentType;
  if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt;
  if (patch.scheduledEnd !== undefined) row.scheduled_end = patch.scheduledEnd;
  if (patch.calendarColor !== undefined) row.calendar_color = patch.calendarColor;
  if (patch.linkedTaskId !== undefined) row.linked_task_id = patch.linkedTaskId;
  if (patch.order !== undefined) row.sort_order = patch.order;
  return row;
}

export function notePatchToMemberCalendarPatch(
  updates: Partial<Note>,
): MemberCalendarBlockPatch | null {
  const patch: MemberCalendarBlockPatch = {};
  let touched = false;
  if (updates.title !== undefined) {
    patch.title = updates.title;
    touched = true;
  }
  if (updates.content !== undefined) {
    patch.content = updates.content;
    touched = true;
  }
  if (updates.contentType !== undefined) {
    patch.contentType = updates.contentType;
    touched = true;
  }
  if (updates.scheduledAt !== undefined) {
    patch.scheduledAt = updates.scheduledAt;
    touched = true;
  }
  if (updates.scheduledEnd !== undefined) {
    patch.scheduledEnd = updates.scheduledEnd;
    touched = true;
  }
  if (updates.calendarColor !== undefined) {
    patch.calendarColor = updates.calendarColor;
    touched = true;
  }
  if (updates.linkedTaskId !== undefined) {
    patch.linkedTaskId = updates.linkedTaskId;
    touched = true;
  }
  if (updates.order !== undefined) {
    patch.order = updates.order;
    touched = true;
  }
  return touched ? patch : null;
}