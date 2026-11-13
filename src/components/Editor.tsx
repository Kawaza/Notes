import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMobileKeyboardInset } from '../hooks/useMobileKeyboardInset';
import { useIsMobile, usePrefersCoarsePointer } from '../hooks/useIsMobile';
import { ImageLightbox, useNoteImageLightbox, type LightboxImage } from './ImageLightbox';
import { IMAGE_SRC_PLACEHOLDER } from '../utils/noteImageStorage';
import {
  Trash2,
  Pin,
  Maximize2,
  X,
  File,
  Download,
  Copy,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  MoreVertical,
  PanelLeft,
} from 'lucide-react';
import { OverflowMenu } from './OverflowMenu';
import { useStore } from '../store/useStore';
import { useResolvedNote } from '../hooks/useResolvedNote';
import {
  isWorkspaceArchiveSelectionId,
  isWorkspaceFolderSelectionId,
  isWorkspaceNoteSelectionId,
  isWorkspaceTaskSelectionId,
  parseWorkspaceFolderSelectionId,
  parseWorkspaceNoteSelectionId,
  parseWorkspaceTaskSelectionId,
} from '../types/company';
import { workspaceFolderToFolder } from '../utils/workspaceMappers';
import { useCompanyStore } from '../store/companyStore';
import { TaskSchedulePanel } from './TaskSchedulePanel';
import { MarkdownEditor } from './MarkdownEditor';
import { RichTextEditor, insertImagesFromFiles } from './RichTextEditor';
import { FolderOverview } from './FolderOverview';
import { MY_TASKS_ID, isFolderArchived } from '../types';
import { useAuthStore } from '../store/authStore';
import { WorkspaceTaskMetaBar } from './WorkspaceTaskMetaBar';
import { NoteCollaborationBanner } from './NoteCollaborationBanner';
import { useWorkspaceNoteCollaboration } from '../hooks/useWorkspaceNoteCollaboration';
import type { NoteAttachment } from '../types';
import type { Editor as TiptapEditor } from '@tiptap/core';
import {
  getEmbeddedImageAttachmentIds,
  getEmbeddedImageSrcs,
  removeEmbeddedImageFromHtml,
} from '../utils/noteImages';

interface EditorProps {
  noteId?: string;
  compact?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
  onActiveNoteIdChange?: (id: string) => void;
  onMobileBack?: () => void;
  onOpenNav?: () => void;
  landscapeFocus?: boolean;
  /** Calendar side panel: edits may target a linked task; delete removes block only. */
  calendarBlockMode?: boolean;
}

function isImageAttachment(attachment: NoteAttachment) {
  return attachment.mimeType.startsWith('image/');
}

function downloadAttachment(attachment: NoteAttachment) {
  const a = document.createElement('a');
  a.href = attachment.dataUrl;
  a.download = attachment.name;
  a.click();
}

export function Editor({
  noteId: noteIdProp,
  compact,
  onExpand,
  onClose,
  onActiveNoteIdChange,
  onMobileBack,
  onOpenNav,
  landscapeFocus,
  calendarBlockMode,
}: EditorProps = {}) {
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const activeNoteId = noteIdProp ?? selectedNoteId;
  const calendarBlock = useStore((s) =>
    activeNoteId ? s.notes.find((n) => n.id === activeNoteId && n.isCalendarBlock) : undefined,
  );
  const note = useResolvedNote(activeNoteId);
  const contentEditId =
    calendarBlock?.linkedTaskId && calendarBlockMode ? calendarBlock.linkedTaskId : activeNoteId;
  const updateNote = useStore((s) => s.updateNote);
  const patchPersonalTask = useStore((s) => s.patchPersonalTask);
  const deleteNote = useStore((s) => s.deleteNote);
  const duplicateNote = useStore((s) => s.duplicateNote);
  const archiveNote = useStore((s) => s.archiveNote);
  const restoreNote = useStore((s) => s.restoreNote);
  const togglePinNote = useStore((s) => s.togglePinNote);
  const addAttachment = useStore((s) => s.addAttachment);
  const removeAttachment = useStore((s) => s.removeAttachment);
  const openNoteByTitle = useStore((s) => s.openNoteByTitle);
  const folders = useStore((s) => s.folders);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const richEditorRef = useRef<TiptapEditor | null>(null);
  const mobileOverflowRef = useRef<HTMLButtonElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const [mobileOverflowOpen, setMobileOverflowOpen] = useState(false);
  const isMobileEditorLayout = Boolean((onMobileBack || landscapeFocus) && !compact);
  useMobileKeyboardInset(editorScrollRef, isMobileEditorLayout, activeNoteId);
  const isMobile = useIsMobile();
  const prefersCoarsePointer = usePrefersCoarsePointer();
  const imageLightboxEnabled = isMobile || prefersCoarsePointer;
  const { image: lightboxImage, close: closeLightbox, openImage: openLightbox } =
    useNoteImageLightbox(editorScrollRef, imageLightboxEnabled);

  const wsFolderId = parseWorkspaceFolderSelectionId(selectedFolderId)?.folderId ?? null;
  const foldersByCompany = useCompanyStore((s) => s.foldersByCompany);
  const tasksByFolder = useCompanyStore((s) => s.tasksByFolder);
  const membersByCompany = useCompanyStore((s) => s.membersByCompany);
  const companies = useCompanyStore((s) => s.companies);
  const profilesByUserId = useCompanyStore((s) => s.profilesByUserId);
  const patchWorkspaceTask = useCompanyStore((s) => s.patchWorkspaceTask);
  const openWorkspaceTask = useStore((s) => s.openWorkspaceTask);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const currentUserProfile = useAuthStore((s) => s.profile);
  const wsFolderRaw = useMemo(() => {
    if (!wsFolderId) return null;
    for (const list of Object.values(foldersByCompany)) {
      const hit = list.find((f) => f.id === wsFolderId);
      if (hit) return hit;
    }
    return null;
  }, [foldersByCompany, wsFolderId]);

  const openNoteImagePreview = useCallback(
    (target: LightboxImage) => {
      let src = target.src;
      if (
        note &&
        target.attachmentId &&
        (!src || src === IMAGE_SRC_PLACEHOLDER)
      ) {
        const att = note.attachments.find((a) => a.id === target.attachmentId);
        if (att?.dataUrl) src = att.dataUrl;
      }
      if (!src || src === IMAGE_SRC_PLACEHOLDER) return;
      openLightbox({ src, alt: target.alt, attachmentId: target.attachmentId });
    },
    [note, openLightbox],
  );
  const myAssignedTasks = useCompanyStore((s) => s.myAssignedTasks);
  const loadFolderContent = useCompanyStore((s) => s.loadFolderContent);

  const workspaceTaskFolderId = useMemo(() => {
    if (note?.workspaceTaskMeta?.rawFolderId) return note.workspaceTaskMeta.rawFolderId;
    if (note?.folderId && isWorkspaceFolderSelectionId(note.folderId)) {
      return parseWorkspaceFolderSelectionId(note.folderId)?.folderId ?? null;
    }
    if (note?.folderId && isWorkspaceNoteSelectionId(note.id)) {
      const raw = note.folderId;
      return parseWorkspaceFolderSelectionId(raw)?.folderId ?? null;
    }
    if (note?.folderId) {
      const parsed = parseWorkspaceFolderSelectionId(note.folderId);
      if (parsed) return parsed.folderId;
    }
    return wsFolderId;
  }, [note?.folderId, note?.workspaceTaskMeta?.rawFolderId, note?.id, wsFolderId]);

  useEffect(() => {
    if (!workspaceTaskFolderId) return;
    const folderTasks = tasksByFolder[workspaceTaskFolderId];
    if (folderTasks === undefined) {
      void loadFolderContent(workspaceTaskFolderId);
    }
  }, [workspaceTaskFolderId, tasksByFolder, loadFolderContent]);

  const workspaceTaskSuggestions = useMemo(() => {
    const merged = new Map<string, { id: string; title: string; folderId: string }>();

    const addRows = (rows: { id: string; title: string; folderId: string; archived?: boolean }[]) => {
      for (const t of rows) {
        if (t.archived) continue;
        merged.set(t.id, {
          id: t.id,
          title: t.title || 'Untitled task',
          folderId: t.folderId,
        });
      }
    };

    if (workspaceTaskFolderId) {
      addRows(tasksByFolder[workspaceTaskFolderId] ?? []);
    }
    for (const rows of Object.values(tasksByFolder)) {
      addRows(rows);
    }
    addRows(myAssignedTasks);

    return Array.from(merged.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [tasksByFolder, workspaceTaskFolderId, myAssignedTasks]);

  const linkedTaskSelectionId = calendarBlock?.linkedTaskId ?? null;

  const workspaceTaskMeta = useMemo(() => {
    const selectionId =
      linkedTaskSelectionId && isWorkspaceTaskSelectionId(linkedTaskSelectionId)
        ? linkedTaskSelectionId
        : isWorkspaceTaskSelectionId(activeNoteId ?? '')
          ? activeNoteId
          : null;
    if (!selectionId) return null;
    const raw = parseWorkspaceTaskSelectionId(selectionId);
    if (!raw) return null;
    for (const rows of Object.values(tasksByFolder)) {
      const hit = rows.find((t) => t.id === raw.taskId);
      if (hit) return hit;
    }
    return useCompanyStore.getState().myAssignedTasks.find((t) => t.id === raw.taskId) ?? null;
  }, [activeNoteId, linkedTaskSelectionId, tasksByFolder]);

  const workspaceTaskId = useMemo(() => {
    if (linkedTaskSelectionId && isWorkspaceTaskSelectionId(linkedTaskSelectionId)) {
      return parseWorkspaceTaskSelectionId(linkedTaskSelectionId)?.taskId ?? null;
    }
    if (!activeNoteId || !isWorkspaceTaskSelectionId(activeNoteId)) return null;
    return parseWorkspaceTaskSelectionId(activeNoteId)?.taskId ?? null;
  }, [activeNoteId, linkedTaskSelectionId]);

  const folder = note
    ? isWorkspaceNoteSelectionId(note.id) && wsFolderRaw
      ? workspaceFolderToFolder(wsFolderRaw)
      : folders.find((f) => f.id === note.folderId)
    : isWorkspaceFolderSelectionId(selectedFolderId) && wsFolderRaw
      ? workspaceFolderToFolder(wsFolderRaw)
      : null;

  const folderBreadcrumb = useMemo(() => {
    if (note?.workspaceTaskMeta) {
      const meta = note.workspaceTaskMeta;
      const company = companies.find((c) => c.id === meta.companyId);
      let folderName: string | null = null;
      for (const list of Object.values(foldersByCompany)) {
        const hit = list.find((f) => f.id === meta.rawFolderId);
        if (hit) {
          folderName = hit.name;
          break;
        }
      }
      if (company && folderName) return `${company.name} / ${folderName}`;
      return folderName ?? company?.name ?? null;
    }
    return folder?.name ?? null;
  }, [note?.workspaceTaskMeta, companies, foldersByCompany, folder?.name]);
  const isMarkdown = note?.contentType === 'markdown';

  const workspaceNoteId = useMemo(() => {
    if (!note || !isWorkspaceNoteSelectionId(note.id)) return null;
    return parseWorkspaceNoteSelectionId(note.id)?.noteId ?? null;
  }, [note]);

  useWorkspaceNoteCollaboration(workspaceNoteId, Boolean(note && !isMarkdown));

  const collaborationConflict = useCompanyStore((s) =>
    workspaceNoteId ? s.workspaceNoteConflicts[workspaceNoteId] : undefined,
  );
  const resolveWorkspaceNoteLoadTheirs = useCompanyStore((s) => s.resolveWorkspaceNoteLoadTheirs);
  const resolveWorkspaceNoteKeepMine = useCompanyStore((s) => s.resolveWorkspaceNoteKeepMine);
  const clearWorkspaceNoteConflict = useCompanyStore((s) => s.clearWorkspaceNoteConflict);
  const workspaceArchiveView = isWorkspaceArchiveSelectionId(selectedFolderId);
  const isWorkspaceItem = Boolean(
    note && (isWorkspaceNoteSelectionId(note.id) || isWorkspaceTaskSelectionId(note.id)),
  );
  const canArchive =
    !workspaceArchiveView &&
    (isWorkspaceItem || Boolean(folder && !isFolderArchived(folder)));
  const canRestoreWorkspace = workspaceArchiveView && isWorkspaceItem;

  const handleTitleChange = useCallback(
    (title: string) => {
      if (contentEditId) updateNote(contentEditId, { title });
    },
    [contentEditId, updateNote]
  );

  const handleRichUpdate = useCallback(
    (html: string) => {
      if (!contentEditId || !note) return;

      updateNote(contentEditId, { content: html });

      if (isWorkspaceTaskSelectionId(contentEditId)) return;

      let attachments: NoteAttachment[] = [];
      if (isWorkspaceNoteSelectionId(contentEditId)) {
        const raw = parseWorkspaceNoteSelectionId(contentEditId);
        if (!raw) return;
        for (const list of Object.values(useCompanyStore.getState().notesByFolder)) {
          const hit = list.find((n) => n.id === raw.noteId);
          if (hit) {
            attachments = hit.attachments ?? [];
            break;
          }
        }
      } else {
        const currentNote = useStore.getState().notes.find((n) => n.id === contentEditId);
        if (!currentNote) return;
        attachments = currentNote.attachments;
      }

      const idsInContent = getEmbeddedImageAttachmentIds(html);
      const srcsInContent = getEmbeddedImageSrcs(html);
      for (const attachment of attachments) {
        if (!isImageAttachment(attachment)) continue;
        const stillEmbedded =
          (attachment.id && idsInContent.has(attachment.id)) || srcsInContent.has(attachment.dataUrl);
        if (!stillEmbedded) {
          removeAttachment(contentEditId, attachment.id);
        }
      }
    },
    [contentEditId, note, updateNote, removeAttachment],
  );

  const handleRemoveAttachment = useCallback(
    (attachmentId: string) => {
      if (!activeNoteId || !note) return;
      const attachment = note.attachments.find((a) => a.id === attachmentId);
      if (attachment && isImageAttachment(attachment) && !isMarkdown) {
        const nextContent = removeEmbeddedImageFromHtml(note.content, {
          attachmentId: attachment.id,
          src: attachment.dataUrl,
        });
        if (nextContent !== note.content) {
          updateNote(activeNoteId, { content: nextContent });
        }
      }
      removeAttachment(activeNoteId, attachmentId);
    },
    [activeNoteId, note, isMarkdown, updateNote, removeAttachment],
  );

  const handleAddAttachment = useCallback(
    async (file: File): Promise<NoteAttachment | null> => {
      if (!activeNoteId) return null;
      try {
        return await addAttachment(activeNoteId, file);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not add image');
        return null;
      }
    },
    [activeNoteId, addAttachment],
  );

  const handleMarkdownFileDrop = useCallback(
    async (file: File) => {
      if (!activeNoteId || !note) return;
      const attachment = await handleAddAttachment(file);
      if (!attachment) return;

      if (isMarkdown) {
        updateNote(activeNoteId, {
          content: `${note.content}\n[📎 ${file.name}](${attachment.dataUrl})\n`,
        });
      }
    },
    [activeNoteId, handleAddAttachment, updateNote, note, isMarkdown],
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    if (richEditorRef.current) {
      await insertImagesFromFiles(richEditorRef.current, files, handleAddAttachment);
      return;
    }

    for (const file of files) {
      await handleMarkdownFileDrop(file);
    }
  };

  if (!note) {
    if (
      !compact &&
      selectedFolderId &&
      selectedFolderId !== MY_TASKS_ID &&
      !noteIdProp
    ) {
      return (
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <FolderOverview folderId={selectedFolderId} />
        </div>
      );
    }

    return (
      <div className={`flex flex-col items-center justify-center text-center bg-background ${compact ? 'h-full' : 'flex-1'}`}>
        <div className="max-w-sm px-4">
          <h2 className="text-lg font-medium text-foreground/80">Select a note</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Choose a note from the list or press{' '}
            <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Ctrl+N</kbd> to create one.
          </p>
        </div>
      </div>
    );
  }

  const padding = compact ? 'px-4' : onMobileBack ? 'px-4 md:px-8' : 'px-8';
  const isMobileEditor = isMobileEditorLayout;

  const mobileOverflowItems = [
    ...(!isWorkspaceTaskSelectionId(note.id)
      ? [
          {
            label: note.pinned ? 'Unpin note' : 'Pin note',
            icon: <Pin size={14} />,
            onClick: () => togglePinNote(note.id),
          },
        ]
      : []),
    {
      label: 'Duplicate note',
      icon: <Copy size={14} />,
      onClick: () => duplicateNote(note.id),
    },
    ...(canRestoreWorkspace
      ? [
          {
            label: 'Restore to workspace',
            icon: <ArchiveRestore size={14} />,
            onClick: () => restoreNote(note.id),
          },
        ]
      : canArchive
        ? [
            {
              label: 'Archive note',
              icon: <Archive size={14} />,
              onClick: () => archiveNote(note.id),
            },
          ]
        : []),
    {
      label: 'Delete note',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => {
        deleteNote(note.id);
        onClose?.();
        onMobileBack?.();
      },
    },
  ];

  return (
    <div className={`flex flex-col bg-background h-full overflow-hidden max-md:overflow-x-hidden ${compact ? '' : 'flex-1'}`}>
      {isMobileEditor ? (
        <div className="shrink-0 border-b border-border">
          <div className="flex items-start gap-1 px-3 py-2.5 max-w-full">
            {landscapeFocus ? (
              <button
                type="button"
                onClick={onOpenNav}
                className="p-2 -ml-1 mt-0.5 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                aria-label="Open menu"
              >
                <PanelLeft size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onMobileBack}
                className="p-2 -ml-1 mt-0.5 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                aria-label="Back to notes"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="flex-1 min-w-0 pt-0.5">
              {folderBreadcrumb && (
                <p className="text-[11px] text-muted-foreground truncate mb-0.5">{folderBreadcrumb}</p>
              )}
              <input
                value={note.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Untitled"
                className="w-full text-base font-semibold bg-transparent outline-none placeholder:text-muted-foreground/40"
              />
            </div>
            <button
              ref={mobileOverflowRef}
              type="button"
              onClick={() => setMobileOverflowOpen((v) => !v)}
              className="p-2 mt-0.5 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
              aria-label="Note options"
            >
              <MoreVertical size={18} />
            </button>
            {mobileOverflowOpen && (
              <OverflowMenu
                anchorRef={mobileOverflowRef}
                items={mobileOverflowItems}
                onClose={() => setMobileOverflowOpen(false)}
              />
            )}
          </div>
        </div>
      ) : (
        <div className={`flex items-center justify-between ${padding} pt-4 pb-2 border-b border-border/50 gap-2`}>
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <div className="flex-1 min-w-0">
              {!compact && folderBreadcrumb && (
                <p className="text-xs text-muted-foreground mb-1">{folderBreadcrumb}</p>
              )}
              <input
                value={note.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Untitled"
                className={`w-full font-bold bg-transparent outline-none placeholder:text-muted-foreground/40 ${
                  compact ? 'text-lg' : 'text-xl md:text-2xl'
                }`}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {compact && onExpand && (
              <button
                onClick={onExpand}
                className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Expand to full editor"
              >
                <Maximize2 size={16} />
              </button>
            )}
            {compact && onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            )}
            {!compact && (
              <>
                {!isWorkspaceTaskSelectionId(note.id) && (
                  <button
                    onClick={() => togglePinNote(note.id)}
                    className={`p-2 rounded-md transition-colors cursor-pointer ${
                      note.pinned ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={note.pinned ? 'Unpin' : 'Pin note'}
                  >
                    <Pin size={16} />
                  </button>
                )}
                <button
                  onClick={() => duplicateNote(note.id)}
                  className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Duplicate note"
                >
                  <Copy size={16} />
                </button>
                {canRestoreWorkspace && (
                  <button
                    onClick={() => restoreNote(note.id)}
                    className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Restore to workspace"
                  >
                    <ArchiveRestore size={16} />
                  </button>
                )}
                {canArchive && (
                  <button
                    onClick={() => archiveNote(note.id)}
                    className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Archive note"
                  >
                    <Archive size={16} />
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => {
                deleteNote(calendarBlockMode ? (activeNoteId ?? note.id) : note.id);
                onClose?.();
              }}
              className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title={calendarBlockMode ? 'Remove calendar block' : 'Delete note'}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {workspaceTaskMeta && workspaceTaskId && (
        <WorkspaceTaskMetaBar
          variant="header"
          assigneeId={workspaceTaskMeta.assigneeId}
          status={workspaceTaskMeta.status}
          dueAt={workspaceTaskMeta.dueAt}
          updatedAt={workspaceTaskMeta.updatedAt}
          members={membersByCompany[workspaceTaskMeta.companyId] ?? []}
          profilesByUserId={profilesByUserId}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onChange={(patch) => patchWorkspaceTask(workspaceTaskId, patch)}
        />
      )}

      {note?.isTask &&
        !workspaceTaskMeta &&
        !isWorkspaceTaskSelectionId(note.id) &&
        currentUserId && (
        <WorkspaceTaskMetaBar
          variant="header"
          assigneeId={currentUserId}
          status={note.personalTaskMeta?.status ?? 'todo'}
          dueAt={note.personalTaskMeta?.dueAt}
          updatedAt={note.updatedAt}
          members={[]}
          profilesByUserId={profilesByUserId}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          assigneeLocked
          onChange={(patch) => {
            if (activeNoteId) patchPersonalTask(activeNoteId, patch);
          }}
        />
      )}

      {collaborationConflict && workspaceNoteId && (
        <NoteCollaborationBanner
          serverNote={collaborationConflict}
          onLoadTheirs={() => resolveWorkspaceNoteLoadTheirs(workspaceNoteId)}
          onKeepMine={() => resolveWorkspaceNoteKeepMine(workspaceNoteId)}
          onDismiss={() => clearWorkspaceNoteConflict(workspaceNoteId)}
        />
      )}

      <div
        ref={editorScrollRef}
        className={`flex-1 overflow-y-auto mobile-editor-scroll ${padding} pb-6 flex flex-col min-h-0 max-md:overflow-x-hidden`}
        onDragOver={(e) => {
          if (isMarkdown) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!isMarkdown) return;
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files);
          files.forEach((file) => void handleMarkdownFileDrop(file));
        }}
      >
        {isMarkdown ? (
          <MarkdownEditor
            key={note.id}
            content={note.content}
            onChange={(content) => updateNote(note.id, { content })}
            onWikiClick={(title) => {
              if (!openNoteByTitle(title)) {
                alert(`No note found matching "${title}"`);
              }
            }}
            onFileDrop={handleMarkdownFileDrop}
          />
        ) : (
          <RichTextEditor
            key={note.id}
            noteId={note.id}
            content={note.content}
            attachments={note.attachments}
            onUpdate={handleRichUpdate}
            onAddAttachment={handleAddAttachment}
            onFileClick={() => fileInputRef.current?.click()}
            onEditorReady={(ed) => {
              richEditorRef.current = ed;
            }}
            compact={compact}
            onPreviewImage={
              imageLightboxEnabled ? openNoteImagePreview : undefined
            }
            workspaceTaskSuggestions={workspaceTaskSuggestions}
            onOpenWorkspaceTask={openWorkspaceTask}
          />
        )}
        {!compact && note.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {note.attachments.map((a) => (
                <div key={a.id} className="relative group">
                  {isImageAttachment(a) ? (
                    <img
                      src={a.dataUrl}
                      alt={a.name}
                      data-note-image-thumb
                      className="h-20 w-20 object-cover rounded-lg border border-border max-md:cursor-zoom-in"
                    />
                  ) : (
                    <button
                      onClick={() => downloadAttachment(a)}
                      className="flex items-center gap-2 h-20 min-w-[120px] max-w-[180px] px-3 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors cursor-pointer text-left"
                      title="Download file"
                    >
                      <File size={18} className="shrink-0 text-muted-foreground" />
                      <span className="text-xs truncate">{a.name}</span>
                      <Download size={12} className="shrink-0 text-muted-foreground opacity-60" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveAttachment(a.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 max-md:opacity-100 cursor-pointer flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <TaskSchedulePanel
        note={note}
        compact={compact}
        onActiveNoteIdChange={(id) => {
          if (!id) onClose?.();
          else onActiveNoteIdChange?.(id);
        }}
      />
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
      {lightboxImage && (
        <ImageLightbox image={lightboxImage} onClose={closeLightbox} />
      )}
    </div>
  );
}
