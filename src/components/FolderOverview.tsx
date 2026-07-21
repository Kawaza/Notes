import { useMemo, useState, useEffect, useRef } from 'react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import {
  ExternalLink,
  Link2,
  Plus,
  CalendarClock,
  Pencil,
  Trash2,
  KeyRound,
  Copy,
  Check,
  ChevronDown,
  Star,
  Terminal,
  Shield,
  Lock,
  MoreVertical,
  ChevronLeft,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { QuickLinkDialog } from './QuickLinkDialog';
import { SecretDialog, getSecretTypeLabel, type SecretFormData } from './SecretDialog';
import { FolderColorBar } from './FolderColorBar';
import { ConfirmDialog } from './ConfirmDialog';
import { CalendarColorPicker } from './CalendarColorPicker';
import { LinkIcon, getLinkServiceLabel } from './LinkIcon';
import { getCalendarColor } from '../constants/calendarColors';
import { OverflowMenu } from './OverflowMenu';
import { useIsMobile } from '../hooks/useIsMobile';
import { openExternalUrl } from '../utils/openExternal';
import type { FolderLink, FolderSecret, FolderSecretType, Note } from '../types';

function formatTaskDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}

function SecretTypeIcon({ type, size = 14 }: { type: FolderSecretType; size?: number }) {
  const className = 'text-primary';
  switch (type) {
    case 'ssh_key':
      return <Terminal size={size} className={className} />;
    case 'api_key':
      return <Shield size={size} className={className} />;
    case 'password':
      return <Lock size={size} className={className} />;
    default:
      return <KeyRound size={size} className={className} />;
  }
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function LinkCard({
  link,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  link: FolderLink;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const menuItems = [
    {
      label: link.pinned ? 'Unpin from sidebar' : 'Pin to sidebar',
      icon: <Star size={14} className={link.pinned ? 'fill-primary text-primary' : ''} />,
      onClick: onTogglePin,
    },
    {
      label: 'Edit link',
      icon: <Pencil size={14} />,
      onClick: onEdit,
    },
    {
      label: 'Open link',
      icon: <ExternalLink size={14} />,
      onClick: () => openExternalUrl(link.url),
    },
    {
      label: 'Delete link',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: onDelete,
    },
  ];

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 hover:border-primary/30 transition-colors">
      <LinkIcon url={link.url} size={18} />
      <a
        href={link.url}
        className="flex-1 min-w-0 hover:underline cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openExternalUrl(link.url);
        }}
      >
        <p className="text-sm font-medium truncate flex items-center gap-1.5">
          {link.pinned && <Star size={11} className="shrink-0 text-primary fill-primary" />}
          {link.title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{getLinkServiceLabel(link.url)}</p>
      </a>
      {isMobile ? (
        <>
          <button
            ref={overflowRef}
            type="button"
            onClick={() => setOverflowOpen((v) => !v)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
            aria-label="Link options"
          >
            <MoreVertical size={16} />
          </button>
          {overflowOpen && (
            <OverflowMenu anchorRef={overflowRef} items={menuItems} onClose={() => setOverflowOpen(false)} />
          )}
        </>
      ) : (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onTogglePin}
            className={`p-1.5 rounded-md cursor-pointer ${
              link.pinned ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
            }`}
            title={link.pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
          >
            <Star size={13} className={link.pinned ? 'fill-primary' : ''} />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer" title="Edit link">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer" title="Delete link">
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => openExternalUrl(link.url)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
            title="Open link"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function SecretCard({
  secret,
  linkTitle,
  onEdit,
  onDelete,
}: {
  secret: FolderSecret;
  linkTitle?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'value' | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const secretMenuItems = [
    { label: 'Edit', icon: <Pencil size={14} />, onClick: onEdit },
    { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: onDelete },
  ];

  const handleCopyField = async (e: React.MouseEvent, field: 'username' | 'value', text: string) => {
    e.stopPropagation();
    await copyText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const tooltip = [linkTitle && `Link: ${linkTitle}`, secret.notes].filter(Boolean).join(' · ');

  return (
    <div
      className="group rounded-lg border border-border/60 bg-card hover:border-primary/30 transition-colors overflow-hidden"
      title={tooltip || undefined}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left cursor-pointer"
      >
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <SecretTypeIcon type={secret.type} size={13} />
        </div>

        <p className="text-sm font-medium truncate shrink min-w-0 flex-1">{secret.title}</p>

        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 hidden sm:inline">
          {getSecretTypeLabel(secret.type)}
        </span>

        <ChevronDown
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />

        <div className="flex items-center gap-0.5 shrink-0">
          {isMobile ? (
            <>
              <button
                ref={overflowRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOverflowOpen((v) => !v);
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
                aria-label="Credential options"
              >
                <MoreVertical size={16} />
              </button>
              {overflowOpen && (
                <OverflowMenu
                  anchorRef={overflowRef}
                  items={secretMenuItems}
                  onClose={() => setOverflowOpen(false)}
                />
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                title="Edit"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/40 px-3 py-2.5 space-y-2 bg-muted/20">
            {secret.username && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 w-16">Username</span>
                <span className="text-sm truncate flex-1 min-w-0">{secret.username}</span>
                <button
                  type="button"
                  onClick={(e) => handleCopyField(e, 'username', secret.username!)}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
                  title="Copy username"
                >
                  {copiedField === 'username' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 w-16">
                {secret.type === 'password' ? 'Password' : 'Value'}
              </span>
              <code className="text-sm font-mono text-muted-foreground truncate flex-1 min-w-0">••••••••</code>
              <button
                type="button"
                onClick={(e) => handleCopyField(e, 'value', secret.value)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
                title={secret.type === 'password' ? 'Copy password' : 'Copy value'}
              >
                {copiedField === 'value' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onOpen,
  onColorChange,
}: {
  task: Note;
  onOpen: () => void;
  onColorChange: (colorId: string) => void;
}) {
  const [showColors, setShowColors] = useState(false);
  const overdue = task.scheduledAt ? isPast(new Date(task.scheduledAt)) && !isToday(new Date(task.scheduledAt)) : false;
  const color = getCalendarColor(task.calendarColor);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2.5 hover:border-primary/30 transition-colors">
      <button
        onClick={() => setShowColors((v) => !v)}
        className="w-2 h-2 rounded-full shrink-0 mr-1 cursor-pointer hover:scale-125 transition-transform"
        style={{ backgroundColor: color.border }}
        title="Change task color"
      />
      <button onClick={onOpen} className="flex-1 min-w-0 text-left cursor-pointer">
        <p className="text-sm font-medium truncate">{task.title || 'Untitled task'}</p>
        {task.scheduledAt ? (
          <p className={`text-[11px] ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            {overdue ? 'Overdue · ' : ''}
            {formatTaskDate(task.scheduledAt)}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Unscheduled</p>
        )}
      </button>
      {showColors && (
        <CalendarColorPicker
          compact
          value={task.calendarColor}
          onChange={(id) => {
            onColorChange(id);
            setShowColors(false);
          }}
        />
      )}
    </div>
  );
}

interface FolderOverviewProps {
  folderId: string;
  onMobileBack?: () => void;
}

export function FolderOverview({ folderId, onMobileBack }: FolderOverviewProps) {
  const folders = useStore((s) => s.folders);
  const notes = useStore((s) => s.notes);
  const folderLinks = useStore((s) => s.folderLinks);
  const folderSecrets = useStore((s) => s.folderSecrets);
  const createFolderLink = useStore((s) => s.createFolderLink);
  const updateFolderLink = useStore((s) => s.updateFolderLink);
  const deleteFolderLink = useStore((s) => s.deleteFolderLink);
  const togglePinFolderLink = useStore((s) => s.togglePinFolderLink);
  const createFolderSecret = useStore((s) => s.createFolderSecret);
  const updateFolderSecret = useStore((s) => s.updateFolderSecret);
  const deleteFolderSecret = useStore((s) => s.deleteFolderSecret);
  const updateNote = useStore((s) => s.updateNote);
  const selectNote = useStore((s) => s.selectNote);
  const createNote = useStore((s) => s.createNote);
  const folderDialogRequest = useStore((s) => s.folderDialogRequest);
  const clearFolderDialogRequest = useStore((s) => s.clearFolderDialogRequest);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [secretDialogOpenLocal, setSecretDialogOpenLocal] = useState(false);
  const [editingLink, setEditingLink] = useState<FolderLink | null>(null);
  const [editingSecret, setEditingSecret] = useState<FolderSecret | null>(null);
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<FolderLink | null>(null);
  const [deleteSecretTarget, setDeleteSecretTarget] = useState<FolderSecret | null>(null);

  const secretDialogOpen = secretDialogOpenLocal;
  const closeSecretDialog = () => {
    setSecretDialogOpenLocal(false);
    setEditingSecret(null);
  };

  const folder = folders.find((f) => f.id === folderId);

  const links = useMemo(
    () => folderLinks.filter((l) => l.folderId === folderId).sort((a, b) => a.order - b.order),
    [folderLinks, folderId],
  );

  const secrets = useMemo(
    () => folderSecrets.filter((s) => s.folderId === folderId).sort((a, b) => a.order - b.order),
    [folderSecrets, folderId],
  );

  const tasks = useMemo(
    () =>
      notes
        .filter((n) => n.folderId === folderId && n.isTask)
        .sort((a, b) => {
          if (!a.scheduledAt && !b.scheduledAt) return a.order - b.order;
          if (!a.scheduledAt) return -1;
          if (!b.scheduledAt) return 1;
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        }),
    [notes, folderId],
  );

  const noteCount = notes.filter((n) => n.folderId === folderId).length;
  const linkMap = useMemo(() => Object.fromEntries(links.map((l) => [l.id, l.title])), [links]);

  const handleSaveLink = (title: string, url: string) => {
    if (editingLink) updateFolderLink(editingLink.id, { title, url });
    else createFolderLink(folderId, title, url);
    setEditingLink(null);
  };

  const handleSaveSecret = (data: SecretFormData) => {
    if (editingSecret) updateFolderSecret(editingSecret.id, data);
    else createFolderSecret(folderId, data);
    setEditingSecret(null);
  };

  const handleNewTask = () => {
    const id = createNote(folderId, 'New Task');
    updateNote(id, { isTask: true, calendarColor: folder?.calendarColor ?? 'blue' });
  };

  const openAddSecret = () => {
    setEditingSecret(null);
    setSecretDialogOpenLocal(true);
  };

  useEffect(() => {
    if (folderDialogRequest === 'secret') {
      openAddSecret();
      clearFolderDialogRequest();
    }
    if (folderDialogRequest === 'link') {
      setEditingLink(null);
      setLinkDialogOpen(true);
      clearFolderDialogRequest();
    }
  }, [folderDialogRequest, clearFolderDialogRequest]);

  if (!folder) return null;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
      <QuickLinkDialog
        open={linkDialogOpen}
        onClose={() => {
          setLinkDialogOpen(false);
          setEditingLink(null);
        }}
        onSave={handleSaveLink}
        initialTitle={editingLink?.title ?? ''}
        initialUrl={editingLink?.url ?? ''}
        folderName={folder.name}
        mode={editingLink ? 'edit' : 'create'}
      />

      <SecretDialog
        open={secretDialogOpen}
        onClose={closeSecretDialog}
        onSave={handleSaveSecret}
        folderName={folder.name}
        links={links}
        initial={
          editingSecret
            ? {
                title: editingSecret.title,
                type: editingSecret.type,
                value: editingSecret.value,
                username: editingSecret.username,
                linkId: editingSecret.linkId,
                notes: editingSecret.notes,
              }
            : undefined
        }
        mode={editingSecret ? 'edit' : 'create'}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 md:px-8 py-6 md:py-8">
          <div className="mb-8">
            {onMobileBack && (
              <button
                type="button"
                onClick={onMobileBack}
                className="md:hidden flex items-center gap-1 mb-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ChevronLeft size={18} />
                Back to notes
              </button>
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Folder</p>
            <h1 className="text-2xl font-bold">{folder.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {noteCount} {noteCount === 1 ? 'note' : 'notes'}
              {links.length > 0 && ` · ${links.length} ${links.length === 1 ? 'link' : 'links'}`}
              {secrets.length > 0 && ` · ${secrets.length} ${secrets.length === 1 ? 'credential' : 'credentials'}`}
            </p>
          </div>

          {links.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Link2 size={16} className="text-primary" />
                  Quick Links
                </h2>
                <button
                  onClick={() => {
                    setEditingLink(null);
                    setLinkDialogOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                >
                  <Plus size={14} />
                  Add link
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                {links.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onEdit={() => {
                      setEditingLink(link);
                      setLinkDialogOpen(true);
                    }}
                    onDelete={() => setDeleteLinkTarget(link)}
                    onTogglePin={() => togglePinFolderLink(link.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {secrets.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound size={16} className="text-primary" />
                  Credentials
                </h2>
                <button onClick={openAddSecret} className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                  <Plus size={14} />
                  Add credential
                </button>
              </div>
              <div className="space-y-1.5">
                {secrets.map((secret) => (
                  <SecretCard
                    key={secret.id}
                    secret={secret}
                    linkTitle={secret.linkId ? linkMap[secret.linkId] : undefined}
                    onEdit={() => {
                      setEditingSecret(secret);
                      setSecretDialogOpenLocal(true);
                    }}
                    onDelete={() => setDeleteSecretTarget(secret)}
                  />
                ))}
              </div>
            </section>
          )}

          {tasks.length > 0 && (
            <section className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <CalendarClock size={16} className="text-primary" />
                  Outstanding Tasks
                </h2>
                <button onClick={handleNewTask} className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                  <Plus size={14} />
                  New task
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onOpen={() => selectNote(task.id)}
                    onColorChange={(calendarColor) => updateNote(task.id, { calendarColor })}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <FolderColorBar folderId={folderId} />

      <ConfirmDialog
        open={!!deleteLinkTarget}
        title="Delete link?"
        message={
          deleteLinkTarget
            ? `"${deleteLinkTarget.title}" will be permanently deleted.`
            : ''
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteLinkTarget) deleteFolderLink(deleteLinkTarget.id);
        }}
        onClose={() => setDeleteLinkTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteSecretTarget}
        title="Delete credential?"
        message={
          deleteSecretTarget
            ? `"${deleteSecretTarget.title}" will be permanently deleted.`
            : ''
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteSecretTarget) deleteFolderSecret(deleteSecretTarget.id);
        }}
        onClose={() => setDeleteSecretTarget(null)}
      />
    </div>
  );
}
