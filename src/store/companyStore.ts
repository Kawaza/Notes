import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { FolderSecretType, Note } from '../types';
import type { SecretFormData } from '../components/SecretDialog';
import type {
  Company,
  CompanyMember,
  WorkspaceFolder,
  WorkspaceFolderLink,
  WorkspaceFolderSecret,
  WorkspaceNote,
  WorkspaceTask,
  WorkspaceTaskStatus,
} from '../types/company';
import type { UserProfile } from '../types/profile';
import { fetchProfilesForUsers } from '../sync/profileSync';
import { ensureFreshSession } from '../sync/syncUtils';
import { supabase } from '../sync/supabaseClient';
import { useAuthStore } from './authStore';
import {
  workspaceFolderArchiveSelectionId,
  workspaceFolderSelectionId,
  workspaceNoteSelectionId,
  workspaceTaskSelectionId,
} from '../types/company';
import {
  createCompany,
  createWorkspaceFolder,
  createWorkspaceTask,
  deleteWorkspaceTaskRow,
  fetchCompanyMembers,
  fetchMyAssignedWorkspaceTasks,
  fetchMyCompanies,
  fetchWorkspaceFolders,
  fetchWorkspaceTasks,
  joinCompanyByInvite,
  updateWorkspaceTaskRow,
} from '../sync/companySync';
import {
  createWorkspaceFolderLink,
  createWorkspaceFolderSecret,
  createWorkspaceNote,
  deleteWorkspaceFolderLinkRow,
  deleteWorkspaceFolderRow,
  deleteWorkspaceFolderSecretRow,
  deleteWorkspaceNoteRow,
  fetchWorkspaceFolderContent,
  notePatchFromUi,
  updateWorkspaceFolderLinkRow,
  updateWorkspaceFolderRow,
  updateWorkspaceFolderSecretRow,
  updateWorkspaceNoteRow,
} from '../sync/workspaceContentSync';
import {
  getWorkspaceNoteServerRevision,
  hasPendingWorkspaceNoteSave,
  overwriteWorkspaceNote,
  queueWorkspaceNotePersist,
  setWorkspaceNoteServerRevision,
} from '../sync/workspaceNotePersistence';

function companyIdForFolder(
  foldersByCompany: Record<string, WorkspaceFolder[]>,
  folderId: string,
): string | null {
  for (const [companyId, folders] of Object.entries(foldersByCompany)) {
    if (folders.some((f) => f.id === folderId)) return companyId;
  }
  return null;
}

const inFlightFolderLoads = new Set<string>();
let refreshCompaniesInFlight: Promise<void> | null = null;

function workspaceFolderMeta(
  foldersByCompany: Record<string, WorkspaceFolder[]>,
  folderId: string,
): WorkspaceFolder | null {
  for (const folders of Object.values(foldersByCompany)) {
    const hit = folders.find((f) => f.id === folderId);
    if (hit) return hit;
  }
  return null;
}

interface CompanyState {
  companies: Company[];
  archivedCompanies: Company[];
  membersByCompany: Record<string, CompanyMember[]>;
  profilesByUserId: Record<string, UserProfile>;
  foldersByCompany: Record<string, WorkspaceFolder[]>;
  tasksByFolder: Record<string, WorkspaceTask[]>;
  myAssignedTasks: WorkspaceTask[];
  notesByFolder: Record<string, WorkspaceNote[]>;
  linksByFolder: Record<string, WorkspaceFolderLink[]>;
  secretsByFolder: Record<string, WorkspaceFolderSecret[]>;
  workspaceNoteConflicts: Record<string, WorkspaceNote>;
  loading: boolean;
  error: string | null;
  refreshCompanies: () => Promise<void>;
  loadMyAssignedTasks: () => Promise<void>;
  createCompanyWorkspace: (name: string) => Promise<Company>;
  joinWithInviteCode: (code: string) => Promise<void>;
  leaveWorkspace: (companyId: string) => Promise<void>;
  deleteWorkspace: (companyId: string) => Promise<void>;
  restoreWorkspace: (companyId: string) => Promise<void>;
  purgeDeletedWorkspace: (companyId: string) => Promise<void>;
  createSharedFolder: (
    companyId: string,
    name: string,
    options?: { parentId?: string | null; isParent?: boolean },
  ) => Promise<WorkspaceFolder>;
  renameWorkspaceFolder: (folderId: string, name: string) => Promise<void>;
  deleteWorkspaceFolder: (folderId: string) => Promise<void>;
  loadFolderContent: (folderId: string) => Promise<void>;
  loadTasksForFolder: (folderId: string) => Promise<void>;
  createTaskInFolder: (
    companyId: string,
    folderId: string,
    options?: { title?: string; assigneeId?: string | null },
  ) => string;
  updateWorkspaceTask: (taskId: string, partial: Partial<Note> & { assigneeId?: string | null }) => void;
  patchWorkspaceTask: (
    taskId: string,
    patch: {
      assigneeId?: string | null;
      status?: WorkspaceTaskStatus;
      dueAt?: string | null;
      archived?: boolean;
    },
  ) => void;
  duplicateWorkspaceTask: (taskId: string) => string | null;
  archiveWorkspaceNote: (noteId: string) => Promise<void>;
  restoreWorkspaceNote: (noteId: string) => Promise<void>;
  archiveWorkspaceFolder: (folderId: string) => Promise<void>;
  restoreWorkspaceFolder: (folderId: string) => Promise<void>;
  deleteWorkspaceTask: (taskId: string) => Promise<void>;
  getCompanyMembers: (companyId: string) => CompanyMember[];
  createWorkspaceNoteInFolder: (folderId: string, title?: string) => string;
  updateWorkspaceNote: (noteId: string, partial: Partial<Note>) => void;
  applyRemoteWorkspaceNote: (note: WorkspaceNote) => void;
  applyRemoteWorkspaceTask: (task: WorkspaceTask) => void;
  removeRemoteWorkspaceTask: (taskId: string, folderId: string) => void;
  removeRemoteWorkspaceNote: (noteId: string, folderId: string) => void;
  setWorkspaceNoteConflict: (noteId: string, server: WorkspaceNote) => void;
  clearWorkspaceNoteConflict: (noteId: string) => void;
  resolveWorkspaceNoteLoadTheirs: (noteId: string) => void;
  resolveWorkspaceNoteKeepMine: (noteId: string) => void;
  deleteWorkspaceNote: (noteId: string) => Promise<void>;
  createWorkspaceLink: (folderId: string, title: string, url: string) => Promise<void>;
  updateWorkspaceLink: (linkId: string, patch: { title?: string; url?: string; pinned?: boolean }) => Promise<void>;
  deleteWorkspaceLink: (linkId: string, folderId: string) => Promise<void>;
  createWorkspaceSecret: (folderId: string, data: SecretFormData) => Promise<void>;
  updateWorkspaceSecret: (secretId: string, data: SecretFormData) => Promise<void>;
  deleteWorkspaceSecret: (secretId: string, folderId: string) => Promise<void>;
  getWorkspaceFolder: (folderId: string) => WorkspaceFolder | null;
  clear: () => void;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  archivedCompanies: [],
  membersByCompany: {},
  profilesByUserId: {},
  foldersByCompany: {},
  tasksByFolder: {},
  myAssignedTasks: [],
  notesByFolder: {},
  linksByFolder: {},
  secretsByFolder: {},
  workspaceNoteConflicts: {},
  loading: false,
  error: null,

  refreshCompanies: async () => {
    if (refreshCompaniesInFlight) return refreshCompaniesInFlight;
    refreshCompaniesInFlight = (async () => {
      set({ loading: true, error: null });
      try {
        await ensureFreshSession();
        const [companies, archivedCompanies] = await Promise.all([
          fetchMyCompanies(),
          import('../sync/companySync').then((m) => m.fetchDeletedCompaniesForOwner()),
        ]);
        const foldersByCompany: Record<string, WorkspaceFolder[]> = {};
        const membersByCompany: Record<string, CompanyMember[]> = {};
        await Promise.all(
          companies.map(async (c) => {
            foldersByCompany[c.id] = await fetchWorkspaceFolders(c.id);
            membersByCompany[c.id] = await fetchCompanyMembers(c.id);
          }),
        );
        const userIds = new Set<string>();
        for (const members of Object.values(membersByCompany)) {
          for (const m of members) userIds.add(m.userId);
        }
        const profiles = await fetchProfilesForUsers([...userIds]);
        const profilesByUserId = Object.fromEntries(profiles.map((p) => [p.userId, p]));
        const me = useAuthStore.getState().profile;
        if (me) profilesByUserId[me.userId] = me;
        set({ companies, archivedCompanies, foldersByCompany, membersByCompany, profilesByUserId, loading: false });
        await get().loadMyAssignedTasks();
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load company folders',
        });
      }
    })().finally(() => {
      refreshCompaniesInFlight = null;
    });
    return refreshCompaniesInFlight;
  },

  loadMyAssignedTasks: async () => {
    try {
      const myAssignedTasks = await fetchMyAssignedWorkspaceTasks();
      set({ myAssignedTasks });
    } catch (err) {
      console.error(err);
    }
  },

  getCompanyMembers: (companyId) => get().membersByCompany[companyId] ?? [],

  createCompanyWorkspace: async (name) => {
    const company = await createCompany(name);
    await get().refreshCompanies();
    return company;
  },

  joinWithInviteCode: async (code) => {
    const companyId = await joinCompanyByInvite(code);
    await get().refreshCompanies();
    if (companyId) {
      try {
        const members = await fetchCompanyMembers(companyId);
        set((s) => ({
          membersByCompany: { ...s.membersByCompany, [companyId]: members },
        }));
      } catch (err) {
        console.error(err);
      }
    }
  },

  leaveWorkspace: async (companyId) => {
    const { leaveCompany } = await import('../sync/companySync');
    await leaveCompany(companyId);
    await get().refreshCompanies();
  },

  deleteWorkspace: async (companyId) => {
    const { softDeleteCompany } = await import('../sync/companySync');
    await softDeleteCompany(companyId);
    await get().refreshCompanies();
  },

  restoreWorkspace: async (companyId) => {
    const { restoreCompany } = await import('../sync/companySync');
    await restoreCompany(companyId);
    await get().refreshCompanies();
  },

  purgeDeletedWorkspace: async (companyId) => {
    const { purgeDeletedCompany } = await import('../sync/companySync');
    await purgeDeletedCompany(companyId);
    await get().refreshCompanies();
  },

  createSharedFolder: async (companyId, name, options) => {
    const folder = await createWorkspaceFolder(companyId, name, options);
    await get().refreshCompanies();
    return folder;
  },

  renameWorkspaceFolder: async (folderId, name) => {
    await updateWorkspaceFolderRow(folderId, { name: name.trim() });
    await get().refreshCompanies();
  },

  deleteWorkspaceFolder: async (folderId) => {
    await deleteWorkspaceFolderRow(folderId);
    await get().refreshCompanies();
    set((s) => {
      const notesByFolder = { ...s.notesByFolder };
      const linksByFolder = { ...s.linksByFolder };
      const secretsByFolder = { ...s.secretsByFolder };
      const tasksByFolder = { ...s.tasksByFolder };
      delete notesByFolder[folderId];
      delete linksByFolder[folderId];
      delete secretsByFolder[folderId];
      delete tasksByFolder[folderId];
      return { notesByFolder, linksByFolder, secretsByFolder, tasksByFolder };
    });
  },

  loadFolderContent: async (folderId) => {
    if (inFlightFolderLoads.has(folderId)) return;
    inFlightFolderLoads.add(folderId);
    try {
      await ensureFreshSession();
      const [{ notes, links, secrets }, tasks] = await Promise.all([
        fetchWorkspaceFolderContent(folderId),
        fetchWorkspaceTasks(folderId),
      ]);
      set((s) => ({
        notesByFolder: { ...s.notesByFolder, [folderId]: notes },
        linksByFolder: { ...s.linksByFolder, [folderId]: links },
        secretsByFolder: { ...s.secretsByFolder, [folderId]: secrets },
        tasksByFolder: { ...s.tasksByFolder, [folderId]: tasks },
        error: null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load folder';
      set((s) => ({
        error: message,
        notesByFolder: { ...s.notesByFolder, [folderId]: s.notesByFolder[folderId] ?? [] },
        linksByFolder: { ...s.linksByFolder, [folderId]: s.linksByFolder[folderId] ?? [] },
        secretsByFolder: { ...s.secretsByFolder, [folderId]: s.secretsByFolder[folderId] ?? [] },
      }));
    } finally {
      inFlightFolderLoads.delete(folderId);
    }
  },

  loadTasksForFolder: async (folderId) => {
    const tasks = await fetchWorkspaceTasks(folderId);
    set((s) => ({ tasksByFolder: { ...s.tasksByFolder, [folderId]: tasks } }));
  },

  createTaskInFolder: (companyId, folderId, options) => {
    const existing = get().tasksByFolder[folderId] ?? [];
    const rawId = uuidv4();
    const now = new Date().toISOString();
    const optimistic: WorkspaceTask = {
      id: rawId,
      companyId,
      folderId,
      title: options?.title ?? 'New task',
      content: '',
      contentType: 'html',
      isTask: true,
      assigneeId: options?.assigneeId ?? null,
      status: 'todo',
      archived: false,
      order: existing.length,
      createdBy: '',
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      tasksByFolder: {
        ...s.tasksByFolder,
        [folderId]: [...(s.tasksByFolder[folderId] ?? []), optimistic],
      },
    }));
    const selectionId = workspaceTaskSelectionId(rawId);
  void createWorkspaceTask(
      companyId,
      folderId,
      {
        title: options?.title ?? 'New task',
        assigneeId: options?.assigneeId ?? null,
        order: existing.length,
      },
      rawId,
    )
      .then((task) => {
        set((s) => ({
          tasksByFolder: {
            ...s.tasksByFolder,
            [folderId]: (s.tasksByFolder[folderId] ?? []).map((t) => (t.id === rawId ? task : t)),
          },
        }));
        if (task.assigneeId) void get().loadMyAssignedTasks();
      })
      .catch((err) => {
        console.error(err);
        set((s) => ({
          tasksByFolder: {
            ...s.tasksByFolder,
            [folderId]: (s.tasksByFolder[folderId] ?? []).filter((t) => t.id !== rawId),
          },
        }));
      });
    return selectionId;
  },

  updateWorkspaceTask: (taskId, partial) => {
    const folders = get().tasksByFolder;
    let folderId: string | null = null;
    for (const [fid, tasks] of Object.entries(folders)) {
      if (tasks.some((t) => t.id === taskId)) {
        folderId = fid;
        break;
      }
    }
    if (!folderId) {
      const hit = get().myAssignedTasks.find((t) => t.id === taskId);
      if (hit) folderId = hit.folderId;
    }
    if (!folderId) return;

    const assigneePatch =
      'assigneeId' in partial ? { assigneeId: partial.assigneeId ?? null } : {};

    set((s) => {
      const patchRow = (t: WorkspaceTask) =>
        t.id === taskId
          ? {
              ...t,
              title: partial.title ?? t.title,
              content: partial.content ?? t.content,
              contentType: partial.contentType ?? t.contentType,
              scheduledAt: partial.scheduledAt ?? t.scheduledAt,
              scheduledEnd: partial.scheduledEnd ?? t.scheduledEnd,
              ...assigneePatch,
              updatedAt: new Date().toISOString(),
            }
          : t;
      return {
        tasksByFolder: {
          ...s.tasksByFolder,
          [folderId!]: (s.tasksByFolder[folderId!] ?? []).map(patchRow),
        },
        myAssignedTasks: s.myAssignedTasks.map(patchRow),
      };
    });

    void updateWorkspaceTaskRow(taskId, {
      title: partial.title,
      content: partial.content,
      contentType: partial.contentType,
      scheduledAt: partial.scheduledAt,
      scheduledEnd: partial.scheduledEnd,
      ...assigneePatch,
    })
      .then(() => void get().loadMyAssignedTasks())
      .catch((err) => {
        console.error(err);
        void get().loadTasksForFolder(folderId!);
      });
  },

  patchWorkspaceTask: (taskId, patch) => {
    let archived: boolean | undefined = patch.archived;
    if (patch.status !== undefined) {
      archived = patch.status === 'complete';
    }

    const folders = get().tasksByFolder;
    let folderId: string | null = null;
    let taskRow: WorkspaceTask | null = null;
    for (const [fid, tasks] of Object.entries(folders)) {
      const hit = tasks.find((t) => t.id === taskId);
      if (hit) {
        folderId = fid;
        taskRow = hit;
        break;
      }
    }
    if (!taskRow) {
      const hit = get().myAssignedTasks.find((t) => t.id === taskId);
      if (hit) {
        folderId = hit.folderId;
        taskRow = hit;
      }
    }
    if (!folderId || !taskRow) return;

    const nextArchived = archived ?? taskRow.archived;
    const nextStatus = patch.status ?? taskRow.status;
    const nextAssignee = patch.assigneeId !== undefined ? patch.assigneeId : taskRow.assigneeId;
    const nextDue = patch.dueAt !== undefined ? (patch.dueAt ?? undefined) : taskRow.dueAt;

    const apply = (t: WorkspaceTask): WorkspaceTask =>
      t.id === taskId
        ? {
            ...t,
            assigneeId: nextAssignee,
            status: nextStatus,
            dueAt: nextDue,
            archived: nextArchived,
            updatedAt: new Date().toISOString(),
          }
        : t;

    set((s) => ({
      tasksByFolder: {
        ...s.tasksByFolder,
        [folderId!]: (s.tasksByFolder[folderId!] ?? []).map(apply),
      },
      myAssignedTasks: nextArchived
        ? s.myAssignedTasks.filter((t) => t.id !== taskId)
        : s.myAssignedTasks.map(apply),
    }));

    void updateWorkspaceTaskRow(taskId, {
      assigneeId: nextAssignee,
      status: nextStatus,
      dueAt: nextDue,
      archived: nextArchived,
    })
      .then(() => void get().loadMyAssignedTasks())
      .catch((err) => console.error(err));
  },

  duplicateWorkspaceTask: (taskId) => {
    let source: WorkspaceTask | null = null;
    let folderId: string | null = null;
    for (const [fid, tasks] of Object.entries(get().tasksByFolder)) {
      const hit = tasks.find((t) => t.id === taskId);
      if (hit) {
        source = hit;
        folderId = fid;
        break;
      }
    }
    if (!source || !folderId) return null;
    return get().createTaskInFolder(source.companyId, folderId, {
      title: source.title.trim() ? `${source.title.trim()} (copy)` : 'New task (copy)',
      assigneeId: source.assigneeId,
    });
  },

  archiveWorkspaceNote: async (noteId) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('workspace_notes')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', noteId);
    if (error) throw error;
    let folderId: string | null = null;
    for (const [fid, notes] of Object.entries(get().notesByFolder)) {
      if (notes.some((n) => n.id === noteId)) {
        folderId = fid;
        break;
      }
    }
    if (folderId) {
      set((s) => ({
        notesByFolder: {
          ...s.notesByFolder,
          [folderId!]: (s.notesByFolder[folderId!] ?? []).map((n) =>
            n.id === noteId ? { ...n, archived: true } : n,
          ),
        },
      }));
    }
  },

  restoreWorkspaceNote: async (noteId) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('workspace_notes')
      .update({ archived: false, updated_at: new Date().toISOString() })
      .eq('id', noteId);
    if (error) throw error;
    let folderId: string | null = null;
    for (const [fid, notes] of Object.entries(get().notesByFolder)) {
      if (notes.some((n) => n.id === noteId)) {
        folderId = fid;
        break;
      }
    }
    if (folderId) {
      set((s) => ({
        notesByFolder: {
          ...s.notesByFolder,
          [folderId!]: (s.notesByFolder[folderId!] ?? []).map((n) =>
            n.id === noteId ? { ...n, archived: false } : n,
          ),
        },
      }));
    }
  },

  archiveWorkspaceFolder: async (folderId) => {
    await updateWorkspaceFolderRow(folderId, { archived: true });
    set((s) => {
      const foldersByCompany = { ...s.foldersByCompany };
      for (const [companyId, list] of Object.entries(foldersByCompany)) {
        if (!list.some((f) => f.id === folderId)) continue;
        foldersByCompany[companyId] = list.map((f) =>
          f.id === folderId ? { ...f, archived: true } : f,
        );
        break;
      }
      return { foldersByCompany };
    });
    void import('./useStore').then((m) => {
      const { selectedFolderId, selectFolder } = m.useStore.getState();
      if (selectedFolderId === workspaceFolderSelectionId(folderId)) {
        selectFolder(workspaceFolderArchiveSelectionId(folderId));
      }
    });
  },

  restoreWorkspaceFolder: async (folderId) => {
    await updateWorkspaceFolderRow(folderId, { archived: false });
    set((s) => {
      const foldersByCompany = { ...s.foldersByCompany };
      for (const [companyId, list] of Object.entries(foldersByCompany)) {
        if (!list.some((f) => f.id === folderId)) continue;
        foldersByCompany[companyId] = list.map((f) =>
          f.id === folderId ? { ...f, archived: false } : f,
        );
        break;
      }
      return { foldersByCompany };
    });
    void import('./useStore').then((m) => {
      const { selectedFolderId, selectFolder } = m.useStore.getState();
      if (selectedFolderId === workspaceFolderArchiveSelectionId(folderId)) {
        selectFolder(workspaceFolderSelectionId(folderId));
      }
    });
  },

  deleteWorkspaceTask: async (taskId) => {
    let folderId: string | null = null;
    for (const [fid, tasks] of Object.entries(get().tasksByFolder)) {
      if (tasks.some((t) => t.id === taskId)) {
        folderId = fid;
        break;
      }
    }
    await deleteWorkspaceTaskRow(taskId);
    if (folderId) {
      set((s) => ({
        tasksByFolder: {
          ...s.tasksByFolder,
          [folderId!]: (s.tasksByFolder[folderId!] ?? []).filter((t) => t.id !== taskId),
        },
        myAssignedTasks: s.myAssignedTasks.filter((t) => t.id !== taskId),
      }));
    } else {
      set((s) => ({ myAssignedTasks: s.myAssignedTasks.filter((t) => t.id !== taskId) }));
    }
  },

  createWorkspaceNoteInFolder: (folderId, title = 'Untitled') => {
    const companyId = companyIdForFolder(get().foldersByCompany, folderId);
    const folder = workspaceFolderMeta(get().foldersByCompany, folderId);
    if (!companyId || !folder || folder.isParent) {
      throw new Error('Cannot add notes to this folder');
    }
    const existing = get().notesByFolder[folderId] ?? [];
    const rawId = uuidv4();
    const now = new Date().toISOString();
    const optimistic: WorkspaceNote = {
      id: rawId,
      companyId,
      folderId,
      title,
      content: '',
      contentType: 'html',
      tags: [],
      pinned: false,
      attachments: [],
      order: existing.length,
      isTask: false,
      archived: false,
      createdBy: null,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      notesByFolder: {
        ...s.notesByFolder,
        [folderId]: [...(s.notesByFolder[folderId] ?? []), optimistic],
      },
    }));
    const selectionId = workspaceNoteSelectionId(rawId);
    void createWorkspaceNote(companyId, folderId, title, existing.length, rawId)
      .then((note) => {
        set((s) => ({
          notesByFolder: {
            ...s.notesByFolder,
            [folderId]: (s.notesByFolder[folderId] ?? []).map((n) => (n.id === rawId ? note : n)),
          },
        }));
      })
      .catch((err) => {
        console.error(err);
        set((s) => ({
          notesByFolder: {
            ...s.notesByFolder,
            [folderId]: (s.notesByFolder[folderId] ?? []).filter((n) => n.id !== rawId),
          },
        }));
      });
    return selectionId;
  },

  updateWorkspaceNote: (noteId, partial) => {
    const folders = get().notesByFolder;
    let folderId: string | null = null;
    let current: WorkspaceNote | undefined;
    for (const [fid, notes] of Object.entries(folders)) {
      const hit = notes.find((n) => n.id === noteId);
      if (hit) {
        folderId = fid;
        current = hit;
        break;
      }
    }
    if (!folderId || !current) return;

    const patch = notePatchFromUi(partial);
  const syncCallbacks = {
      onSynced: (saved: WorkspaceNote) => {
        setWorkspaceNoteServerRevision(noteId, saved.updatedAt);
        get().applyRemoteWorkspaceNote(saved);
        get().clearWorkspaceNoteConflict(noteId);
      },
      onConflict: (server: WorkspaceNote) => {
        get().setWorkspaceNoteConflict(noteId, server);
      },
      onError: (err: unknown) => {
        console.error(err);
        void get().loadFolderContent(folderId!);
      },
    };

    set((s) => ({
      notesByFolder: {
        ...s.notesByFolder,
        [folderId!]: (s.notesByFolder[folderId!] ?? []).map((n) =>
          n.id === noteId
            ? {
                ...n,
                title: patch.title ?? n.title,
                content: patch.content ?? n.content,
                contentType: patch.contentType ?? n.contentType,
                tags: patch.tags ?? n.tags,
                pinned: patch.pinned ?? n.pinned,
                attachments: patch.attachments ?? n.attachments,
                order: patch.order ?? n.order,
                calendarColor: patch.calendarColor ?? n.calendarColor,
                scheduledAt: patch.scheduledAt ?? n.scheduledAt,
                scheduledEnd: patch.scheduledEnd ?? n.scheduledEnd,
                updatedAt: new Date().toISOString(),
              }
            : n,
        ),
      },
    }));

    if (getWorkspaceNoteServerRevision(noteId) === undefined) {
      setWorkspaceNoteServerRevision(noteId, current.updatedAt);
    }

    const isBodyEdit = patch.content !== undefined || patch.title !== undefined;
    if (isBodyEdit) {
      queueWorkspaceNotePersist(noteId, partial, syncCallbacks);
      return;
    }

    void updateWorkspaceNoteRow(noteId, patch)
      .then((result) => {
        if (result === 'conflict') syncCallbacks.onConflict(current!);
        else syncCallbacks.onSynced(result);
      })
      .catch(syncCallbacks.onError);
  },

  applyRemoteWorkspaceNote: (note) => {
    if (hasPendingWorkspaceNoteSave(note.id)) return;

    const folderId = note.folderId;
    const list = get().notesByFolder[folderId] ?? [];
    const existing = list.find((n) => n.id === note.id);
    if (existing && existing.updatedAt > note.updatedAt) return;

    setWorkspaceNoteServerRevision(note.id, note.updatedAt);
    set((s) => {
      const prev = s.notesByFolder[folderId] ?? [];
      const ix = prev.findIndex((n) => n.id === note.id);
      const next =
        ix >= 0 ? prev.map((n) => (n.id === note.id ? note : n)) : [...prev, note].sort((a, b) => a.order - b.order);
      return {
        notesByFolder: { ...s.notesByFolder, [folderId]: next },
      };
    });
  },

  applyRemoteWorkspaceTask: (task) => {
    const userId = useAuthStore.getState().user?.id ?? null;
    const folderId = task.folderId;
    set((s) => {
      const list = s.tasksByFolder[folderId] ?? [];
      const existing = list.find((t) => t.id === task.id);
      if (existing && existing.updatedAt > task.updatedAt) return s;

      const nextList = existing
        ? list.map((t) => (t.id === task.id ? task : t))
        : [...list, task].sort((a, b) => a.order - b.order);

      let myAssigned = s.myAssignedTasks;
      const assignedToMe = Boolean(userId && task.assigneeId === userId && !task.archived);
      if (!assignedToMe) {
        myAssigned = myAssigned.filter((t) => t.id !== task.id);
      } else if (myAssigned.some((t) => t.id === task.id)) {
        myAssigned = myAssigned.map((t) => (t.id === task.id ? task : t));
      } else {
        myAssigned = [task, ...myAssigned];
      }

      return {
        tasksByFolder: { ...s.tasksByFolder, [folderId]: nextList },
        myAssignedTasks: myAssigned,
      };
    });
  },

  removeRemoteWorkspaceTask: (taskId, folderId) => {
    set((s) => ({
      tasksByFolder: {
        ...s.tasksByFolder,
        [folderId]: (s.tasksByFolder[folderId] ?? []).filter((t) => t.id !== taskId),
      },
      myAssignedTasks: s.myAssignedTasks.filter((t) => t.id !== taskId),
    }));
  },

  removeRemoteWorkspaceNote: (noteId, folderId) => {
    set((s) => ({
      notesByFolder: {
        ...s.notesByFolder,
        [folderId]: (s.notesByFolder[folderId] ?? []).filter((n) => n.id !== noteId),
      },
    }));
  },

  setWorkspaceNoteConflict: (noteId, server) => {
    set((s) => ({
      workspaceNoteConflicts: { ...s.workspaceNoteConflicts, [noteId]: server },
    }));
  },

  clearWorkspaceNoteConflict: (noteId) => {
    set((s) => {
      const next = { ...s.workspaceNoteConflicts };
      delete next[noteId];
      return { workspaceNoteConflicts: next };
    });
  },

  resolveWorkspaceNoteLoadTheirs: (noteId) => {
    const server = get().workspaceNoteConflicts[noteId];
    if (!server) return;
    get().clearWorkspaceNoteConflict(noteId);
    get().applyRemoteWorkspaceNote(server);
  },

  resolveWorkspaceNoteKeepMine: (noteId) => {
    let local: WorkspaceNote | undefined;
    for (const notes of Object.values(get().notesByFolder)) {
      const hit = notes.find((n) => n.id === noteId);
      if (hit) {
        local = hit;
        break;
      }
    }
    if (!local) return;
    get().clearWorkspaceNoteConflict(noteId);
    void overwriteWorkspaceNote(
      noteId,
      { title: local.title, content: local.content, contentType: local.contentType, attachments: local.attachments },
      {
        onSynced: (saved) => get().applyRemoteWorkspaceNote(saved),
        onConflict: (server) => get().setWorkspaceNoteConflict(noteId, server),
        onError: (err) => console.error(err),
      },
    );
  },

  deleteWorkspaceNote: async (noteId) => {
    let folderId: string | null = null;
    for (const [fid, notes] of Object.entries(get().notesByFolder)) {
      if (notes.some((n) => n.id === noteId)) {
        folderId = fid;
        break;
      }
    }
    await deleteWorkspaceNoteRow(noteId);
    if (folderId) {
      set((s) => ({
        notesByFolder: {
          ...s.notesByFolder,
          [folderId!]: (s.notesByFolder[folderId!] ?? []).filter((n) => n.id !== noteId),
        },
      }));
    }
  },

  createWorkspaceLink: async (folderId, title, url) => {
    const companyId = companyIdForFolder(get().foldersByCompany, folderId);
    if (!companyId) throw new Error('Unknown folder');
    const order = (get().linksByFolder[folderId] ?? []).length;
    const link = await createWorkspaceFolderLink(companyId, folderId, title, url, order);
    set((s) => ({
      linksByFolder: {
        ...s.linksByFolder,
        [folderId]: [...(s.linksByFolder[folderId] ?? []), link],
      },
    }));
  },

  updateWorkspaceLink: async (linkId, patch) => {
    const updated = await updateWorkspaceFolderLinkRow(linkId, patch);
    set((s) => ({
      linksByFolder: {
        ...s.linksByFolder,
        [updated.folderId]: (s.linksByFolder[updated.folderId] ?? []).map((l) =>
          l.id === linkId ? updated : l,
        ),
      },
    }));
  },

  deleteWorkspaceLink: async (linkId, folderId) => {
    await deleteWorkspaceFolderLinkRow(linkId);
    set((s) => ({
      linksByFolder: {
        ...s.linksByFolder,
        [folderId]: (s.linksByFolder[folderId] ?? []).filter((l) => l.id !== linkId),
      },
    }));
  },

  createWorkspaceSecret: async (folderId, data) => {
    const companyId = companyIdForFolder(get().foldersByCompany, folderId);
    if (!companyId) throw new Error('Unknown folder');
    const order = (get().secretsByFolder[folderId] ?? []).length;
    const secret = await createWorkspaceFolderSecret(
      companyId,
      folderId,
      {
        title: data.title,
        type: data.type as FolderSecretType,
        value: data.value,
        username: data.username,
        linkId: data.linkId,
        notes: data.notes,
      },
      order,
    );
    set((s) => ({
      secretsByFolder: {
        ...s.secretsByFolder,
        [folderId]: [...(s.secretsByFolder[folderId] ?? []), secret],
      },
    }));
  },

  updateWorkspaceSecret: async (secretId, data) => {
    const updated = await updateWorkspaceFolderSecretRow(secretId, {
      title: data.title,
      type: data.type as FolderSecretType,
      value: data.value,
      username: data.username,
      linkId: data.linkId,
      notes: data.notes,
    });
    set((s) => ({
      secretsByFolder: {
        ...s.secretsByFolder,
        [updated.folderId]: (s.secretsByFolder[updated.folderId] ?? []).map((x) =>
          x.id === secretId ? updated : x,
        ),
      },
    }));
  },

  deleteWorkspaceSecret: async (secretId, folderId) => {
    await deleteWorkspaceFolderSecretRow(secretId);
    set((s) => ({
      secretsByFolder: {
        ...s.secretsByFolder,
        [folderId]: (s.secretsByFolder[folderId] ?? []).filter((x) => x.id !== secretId),
      },
    }));
  },

  getWorkspaceFolder: (folderId) => workspaceFolderMeta(get().foldersByCompany, folderId),

  clear: () =>
    set({
      companies: [],
      archivedCompanies: [],
      membersByCompany: {},
      profilesByUserId: {},
      foldersByCompany: {},
      tasksByFolder: {},
      myAssignedTasks: [],
      notesByFolder: {},
      linksByFolder: {},
      secretsByFolder: {},
      workspaceNoteConflicts: {},
      loading: false,
      error: null,
    }),
}));
