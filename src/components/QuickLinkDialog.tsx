import { useEffect, useRef, useState } from 'react';
import { Link2, X } from 'lucide-react';

interface QuickLinkDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (title: string, url: string) => void;
  initialTitle?: string;
  initialUrl?: string;
  folderName?: string;
  mode?: 'create' | 'edit';
}

export function QuickLinkDialog({
  open,
  onClose,
  onSave,
  initialTitle = '',
  initialUrl = '',
  folderName,
  mode = 'create',
}: QuickLinkDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setUrl(initialUrl);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, initialTitle, initialUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    if (!url.trim()) return;
    onSave(title, url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Link2 size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                {mode === 'edit' ? 'Edit Quick Link' : 'Add Quick Link'}
              </h2>
              {folderName && (
                <p className="text-xs text-muted-foreground">{folderName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Title
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Project Drive, Team Wiki"
              className="w-full px-3 py-2 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-shadow"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              URL
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/... or any web link"
              className="w-full px-3 py-2 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-shadow font-mono text-[13px]"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {mode === 'edit' ? 'Save Changes' : 'Add Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
