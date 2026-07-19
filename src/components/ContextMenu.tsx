import { useEffect, useRef } from 'react';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
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
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] py-1 rounded-lg border border-border bg-background shadow-lg animate-in fade-in"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          disabled={item.disabled}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            item.danger
              ? 'text-destructive hover:bg-destructive/10'
              : 'hover:bg-muted'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
