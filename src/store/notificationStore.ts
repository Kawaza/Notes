import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'notes-notifications-v1';
const MAX_ITEMS = 80;
const TOAST_TTL_MS = 6500;

type WorkspaceContentKind = 'note' | 'task';

type NotificationBase = {
  id: string;
  fromUserId: string | null;
  fromLabel: string;
  createdAt: string;
  read: boolean;
  folderId: string;
};

export type AppNotification =
  | (NotificationBase & {
      type: 'task_assigned';
      taskId: string;
      taskTitle: string;
    })
  | (NotificationBase & {
      type: 'workspace_mention';
      contentKind: WorkspaceContentKind;
      itemId: string;
      postTitle: string;
    })
  | (NotificationBase & {
      type: 'workspace_comment';
      contentKind: WorkspaceContentKind;
      itemId: string;
      postTitle: string;
    });

type ToastOpenTarget =
  | { kind: 'task_assigned'; taskId: string; folderId: string }
  | { kind: 'workspace_task'; taskId: string; folderId: string }
  | { kind: 'workspace_note'; noteId: string; folderId: string };

type ToastNotice = {
  id: string;
  notificationId: string;
  title: string;
  subtitle: string;
  expiresAt: number;
  open: ToastOpenTarget;
};

type NotificationState = {
  items: AppNotification[];
  toasts: ToastNotice[];
  pushTaskAssigned: (input: {
    taskId: string;
    folderId: string;
    taskTitle: string;
    fromUserId: string | null;
    fromLabel: string;
  }) => void;
  pushWorkspaceMention: (input: {
    contentKind: WorkspaceContentKind;
    itemId: string;
    folderId: string;
    postTitle: string;
    fromUserId: string | null;
    fromLabel: string;
  }) => void;
  pushWorkspaceComment: (input: {
    contentKind: WorkspaceContentKind;
    itemId: string;
    folderId: string;
    postTitle: string;
    fromUserId: string | null;
    fromLabel: string;
  }) => void;
  dismissToast: (toastId: string) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
  unreadCount: () => number;
};

function loadItems(): AppNotification[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed.filter((n) => n && typeof n.type === 'string') : [];
  } catch {
    return [];
  }
}

function saveItems(items: AppNotification[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

function appendNotification(notification: AppNotification, toast: ToastNotice) {
  return (s: NotificationState) => {
    const items = [notification, ...s.items].slice(0, MAX_ITEMS);
    saveItems(items);
    const toasts = [...s.toasts, toast].slice(-4);
    return { items, toasts };
  };
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: loadItems(),
  toasts: [],

  pushTaskAssigned: (input) => {
    const notification: AppNotification = {
      id: uuidv4(),
      type: 'task_assigned',
      taskId: input.taskId,
      folderId: input.folderId,
      taskTitle: input.taskTitle,
      fromUserId: input.fromUserId,
      fromLabel: input.fromLabel,
      createdAt: new Date().toISOString(),
      read: false,
    };
    const title = input.taskTitle.trim() || 'New task';
    const subtitle = `${input.fromLabel} assigned you a task`;
    const toast: ToastNotice = {
      id: uuidv4(),
      notificationId: notification.id,
      title,
      subtitle,
      expiresAt: Date.now() + TOAST_TTL_MS,
      open: { kind: 'task_assigned', taskId: input.taskId, folderId: input.folderId },
    };
    set(appendNotification(notification, toast));
  },

  pushWorkspaceMention: (input) => {
    const notification: AppNotification = {
      id: uuidv4(),
      type: 'workspace_mention',
      contentKind: input.contentKind,
      itemId: input.itemId,
      folderId: input.folderId,
      postTitle: input.postTitle,
      fromUserId: input.fromUserId,
      fromLabel: input.fromLabel,
      createdAt: new Date().toISOString(),
      read: false,
    };
    const title = input.postTitle.trim() || (input.contentKind === 'task' ? 'Task' : 'Post');
    const subtitle = `${input.fromLabel} mentioned you`;
    const open: ToastOpenTarget =
      input.contentKind === 'task'
        ? { kind: 'workspace_task', taskId: input.itemId, folderId: input.folderId }
        : { kind: 'workspace_note', noteId: input.itemId, folderId: input.folderId };
    const toast: ToastNotice = {
      id: uuidv4(),
      notificationId: notification.id,
      title,
      subtitle,
      expiresAt: Date.now() + TOAST_TTL_MS,
      open,
    };
    set(appendNotification(notification, toast));
  },

  pushWorkspaceComment: (input) => {
    const notification: AppNotification = {
      id: uuidv4(),
      type: 'workspace_comment',
      contentKind: input.contentKind,
      itemId: input.itemId,
      folderId: input.folderId,
      postTitle: input.postTitle,
      fromUserId: input.fromUserId,
      fromLabel: input.fromLabel,
      createdAt: new Date().toISOString(),
      read: false,
    };
    const title = input.postTitle.trim() || (input.contentKind === 'task' ? 'Task' : 'Post');
    const subtitle = `${input.fromLabel} added a comment`;
    const open: ToastOpenTarget =
      input.contentKind === 'task'
        ? { kind: 'workspace_task', taskId: input.itemId, folderId: input.folderId }
        : { kind: 'workspace_note', noteId: input.itemId, folderId: input.folderId };
    const toast: ToastNotice = {
      id: uuidv4(),
      notificationId: notification.id,
      title,
      subtitle,
      expiresAt: Date.now() + TOAST_TTL_MS,
      open,
    };
    set(appendNotification(notification, toast));
  },

  dismissToast: (toastId) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toastId) })),

  markRead: (notificationId) => {
    set((s) => {
      const items = s.items.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      saveItems(items);
      return { items };
    });
  },

  markAllRead: () => {
    set((s) => {
      const items = s.items.map((n) => (n.read ? n : { ...n, read: true }));
      saveItems(items);
      return { items };
    });
  },

  removeNotification: (notificationId) => {
    set((s) => {
      const items = s.items.filter((n) => n.id !== notificationId);
      saveItems(items);
      const toasts = s.toasts.filter((t) => t.notificationId !== notificationId);
      return { items, toasts };
    });
  },

  clearAll: () => {
    saveItems([]);
    set({ items: [], toasts: [] });
  },

  unreadCount: () => get().items.filter((n) => !n.read).length,
}));