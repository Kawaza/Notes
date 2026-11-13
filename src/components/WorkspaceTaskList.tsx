import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCompanyStore } from '../store/companyStore';
import { useStore } from '../store/useStore';
import { parseWorkspaceFolderSelectionId } from '../types/company';

export function WorkspaceTaskList() {
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const parsed = parseWorkspaceFolderSelectionId(selectedFolderId);
  const folderId = parsed?.folderId ?? null;

  const companies = useCompanyStore((s) => s.companies);
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);
  const tasksByFolder = useCompanyStore((s) => s.tasksByFolder);
  const loadTasksForFolder = useCompanyStore((s) => s.loadTasksForFolder);
  const createTaskInFolder = useCompanyStore((s) => s.createTaskInFolder);

  const folderMeta = folderId
    ? Object.values(foldersByCompany)
        .flat()
        .find((f) => f.id === folderId)
    : null;
  const company = folderMeta ? companies.find((c) => c.id === folderMeta.companyId) : null;
  const tasks = folderId ? tasksByFolder[folderId] ?? [] : [];

  useEffect(() => {
    if (folderId) void loadTasksForFolder(folderId);
  }, [folderId, loadTasksForFolder]);

  if (!folderId || !folderMeta) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground p-6">
        Select a company folder
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 border-r border-border bg-background">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{company?.name ?? 'Company'}</p>
        <h2 className="text-lg font-semibold truncate">{folderMeta.name}</h2>
        <p className="text-xs text-muted-foreground mt-1">Shared tasks · assignees & calendar coming next</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="px-4 py-3 border-b border-border/40 hover:bg-muted/40"
          >
            <p className="font-medium text-sm">{task.title || 'Untitled task'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Updated {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
              {task.assigneeId ? ' · Assigned' : ''}
            </p>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="px-4 py-8 text-sm text-muted-foreground text-center">No tasks yet</p>
        )}
      </div>
      <div className="p-3 border-t border-border shrink-0">
        <button
          type="button"
          onClick={() => void createTaskInFolder(folderMeta.companyId, folderId)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer"
        >
          <Plus size={16} /> New task
        </button>
      </div>
    </div>
  );
}
