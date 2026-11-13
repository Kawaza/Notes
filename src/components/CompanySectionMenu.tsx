import { useEffect, useRef } from 'react';
import { FolderOpen } from 'lucide-react';

export function CompanySectionMenu({
  anchorRef,
  onClose,
  onAddFolder,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onAddFolder: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node) || anchorRef.current?.contains(e.target as Node)) return;
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
      className="fixed z-50 min-w-[220px] py-1 rounded-lg border border-border bg-background shadow-lg"
      style={{ top, left }}
    >
      <button
        type="button"
        onClick={() => {
          onAddFolder();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted cursor-pointer"
      >
        <FolderOpen size={15} className="text-muted-foreground" />
        Add shared folder
      </button>
    </div>
  );
}
