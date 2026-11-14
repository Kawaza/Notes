import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Bell, CheckCheck, ClipboardList } from 'lucide-react';
import { useNotificationStore, type AppNotification } from '../store/notificationStore';
import { useStore } from '../store/useStore';

export function NotificationsView() {
  const items = useNotificationStore((s) => s.items);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const setViewMode = useStore((s) => s.setViewMode);
  const openWorkspaceTask = useStore((s) => s.openWorkspaceTask);

  const unread = items.filter((n) => !n.read).length;

  const openItem = (n: AppNotification) => {
    markRead(n.id);
    if (n.type === 'task_assigned') {
      openWorkspaceTask(n.taskId, n.folderId);
    }
  };

  return (
    <div className="flex flex-1 min-w-0 min-h-0 flex-col bg-background">
      <header className="shrink-0 flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => setViewMode('notes')}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Bell size={18} className="text-primary shrink-0" />
          <h1 className="text-lg font-semibold truncate">Notifications</h1>
          {unread > 0 && (
            <span className="rounded-full bg-primary/15 text-primary text-xs font-medium px-2 py-0.5 tabular-nums">
              {unread} new
            </span>
          )}
        </div>
        {items.length > 0 && unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted cursor-pointer shrink-0"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
          <Bell size={32} className="opacity-40" />
          <p className="text-sm">No notifications yet.</p>
          <p className="text-xs max-w-xs">When someone assigns you a workspace task, it will show up here.</p>
        </div>
      ) : (
        <NotificationRows items={items} onOpen={openItem} />
      )}
    </div>
  );
}

function NotificationRows({
  items,
  onOpen,
}: {
  items: AppNotification[];
  onOpen: (n: AppNotification) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <ul className="divide-y divide-border">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onOpen(n)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer hover:bg-muted/50 ${
                !n.read ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
              }`}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${!n.read ? 'font-semibold' : 'font-medium'}`}>
                  {n.taskTitle.trim() || 'Task'}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {n.fromLabel} assigned you this task
                </span>
                <span className="block text-[11px] text-muted-foreground/80 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
