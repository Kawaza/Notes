import { useEffect, useRef } from 'react';
import { FileText, Link2, KeyRound } from 'lucide-react';

interface AddItemMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onNewNote: () => void;
  onQuickLink: () => void;
  onSecret?: () => void;
}

export function AddItemMenu({ anchorRef, onClose, onNewNote, onQuickLink, onSecret }: AddItemMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        ref.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose, anchorRef]);

  const rect = anchorRef.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 4 : 0;
  const right = rect ? window.innerWidth - rect.right : 0;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[168px] py-1 rounded-lg border border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-100"
      style={{ top, right }}
    >
      <button
        onClick={() => {
          onNewNote();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors cursor-pointer"
      >
        <FileText size={15} className="text-muted-foreground" />
        New Note
      </button>
      <button
        onClick={() => {
          onQuickLink();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors cursor-pointer"
      >
        <Link2 size={15} className="text-muted-foreground" />
        Quick Link
      </button>
      {onSecret && (
        <button
          onClick={() => {
            onSecret();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors cursor-pointer"
        >
          <KeyRound size={15} className="text-muted-foreground" />
          Credential
        </button>
      )}
    </div>
  );
}
