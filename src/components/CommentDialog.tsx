import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X } from 'lucide-react';

type CommentDialogProps = {
  open: boolean;
  initialComment?: string;
  onSave: (comment: string) => void;
  onRemove?: () => void;
  onClose: () => void;
};

export function CommentDialog({
  open,
  initialComment = '',
  onSave,
  onRemove,
  onClose,
}: CommentDialogProps) {
  const [text, setText] = useState(initialComment);

  useEffect(() => {
    if (open) setText(initialComment);
  }, [open, initialComment]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comment-dialog-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" />
            <h2 id="comment-dialog-title" className="text-base font-medium text-foreground">
              {initialComment ? 'Edit comment' : 'Add comment'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <form
          className="px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(text.trim());
            onClose();
          }}
        >
          <label className="block text-sm text-muted-foreground mb-1.5" htmlFor="comment-body">
            Comment
          </label>
          <textarea
            id="comment-body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What should your team know about this?"
            autoFocus
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[96px]"
          />
          <div className="flex items-center justify-between gap-2 mt-4 pt-2">
            {onRemove && initialComment ? (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
                className="text-sm text-destructive hover:underline cursor-pointer"
              >
                Remove comment
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
