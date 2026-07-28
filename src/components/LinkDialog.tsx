import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link2, X } from 'lucide-react';

type LinkDialogProps = {
  open: boolean;
  initialUrl?: string;
  onSave: (url: string) => void;
  onClose: () => void;
};

export function LinkDialog({ open, initialUrl = '', onSave, onClose }: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (open) setUrl(initialUrl);
  }, [open, initialUrl]);

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
        aria-labelledby="link-dialog-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-primary" />
            <h2 id="link-dialog-title" className="text-base font-medium text-foreground">
              {initialUrl ? 'Edit link' : 'Add link'}
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
            onSave(url);
            onClose();
          }}
        >
          <label className="block text-sm text-muted-foreground mb-1.5" htmlFor="link-url">
            URL
          </label>
          <input
            id="link-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Select text first to link it, or leave text unselected to insert a new link.
          </p>
          <div className="flex items-center justify-end gap-2 mt-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              {initialUrl ? 'Save link' : 'Add link'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
