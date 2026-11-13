import type { WorkspaceFolder } from '../types/company';

export function findWorkspaceFolder(
  foldersByCompany: Record<string, WorkspaceFolder[]>,
  folderId: string,
): WorkspaceFolder | null {
  for (const list of Object.values(foldersByCompany)) {
    const hit = list.find((f) => f.id === folderId);
    if (hit) return hit;
  }
  return null;
}

export function workspaceNoteFolders(folders: WorkspaceFolder[]): WorkspaceFolder[] {
  return folders.filter((f) => !f.archived && !f.isParent);
}

export function workspaceFolderDepth(
  folder: WorkspaceFolder,
  byId: Record<string, WorkspaceFolder>,
): number {
  let depth = 0;
  let parentId = folder.parentId;
  while (parentId) {
    const parent = byId[parentId];
    if (!parent) break;
    if (!parent.isParent) depth += 1;
    parentId = parent.parentId;
  }
  return depth;
}

export function workspaceFolderCount(folders: WorkspaceFolder[]): number {
  return workspaceNoteFolders(folders).length;
}
