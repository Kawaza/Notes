import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'notes-notifications-v1';
const MAX_ITEMS = 80;
const TOAST_TTL_MS = 6500;

export type AppNotification = {
  id: string;
  type: 'task_assigned';
  taskId: string;
  folderId: string;
  taskTitle: string;
  fromUserId: string | null;
  fromLabel: string;
  createdAt: string;
  read: boolean;
};

type ToastNotice = {
  id: string;
  notificationId: string;
  taskId: string;
  folderId: string;
  title: string;
  subtitle: string;
  expiresAt: number;
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
    return Array.isArray(parsed) ? parsed : [];
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
      taskId: input.taskId,
      folderId: input.folderId,
      title,
      subtitle,
      expiresAt: Date.now() + TOAST_TTL_MS,
    };

    set((s) => {
      const items = [notification, ...s.items].slice(0, MAX_ITEMS);
      saveItems(items);
      const toasts = [...s.toasts, toast].slice(-4);
      return { items, toasts };
    });
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
