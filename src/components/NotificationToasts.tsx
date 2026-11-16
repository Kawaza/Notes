import { useEffect } from 'react';
import { AtSign, ClipboardList, MessageSquare, X } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useStore } from '../store/useStore';

export function NotificationToasts() {
  const toasts = useNotificationStore((s) => s.toasts);
  const dismissToast = useNotificationStore((s) => s.dismissToast);
  const markRead = useNotificationStore((s) => s.markRead);
  const openWorkspaceTask = useStore((s) => s.openWorkspaceTask);
  const openWorkspaceNote = useStore((s) => s.openWorkspaceNote);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), Math.max(0, toast.expiresAt - Date.now())),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-[60] flex flex-col gap-2 pointer-events-none right-3 bottom-3 max-md:right-2 max-md:bottom-[max(0.75rem,env(safe-area-inset-bottom))] w-[min(100vw-1.5rem,22rem)]"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = toast.subtitle.includes('comment')
          ? MessageSquare
          : toast.subtitle.includes('mentioned')
            ? AtSign
            : ClipboardList;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-lg px-3.5 py-3 text-sm animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            <button
              type="button"
              onClick={() => {
                markRead(toast.notificationId);
                dismissToast(toast.id);
                if (toast.open.kind === 'task_assigned' || toast.open.kind === 'workspace_task') {
                  openWorkspaceTask(toast.open.taskId, toast.open.folderId);
                } else if (toast.open.kind === 'workspace_note') {
                  openWorkspaceNote(toast.open.noteId, toast.open.folderId);
                }
              }}
              className="flex min-w-0 flex-1 items-start gap-2.5 text-left cursor-pointer"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium truncate">{toast.title}</span>
                <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">{toast.subtitle}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted cursor-pointer"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}