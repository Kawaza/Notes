import type { Editor } from '@tiptap/core';
import { getMarkRange } from '@tiptap/core';

export type NoteCommentReply = {
  id: string;
  text: string;
  authorName: string;
  authorUserId: string | null;
  mentionedUserIds: string | null;
  createdAt: string;
};

export function newCommentReplyId(): string {
  return crypto.randomUUID();
}

export function parseNoteCommentReplies(raw: string | null | undefined): NoteCommentReply[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is NoteCommentReply => {
        if (!r || typeof r !== 'object') return false;
        const item = r as Record<string, unknown>;
        return typeof item.id === 'string' && typeof item.text === 'string';
      })
      .map((r) => ({
        id: r.id,
        text: r.text,
        authorName: typeof r.authorName === 'string' ? r.authorName : 'Teammate',
        authorUserId: typeof r.authorUserId === 'string' ? r.authorUserId : null,
        mentionedUserIds:
          typeof r.mentionedUserIds === 'string' ? r.mentionedUserIds : null,
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function serializeNoteCommentReplies(replies: NoteCommentReply[]): string | null {
  if (replies.length === 0) return null;
  return JSON.stringify(replies);
}

export type NoteCommentMarkAttrs = {
  comment: string | null;
  authorName: string | null;
  authorUserId: string | null;
  mentionedUserIds: string | null;
  threadId: string | null;
  replies: string | null;
};

export function getNoteCommentAtPos(
  editor: Editor,
  pos: number,
): { from: number; to: number; attrs: NoteCommentMarkAttrs } | null {
  const markType = editor.schema.marks.noteComment;
  if (!markType) return null;
  const $pos = editor.state.doc.resolve(pos);
  const range = getMarkRange($pos, markType);
  if (!range) return null;
  const mark = markType.isInSet(editor.state.doc.resolve(range.from).marks());
  if (!mark) return null;
  return {
    from: range.from,
    to: range.to,
    attrs: mark.attrs as NoteCommentMarkAttrs,
  };
}

export function readRepliesFromAttrs(attrs: NoteCommentMarkAttrs): NoteCommentReply[] {
  return parseNoteCommentReplies(attrs.replies);
}