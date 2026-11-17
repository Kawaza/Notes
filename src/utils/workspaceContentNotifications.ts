import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import { useNotificationStore } from '../store/notificationStore';
import type { WorkspaceNote, WorkspaceTask } from '../types/company';
import type { MemberMentionSuggestion } from '../types/memberMention';
import { memberDisplayName } from './memberDisplayName';
import { parseNoteCommentReplies } from './noteCommentThread';

type ParsedComment = {
  key: string;
  authorUserId: string | null;
  mentionedUserIds: string[];
  text: string;
};

type ParsedContent = {
  memberMentionUserIds: string[];
  comments: ParsedComment[];
};

function parseWorkspaceContentHtml(html: string): ParsedContent {
  if (!html.trim() || typeof DOMParser === 'undefined') {
    return { memberMentionUserIds: [], comments: [] };
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const memberMentionUserIds: string[] = [];
  for (const el of doc.querySelectorAll('[data-workspace-member-id]')) {
    const id = el.getAttribute('data-workspace-member-id')?.trim();
    if (id) memberMentionUserIds.push(id);
  }

  const comments: ParsedComment[] = [];
  for (const el of doc.querySelectorAll('[data-note-comment], .note-comment')) {
    const text = el.getAttribute('data-note-comment')?.trim() ?? el.textContent?.trim() ?? '';
    if (!text) continue;
    const authorUserId = el.getAttribute('data-comment-author-user-id')?.trim() || null;
    const rawMentioned = el.getAttribute('data-mentioned-user-ids')?.trim() ?? '';
    const mentionedUserIds = rawMentioned
      ? rawMentioned.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const threadId =
      el.getAttribute('data-comment-thread-id')?.trim() ||
      `${authorUserId ?? 'anon'}|${text.slice(0, 48)}`;
    comments.push({
      key: `${threadId}|root`,
      authorUserId,
      mentionedUserIds,
      text,
    });
    const rawReplies = el.getAttribute('data-comment-replies');
    for (const reply of parseNoteCommentReplies(rawReplies)) {
      const replyMentions = reply.mentionedUserIds
        ? reply.mentionedUserIds.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      comments.push({
        key: `${threadId}|${reply.id}`,
        authorUserId: reply.authorUserId,
        mentionedUserIds: replyMentions,
        text: reply.text,
      });
    }
  }

  return { memberMentionUserIds, comments };
}

export function resolveMentionedUserIdsFromText(
  text: string,
  members: MemberMentionSuggestion[],
): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  const sorted = [...members].sort((a, b) => b.label.length - a.label.length);
  for (const m of sorted) {
    const needle = `@${m.label}`.toLowerCase();
    if (lower.includes(needle)) found.add(m.userId);
  }
  return [...found];
}

function pushNewCommentMentionNotifications(
  viewerId: string,
  prevComments: ParsedComment[],
  nextComments: ParsedComment[],
  input: {
    contentKind: 'note' | 'task';
    itemId: string;
    folderId: string;
    postTitle: string;
    defaultFromUserId: string | null;
    companyId: string;
  },
) {
  const prevByKey = new Map(prevComments.map((c) => [c.key, c]));
  for (const comment of nextComments) {
    const prevComment = prevByKey.get(comment.key);
    const prevMentioned = new Set(prevComment?.mentionedUserIds ?? []);
    const newlyMentioned = comment.mentionedUserIds.filter((id) => !prevMentioned.has(id));
    if (!viewerId || newlyMentioned.length === 0) continue;
    if (!newlyMentioned.includes(viewerId)) continue;
    if (comment.authorUserId === viewerId) continue;
    useNotificationStore.getState().pushWorkspaceComment({
      contentKind: input.contentKind,
      itemId: input.itemId,
      folderId: input.folderId,
      postTitle: input.postTitle,
      fromUserId: comment.authorUserId ?? input.defaultFromUserId,
      fromLabel: fromLabelForUser(comment.authorUserId ?? input.defaultFromUserId, input.companyId),
    });
  }
}

function fromLabelForUser(fromUserId: string | null, companyId: string): string {
  const userId = useAuthStore.getState().user?.id ?? null;
  if (!fromUserId || fromUserId === userId) return 'A teammate';
  const companyState = useCompanyStore.getState();
  const members = companyState.membersByCompany[companyId] ?? [];
  const profiles = companyState.profilesByUserId;
  const profile = useAuthStore.getState().profile;
  return memberDisplayName(fromUserId, profiles, members, userId, profile);
}


export function maybeNotifyWorkspaceNoteContent(existing: WorkspaceNote | undefined, note: WorkspaceNote) {
  const userId = useAuthStore.getState().user?.id ?? null;
  if (!userId) return;

  const prevHtml = existing?.content ?? '';
  const nextHtml = note.content ?? '';
  if (prevHtml === nextHtml) return;

  const prev = parseWorkspaceContentHtml(prevHtml);
  const next = parseWorkspaceContentHtml(nextHtml);

  const prevMentions = new Set(prev.memberMentionUserIds);
  const newMentions = next.memberMentionUserIds.filter((id) => !prevMentions.has(id));
  const fromUserId = note.createdBy;
  const fromLabel = fromLabelForUser(fromUserId, note.companyId);
  const title = note.title.trim() || 'Post';

  if (newMentions.includes(userId)) {
    useNotificationStore.getState().pushWorkspaceMention({
      contentKind: 'note',
      itemId: note.id,
      folderId: note.folderId,
      postTitle: title,
      fromUserId,
      fromLabel,
    });
  }

  pushNewCommentMentionNotifications(userId, prev.comments, next.comments, {
    contentKind: 'note',
    itemId: note.id,
    folderId: note.folderId,
    postTitle: title,
    defaultFromUserId: fromUserId,
    companyId: note.companyId,
  });
}

export function maybeNotifyWorkspaceTaskContent(existing: WorkspaceTask | undefined, task: WorkspaceTask) {
  const userId = useAuthStore.getState().user?.id ?? null;
  if (!userId) return;

  const prevHtml = existing?.content ?? '';
  const nextHtml = task.content ?? '';
  if (prevHtml === nextHtml) return;

  const prev = parseWorkspaceContentHtml(prevHtml);
  const next = parseWorkspaceContentHtml(nextHtml);

  const prevMentions = new Set(prev.memberMentionUserIds);
  const newMentions = next.memberMentionUserIds.filter((id) => !prevMentions.has(id));
  const fromUserId = task.createdBy;
  const fromLabel = fromLabelForUser(fromUserId, task.companyId);
  const title = task.title.trim() || 'Task';

  if (newMentions.includes(userId)) {
    useNotificationStore.getState().pushWorkspaceMention({
      contentKind: 'task',
      itemId: task.id,
      folderId: task.folderId,
      postTitle: title,
      fromUserId,
      fromLabel,
    });
  }

  pushNewCommentMentionNotifications(userId, prev.comments, next.comments, {
    contentKind: 'task',
    itemId: task.id,
    folderId: task.folderId,
    postTitle: title,
    defaultFromUserId: fromUserId,
    companyId: task.companyId,
  });
}