import { useEffect, useRef } from 'react';
import { FolderOpen, FolderTree } from 'lucide-react';

interface AddFolderMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onAddFolder: () => void;
  onAddParentFolder: () => void;
}

export function AddFolderMenu({
  anchorRef,
  onClose,
  onAddFolder,
  onAddParentFolder,
}: AddFolderMenuProps) {
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
  const left = rect ? rect.left : 0;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-100"
      style={{ top, left }}
    >
      <button
        type="button"
        onClick={() => {
          onAddFolder();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors cursor-pointer"
      >
        <FolderOpen size={15} className="text-muted-foreground" />
        Add Folder
      </button>
      <button
        type="button"
        onClick={() => {
          onAddParentFolder();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors cursor-pointer"
      >
        <FolderTree size={15} className="text-muted-foreground" />
        Add Parent Folder
      </button>
    </div>
  );
}
