import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Note } from '../types';
import type { MemberCalendarBlock, MemberCalendarBlockPatch } from '../types/memberCalendar';
import {
  createMemberCalendarBlock,
  deleteMemberCalendarBlock,
  fetchMemberCalendarBlocks,
  updateMemberCalendarBlock,
  upsertMemberCalendarBlockFromNote,
} from '../sync/memberCalendarSync';
import {
  memberCalendarBlockToNote,
  notePatchToMemberCalendarPatch,
} from '../utils/memberCalendarMappers';
import { useStore } from './useStore';
import { isSyncAvailable } from '../sync/cloudSync';

type MemberCalendarState = {
  /** null = your calendar */
  viewUserId: string | null;
  blocksByUser: Record<string, MemberCalendarBlock[]>;
  loadingUser: Record<string, boolean>;
  setViewUserId: (userId: string | null) => void;
  resetViewUser: () => void;
  loadBlocksForUser: (userId: string) => Promise<void>;
  getViewCalendarNotes: () => Note[];
  createRemoteBlock: (
    ownerUserId: string,
    partial: MemberCalendarBlockPatch & { scheduledAt: string; title?: string },
  ) => Promise<string>;
  updateRemoteBlock: (
    ownerUserId: string,
    id: string,
    patch: MemberCalendarBlockPatch,
  ) => Promise<void>;
  updateRemoteBlockFromNote: (ownerUserId: string, id: string, updates: Partial<Note>) => Promise<void>;
  deleteRemoteBlock: (ownerUserId: string, id: string) => Promise<void>;
  mirrorNoteIfCalendarBlock: (note: Note, ownerUserId: string) => Promise<void>;
  removeMirror: (id: string) => Promise<void>;
  syncAllLocalCalendarBlocks: (ownerUserId: string, notes: Note[]) => Promise<void>;
  applyRemoteToLocal: (block: MemberCalendarBlock) => void;
  removeRemoteFromLocal: (id: string) => void;
  isViewingOther: (currentUserId: string | null) => boolean;
};

function upsertBlockInMap(
  blocksByUser: Record<string, MemberCalendarBlock[]>,
  block: MemberCalendarBlock,
): Record<string, MemberCalendarBlock[]> {
  const list = blocksByUser[block.ownerUserId] ?? [];
  const idx = list.findIndex((b) => b.id === block.id);
  const next = idx >= 0 ? list.map((b, i) => (i === idx ? block : b)) : [...list, block];
  next.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  return { ...blocksByUser, [block.ownerUserId]: next };
}

function removeBlockFromMap(
  blocksByUser: Record<string, MemberCalendarBlock[]>,
  ownerUserId: string,
  id: string,
): Record<string, MemberCalendarBlock[]> {
  const list = blocksByUser[ownerUserId] ?? [];
  return { ...blocksByUser, [ownerUserId]: list.filter((b) => b.id !== id) };
}

export const useMemberCalendarStore = create<MemberCalendarState>((set, get) => ({
  viewUserId: null,
  blocksByUser: {},
  loadingUser: {},

  setViewUserId: (userId) => {
    set({ viewUserId: userId });
    if (userId) void get().loadBlocksForUser(userId);
  },

  resetViewUser: () => set({ viewUserId: null }),

  loadBlocksForUser: async (userId) => {
    if (!isSyncAvailable()) return;
    set((s) => ({ loadingUser: { ...s.loadingUser, [userId]: true } }));
    try {
      const blocks = await fetchMemberCalendarBlocks(userId);
      set((s) => ({
        blocksByUser: { ...s.blocksByUser, [userId]: blocks },
        loadingUser: { ...s.loadingUser, [userId]: false },
      }));
    } catch (err) {
      console.warn('Failed to load member calendar', err);
      set((s) => ({ loadingUser: { ...s.loadingUser, [userId]: false } }));
    }
  },

  getViewCalendarNotes: () => {
    const { viewUserId, blocksByUser } = get();
    if (!viewUserId) return [];
    return (blocksByUser[viewUserId] ?? []).map(memberCalendarBlockToNote);
  },

  createRemoteBlock: async (ownerUserId, partial) => {
    const id = uuidv4();
    const block = await createMemberCalendarBlock(ownerUserId, { ...partial, id });
    set((s) => ({ blocksByUser: upsertBlockInMap(s.blocksByUser, block) }));
    return block.id;
  },

  updateRemoteBlock: async (_ownerUserId, id, patch) => {
    const saved = await updateMemberCalendarBlock(id, patch);
    if (!saved) return;
    set((s) => ({ blocksByUser: upsertBlockInMap(s.blocksByUser, saved) }));
  },

  updateRemoteBlockFromNote: async (ownerUserId, id, updates) => {
    const patch = notePatchToMemberCalendarPatch(updates);
    if (!patch) return;
    const now = new Date().toISOString();
    set((s) => {
      const list = s.blocksByUser[ownerUserId] ?? [];
      const next = list.map((b) =>
        b.id === id
          ? {
              ...b,
              title: patch.title ?? b.title,
              content: patch.content ?? b.content,
              contentType: patch.contentType ?? b.contentType,
              scheduledAt: patch.scheduledAt ?? b.scheduledAt,
              scheduledEnd: patch.scheduledEnd ?? b.scheduledEnd,
              calendarColor: patch.calendarColor ?? b.calendarColor,
              linkedTaskId:
                patch.linkedTaskId !== undefined ? patch.linkedTaskId : b.linkedTaskId,
              order: patch.order ?? b.order,
              updatedAt: now,
            }
          : b,
      );
      return { blocksByUser: { ...s.blocksByUser, [ownerUserId]: next } };
    });
    await get().updateRemoteBlock(ownerUserId, id, patch);
  },

  deleteRemoteBlock: async (ownerUserId, id) => {
    await deleteMemberCalendarBlock(id);
    set((s) => ({
      blocksByUser: removeBlockFromMap(s.blocksByUser, ownerUserId, id),
    }));
  },

  mirrorNoteIfCalendarBlock: async (note, ownerUserId) => {
    if (!isSyncAvailable() || !note.isCalendarBlock || !note.scheduledAt) return;
    try {
      await upsertMemberCalendarBlockFromNote(note, ownerUserId);
    } catch (err) {
      console.warn('Calendar mirror failed', err);
    }
  },

  removeMirror: async (id) => {
    if (!isSyncAvailable()) return;
    try {
      await deleteMemberCalendarBlock(id);
    } catch (err) {
      console.warn('Calendar mirror delete failed', err);
    }
  },

  syncAllLocalCalendarBlocks: async (ownerUserId, notes) => {
    if (!isSyncAvailable()) return;
    const blocks = notes.filter((n) => n.isCalendarBlock && n.scheduledAt);
    for (const note of blocks) {
      try {
        await upsertMemberCalendarBlockFromNote(note, ownerUserId);
      } catch (err) {
        console.warn('Calendar backfill failed for', note.id, err);
      }
    }
  },

  applyRemoteToLocal: (block) => {
    const note = memberCalendarBlockToNote(block);
    useStore.setState((s) => {
      const existing = s.notes.find((n) => n.id === block.id);
      if (existing) {
        const localTime = new Date(existing.updatedAt).getTime();
        const remoteTime = new Date(block.updatedAt).getTime();
        if (localTime >= remoteTime) return s;
        return {
          notes: s.notes.map((n) =>
            n.id === block.id ? { ...note, order: n.order, attachments: n.attachments } : n,
          ),
        };
      }
      return { notes: [...s.notes, note] };
    });
    void useStore.getState().persistLocal();
  },

  removeRemoteFromLocal: (id) => {
    useStore.setState((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
    }));
    void useStore.getState().persistLocal();
  },

  isViewingOther: (currentUserId) => {
    const view = get().viewUserId;
    return Boolean(view && currentUserId && view !== currentUserId);
  },
}));

export function getForeignCalendarOwnerId(currentUserId: string | null): string | null {
  const view = useMemberCalendarStore.getState().viewUserId;
  if (!view || !currentUserId || view === currentUserId) return null;
  return view;
}