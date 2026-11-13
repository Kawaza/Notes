import { useEffect, useRef, useState } from 'react';
import { FolderOpen, X } from 'lucide-react';

export function AddSharedFolderDialog({
  open,
  onClose,
  onCreate,
  busy,
  workspaceName,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void | Promise<void>;
  busy?: boolean;
  workspaceName?: string;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
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

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    void onCreate(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderOpen size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Add shared folder</h2>
              <p className="text-xs text-muted-foreground">
                {workspaceName
                  ? `Adds to workspace “${workspaceName}” for everyone on that invite`
                  : 'Visible to everyone on this workspace invite'}
              </p>

            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Folder name</label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CME, Marketing"
            className="w-full px-3 py-2 text-sm rounded-lg bg-muted/30 border border-border outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || busy}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Adding…' : 'Add folder'}
          </button>
        </div>
      </div>
    </div>
  );
}
