import { useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  MoreVertical,
  Plus,
  Archive,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useCompanyStore } from '../store/companyStore';
import { useStore } from '../store/useStore';
import type { Company, WorkspaceFolder } from '../types/company';
import { workspaceFolderSelectionId } from '../types/company';
import {
  workspaceFolderCount,
  workspaceFolderDepth,
  workspaceNoteFolders,
} from '../utils/workspaceFolderTree';
import { ContextMenu } from './ContextMenu';
import { OverflowMenu } from './OverflowMenu';
import { useIsMobile } from '../hooks/useIsMobile';
import { CompanySectionMenu } from './CompanySectionMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { AddSharedFolderDialog } from './company/AddSharedFolderDialog';

function workspaceOpenKey(companyId: string) {
  return `sidebar-workspace-open-${companyId}`;
}

function readWorkspaceOpen(companyId: string): boolean {
  try {
    const v = localStorage.getItem(workspaceOpenKey(companyId));
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

function writeWorkspaceOpen(companyId: string, open: boolean) {
  try {
    localStorage.setItem(workspaceOpenKey(companyId), open ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function WorkspaceFolderRow({
  folder,
  depth,
  allFolders,
  companyId,
}: {
  folder: WorkspaceFolder;
  depth: number;
  allFolders: WorkspaceFolder[];
  companyId: string;
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const isMobile = useIsMobile();

  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const selectFolder = useStore((s) => s.selectFolder);
  const renameWorkspaceFolder = useCompanyStore((s) => s.renameWorkspaceFolder);
  const deleteWorkspaceFolder = useCompanyStore((s) => s.deleteWorkspaceFolder);
  const archiveWorkspaceFolder = useCompanyStore((s) => s.archiveWorkspaceFolder);

  const selectionId = workspaceFolderSelectionId(folder.id);
  const isSelected = selectedFolderId === selectionId;

  const childFolders = allFolders.filter((f) => {
    if (f.parentId !== folder.id) return false;
    return !f.isParent;
  });

  const menuItems: {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    danger?: boolean;
  }[] = [
    {
      label: 'Rename',
      icon: <Pencil size={14} />,
      onClick: () => setEditing(true),
    },
  ];
  if (!folder.isParent) {
    menuItems.push({
      label: 'Archive',
      icon: <Archive size={14} />,
      onClick: () => setConfirmArchive(true),
    });
  }
  menuItems.push({
    label: 'Delete',
    icon: <Trash2 size={14} />,
    danger: true,
    onClick: () => setConfirmDelete(true),
  });

  return (
    <>
      <div
        className={`group flex items-center gap-1 rounded-lg py-1.5 pr-2 text-sm cursor-pointer ${
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-foreground/80'
        }`}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        onClick={() => !editing && selectFolder(selectionId)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <FolderOpen size={14} className="shrink-0 opacity-60 ml-[22px]" />
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => {
              if (editName.trim()) void renameWorkspaceFolder(folder.id, editName.trim());
              else setEditName(folder.name);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setEditName(folder.name);
                setEditing(false);
              }
            }}
            className="flex-1 min-w-0 bg-transparent outline-none border-b border-primary text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {folder.name}
          </span>
        )}
        {isMobile && !editing && (
          <button
            ref={overflowRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOverflowOpen((v) => !v);
            }}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted/80 shrink-0"
          >
            <MoreVertical size={14} />
          </button>
        )}
      </div>
      {childFolders.map((child) => (
        <WorkspaceFolderRow
          key={child.id}
          folder={child}
          depth={depth + 1}
          allFolders={allFolders}
          companyId={companyId}
        />
      ))}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={menuItems} onClose={() => setContextMenu(null)} />
      )}
      {overflowOpen && (
        <OverflowMenu anchorRef={overflowRef} items={menuItems} onClose={() => setOverflowOpen(false)} />
      )}
      <ConfirmDialog
        open={confirmArchive}
        title="Archive folder?"
        message={`Archive "${folder.name}" for your whole workspace? It will move to Archives for everyone.`}
        confirmLabel="Archive"
        onConfirm={() => void archiveWorkspaceFolder(folder.id)}
        onClose={() => setConfirmArchive(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete folder?"
        message={`Delete "${folder.name}" and everything inside it? This cannot be undone for your team.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => void deleteWorkspaceFolder(folder.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

function WorkspaceSection({
  company,
  folders,
}: {
  company: Company;
  folders: WorkspaceFolder[];
}) {
  const [open, setOpen] = useState(() => readWorkspaceOpen(company.id));
  const [showMenu, setShowMenu] = useState(false);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [addFolderBusy, setAddFolderBusy] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const createSharedFolder = useCompanyStore((s) => s.createSharedFolder);

  const folderCount = workspaceFolderCount(folders);

  const rows = useMemo(() => {
    const all = folders.filter((f) => !f.archived);
    const byId = Object.fromEntries(all.map((f) => [f.id, f]));
    const noteFolders = workspaceNoteFolders(all).sort((a, b) => a.order - b.order);
    const roots = noteFolders.filter((f) => {
      if (!f.parentId) return true;
      const parent = byId[f.parentId];
      if (parent?.isParent) return true;
      return false;
    });
    return roots.map((folder) => ({
      folder,
      depth: workspaceFolderDepth(folder, byId),
    }));
  }, [folders]);

  const toggleOpen = () => {
    setOpen((value) => {
      const next = !value;
      writeWorkspaceOpen(company.id, next);
      return next;
    });
  };

  const submitSharedFolder = async (name: string) => {
    setAddFolderBusy(true);
    try {
      await createSharedFolder(company.id, name);
      setAddFolderOpen(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not create folder');
    } finally {
      setAddFolderBusy(false);
    }
  };

  return (
  <>
    <div className="w-full mt-5 pt-1 pb-1.5 px-2 flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex items-center gap-1.5 min-w-0 flex-1 text-left rounded-md hover:bg-muted/60 py-0.5 pr-1 cursor-pointer"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown size={14} className="shrink-0 text-muted-foreground opacity-60" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-muted-foreground opacity-60" />
        )}
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
          {company.name}
        </span>
        <span className="text-[11px] text-muted-foreground/60 tabular-nums">{folderCount}</span>
      </button>
      <button
        ref={addRef}
        type="button"
        onClick={() => setShowMenu((v) => !v)}
        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
        aria-label={`Add folder to ${company.name}`}
      >
        <Plus size={14} />
      </button>
    </div>
    {open &&
      rows.map(({ folder, depth }) => (
        <WorkspaceFolderRow
          key={folder.id}
          folder={folder}
          depth={depth}
          allFolders={folders}
          companyId={company.id}
        />
      ))}
    {open && rows.length === 0 && (
      <p className="px-5 py-1 text-xs text-muted-foreground">No shared folders yet — use + to add one</p>
    )}
    {showMenu && (
      <CompanySectionMenu
        anchorRef={addRef}
        onClose={() => setShowMenu(false)}
        onAddFolder={() => setAddFolderOpen(true)}
      />
    )}
    {addFolderOpen &&
      createPortal(
        <AddSharedFolderDialog
          open={addFolderOpen}
          busy={addFolderBusy}
          workspaceName={company.name}
          onClose={() => !addFolderBusy && setAddFolderOpen(false)}
          onCreate={submitSharedFolder}
        />,
        document.body,
      )}
  </>
  );
}

export function WorkspaceCompanySidebar() {
  const companies = useCompanyStore((s) => s.companies);
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);
  const companyError = useCompanyStore((s) => s.error);

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  if (sortedCompanies.length === 0) {
    return null;
  }

  return (
    <>
      {companyError && <p className="px-2.5 text-xs text-destructive mb-1">{companyError}</p>}
      {sortedCompanies.map((company) => (
        <WorkspaceSection
          key={company.id}
          company={company}
          folders={foldersByCompany[company.id] ?? []}
        />
      ))}
    </>
  );
}

