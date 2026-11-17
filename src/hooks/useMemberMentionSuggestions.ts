import { useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import type { MemberMentionSuggestion } from '../types/memberMention';
import type { CompanyMember, WorkspaceFolder, WorkspaceNote, WorkspaceTask } from '../types/company';
import type { UserProfile } from '../types/profile';
import {
  isWorkspaceFolderSelectionId,
  isWorkspaceNoteSelectionId,
  isWorkspaceTaskSelectionId,
  parseWorkspaceFolderSelectionId,
  parseWorkspaceNoteSelectionId,
  parseWorkspaceTaskSelectionId,
} from '../types/company';
import { membersWithCurrentUser } from '../utils/companyMembers';
import { memberDisplayName } from '../utils/memberDisplayName';

function resolveCompanyIdForNoteId(
  noteId: string,
  foldersByCompany: Record<string, WorkspaceFolder[]>,
  tasksByFolder: Record<string, WorkspaceTask[]>,
  notesByFolder: Record<string, WorkspaceNote[]>,
): string | null {
  if (isWorkspaceTaskSelectionId(noteId)) {
    const parsed = parseWorkspaceTaskSelectionId(noteId);
    if (!parsed) return null;
    for (const rows of Object.values(tasksByFolder)) {
      const hit = rows.find((t) => t.id === parsed.taskId);
      if (hit?.companyId) return hit.companyId;
    }
    return null;
  }
  if (isWorkspaceNoteSelectionId(noteId)) {
    const parsed = parseWorkspaceNoteSelectionId(noteId);
    if (!parsed) return null;
    for (const rows of Object.values(notesByFolder)) {
      const hit = rows.find((n) => n.id === parsed.noteId);
      if (!hit) continue;
      for (const list of Object.values(foldersByCompany)) {
        const folder = list.find((f) => f.id === hit.folderId);
        if (folder?.companyId) return folder.companyId;
      }
    }
  }
  return null;
}

function buildSuggestions(
  companyId: string,
  membersByCompany: Record<string, CompanyMember[]>,
  profilesByUserId: Record<string, UserProfile>,
  currentUserId: string | null,
  currentUserProfile: ReturnType<typeof useAuthStore.getState>['profile'],
): MemberMentionSuggestion[] {
  const members = membersWithCurrentUser(
    membersByCompany[companyId] ?? [],
    companyId,
    currentUserId,
    currentUserProfile,
  );
  return members.map((m) => {
    const label = memberDisplayName(
      m.userId,
      profilesByUserId,
      members,
      currentUserId,
      currentUserProfile,
    ).replace(/ \(you\)$/i, '');
    return { userId: m.userId, label: label || `Member ${m.userId.slice(0, 8)}` };
  });
}

/** Workspace @mention list from note/task id, with optional richer list from Editor. */
export function useMemberMentionSuggestions(
  noteId: string,
  fromEditor: MemberMentionSuggestion[] = [],
): MemberMentionSuggestion[] {
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);
  const membersByCompany = useCompanyStore((s) => s.membersByCompany);
  const profilesByUserId = useCompanyStore((s) => s.profilesByUserId);
  const tasksByFolder = useCompanyStore((s) => s.tasksByFolder);
  const notesByFolder = useCompanyStore((s) => s.notesByFolder);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const currentUserProfile = useAuthStore((s) => s.profile);

  const companyId = useMemo(
    () => resolveCompanyIdForNoteId(noteId, foldersByCompany, tasksByFolder, notesByFolder),
    [noteId, foldersByCompany, tasksByFolder, notesByFolder],
  );

  useEffect(() => {
    if (!companyId) return;
    if ((membersByCompany[companyId] ?? []).length > 0) return;
    void useCompanyStore.getState().refreshCompanies();
  }, [companyId, membersByCompany]);

  const fromNote = useMemo(() => {
    if (!companyId) return [];
    return buildSuggestions(
      companyId,
      membersByCompany,
      profilesByUserId,
      currentUserId,
      currentUserProfile,
    );
  }, [companyId, membersByCompany, profilesByUserId, currentUserId, currentUserProfile]);

  return fromEditor.length > 0 ? fromEditor : fromNote;
}

export function resolveCompanyIdFromNoteFolder(
  folderId: string | undefined,
  foldersByCompany: Record<string, WorkspaceFolder[]>,
): string | null {
  if (!folderId || !isWorkspaceFolderSelectionId(folderId)) return null;
  const rawId = parseWorkspaceFolderSelectionId(folderId)?.folderId;
  if (!rawId) return null;
  for (const list of Object.values(foldersByCompany)) {
    const hit = list.find((f) => f.id === rawId);
    if (hit?.companyId) return hit.companyId;
  }
  return null;
}