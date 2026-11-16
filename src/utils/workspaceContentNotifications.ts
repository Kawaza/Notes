import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import { useNotificationStore } from '../store/notificationStore';
import type { WorkspaceNote, WorkspaceTask } from '../types/company';
import type { MemberMentionSuggestion } from '../types/memberMention';
import { memberDisplayName } from './memberDisplayName';

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
    const key = `${authorUserId ?? ''}|${text}`;
    comments.push({ key, authorUserId, mentionedUserIds, text });
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

  const prevCommentKeys = new Set(prev.comments.map((c) => c.key));
  for (const comment of next.comments) {
    if (prevCommentKeys.has(comment.key)) continue;
    const targets = new Set(comment.mentionedUserIds);
    if (userId && targets.has(userId) && comment.authorUserId !== userId) {
      useNotificationStore.getState().pushWorkspaceComment({
        contentKind: 'note',
        itemId: note.id,
        folderId: note.folderId,
        postTitle: title,
        fromUserId: comment.authorUserId ?? fromUserId,
        fromLabel: fromLabelForUser(comment.authorUserId ?? fromUserId, note.companyId),
      });
    }
  }
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

  const prevCommentKeys = new Set(prev.comments.map((c) => c.key));
  for (const comment of next.comments) {
    if (prevCommentKeys.has(comment.key)) continue;
    const targets = new Set(comment.mentionedUserIds);
    if (userId && targets.has(userId) && comment.authorUserId !== userId) {
      useNotificationStore.getState().pushWorkspaceComment({
        contentKind: 'task',
        itemId: task.id,
        folderId: task.folderId,
        postTitle: title,
        fromUserId: comment.authorUserId ?? fromUserId,
        fromLabel: fromLabelForUser(comment.authorUserId ?? fromUserId, task.companyId),
      });
    }
  }
}