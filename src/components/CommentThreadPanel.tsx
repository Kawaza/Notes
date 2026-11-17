import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import type { NoteCommentReply } from '../utils/noteCommentThread';
import { usePrefersCoarsePointer } from '../hooks/useIsMobile';
import { MemberMentionTextarea } from './MemberMentionTextarea';
import type { MemberMentionSuggestion } from '../types/memberMention';

type CommentThreadPanelProps = {
  open: boolean;
  anchor: { top: number; left: number };
  root: {
    text: string;
    authorName?: string | null;
    authorUserId?: string | null;
  };
  replies: NoteCommentReply[];
  currentUserId: string | null;
  onClose: () => void;
  onReply: (text: string) => void;
  onEditRoot: () => void;
  onEditReply: (replyId: string) => void;
  onDeleteRoot: () => void;
  onDeleteReply: (replyId: string) => void;
  memberMentionSuggestions?: MemberMentionSuggestion[];
};

function clampPanelPosition(top: number, left: number, width: number, height: number) {
  const margin = 8;
  const maxLeft = window.innerWidth - width - margin;
  const maxTop = window.innerHeight - height - margin;
  return {
    top: Math.min(Math.max(margin, top), Math.max(margin, maxTop)),
    left: Math.min(Math.max(margin, left), Math.max(margin, maxLeft)),
  };
}

export function CommentThreadPanel({
  open,
  anchor,
  root,
  replies,
  currentUserId,
  onClose,
  onReply,
  onEditRoot,
  onEditReply,
  onDeleteRoot,
  onDeleteReply,
  memberMentionSuggestions = [],
}: CommentThreadPanelProps) {
  const coarsePointer = usePrefersCoarsePointer();
  const editActionsClass = coarsePointer
    ? 'flex items-center justify-end gap-0.5 mt-2'
    : 'flex items-center justify-end gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity';
  const panelRef = useRef<HTMLDivElement>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'root' } | { kind: 'reply'; id: string } | null>(
    null,
  );
  const [position, setPosition] = useState(anchor);

  const canEditRoot = Boolean(currentUserId && root.authorUserId === currentUserId);

  useEffect(() => {
    if (!open) {
      setReplyDraft('');
      setConfirmDelete(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition(clampPanelPosition(anchor.top, anchor.left, rect.width, rect.height));
  }, [open, anchor.top, anchor.left, replies.length]);

  const sortedReplies = useMemo(
    () => [...replies].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [replies],
  );

  if (!open) return null;

  const submitReply = () => {
    const text = replyDraft.trim();
    if (!text) return;
    onReply(text);
    setReplyDraft('');
  };

  return createPortal(
  <>
    <div
      className="fixed inset-0 z-[69]"
      aria-hidden
      onPointerDown={onClose}
    />
    <div
      ref={panelRef}
      data-comment-popover
      role="dialog"
      aria-label="Comment thread"
      className="fixed z-[70] w-[min(100vw-1.5rem,22rem)] max-h-[min(70vh,28rem)] flex flex-col rounded-xl border border-border bg-background shadow-xl"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare size={15} className="text-primary shrink-0" />
          <span className="text-sm font-medium truncate">Comment</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3 min-h-0">
        <div className="group rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
          {root.authorName && (
            <p className="text-[11px] font-medium text-muted-foreground mb-1">{root.authorName}</p>
          )}
          <p className="text-sm text-foreground whitespace-pre-wrap">{root.text}</p>
          {canEditRoot && (
            <div className={editActionsClass}>
              <button
                type="button"
                onClick={onEditRoot}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
                title="Edit comment"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete({ kind: 'root' })}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Delete comment"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {sortedReplies.map((reply) => {
          const canEdit = Boolean(currentUserId && reply.authorUserId === currentUserId);
          return (
            <div
              key={reply.id}
              className="group ml-3 rounded-lg border border-border/40 bg-background px-2.5 py-2"
            >
              <p className="text-[11px] font-medium text-muted-foreground mb-1">{reply.authorName}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{reply.text}</p>
              {canEdit && (
                <div className={editActionsClass.replace('mt-2', 'mt-1.5')}>
                  <button
                    type="button"
                    onClick={() => onEditReply(reply.id)}
                    className="p-1 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
                    title="Edit reply"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ kind: 'reply', id: reply.id })}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Delete reply"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2.5 space-y-2">
        <label className="text-[11px] font-medium text-muted-foreground" htmlFor="comment-reply">
          Reply
        </label>
        <MemberMentionTextarea
          id="comment-reply"
          value={replyDraft}
          onChange={setReplyDraft}
          members={memberMentionSuggestions}
          inlineMenu
          membersLoading={open && memberMentionSuggestions.length === 0}
          placeholder="Add a reply… @mention teammates"
          rows={2}
          className="w-full px-2.5 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[52px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submitReply();
            }
          }}
        />
        <SubmissionRow onSubmit={submitReply} disabled={!replyDraft.trim()} />
      </div>
    </div>

    <ConfirmDialog
      open={!!confirmDelete}
      title={confirmDelete?.kind === 'reply' ? 'Delete reply?' : 'Delete comment?'}
      message={
        confirmDelete?.kind === 'reply'
          ? 'This reply will be permanently removed from the thread.'
          : 'The comment, highlight, and all replies will be permanently removed.'
      }
      confirmLabel="Delete"
      danger
      onConfirm={() => {
        if (!confirmDelete) return;
        if (confirmDelete.kind === 'root') onDeleteRoot();
        else onDeleteReply(confirmDelete.id);
      }}
      onClose={() => setConfirmDelete(null)}
    />
  </>,
    document.body,
  );
}

function SubmissionRow({ onSubmit, disabled }: { onSubmit: () => void; disabled: boolean }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 cursor-pointer"
      >
        Post reply
      </button>
    </div>
  );
}