export type WorkspaceTaskRef = { id: string; title: string; folderId: string };

/** Restore mention title from live tasks + persisted data attributes. */
export function hydrateWorkspaceTaskMentionsInHtml(
  html: string,
  tasks: WorkspaceTaskRef[],
): string {
  if (!html.includes('data-workspace-task-id')) return html;

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('[data-workspace-task-id]').forEach((el) => {
    const taskId = el.getAttribute('data-workspace-task-id');
    if (!taskId) return;

    const live = byId.get(taskId);
    const storedTitle = el.getAttribute('data-workspace-task-title')?.trim() || '';
    const textTitle = el.textContent?.trim() || '';
    const title = live?.title?.trim() || storedTitle || textTitle || 'Task';

    el.setAttribute('data-workspace-task-title', title);
    if (live?.folderId) {
      el.setAttribute('data-workspace-task-folder-id', live.folderId);
    }
    el.textContent = title;
  });

  return doc.body.innerHTML;
}
