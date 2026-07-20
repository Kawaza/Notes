import { useEffect, useRef } from 'react';

export interface OverflowMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface OverflowMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  items: OverflowMenuItem[];
  onClose: () => void;
  align?: 'left' | 'right';
}

export function OverflowMenu({ anchorRef, items, onClose, align = 'right' }: OverflowMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const timeoutId = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose, anchorRef]);

  const rect = anchorRef.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 4 : 0;
  const left = align === 'left' && rect ? rect.left : undefined;
  const right = align === 'right' && rect ? window.innerWidth - rect.right : undefined;

  return (
    <div
      ref={ref}
      className="fixed z-[110] min-w-[168px] py-1 rounded-lg border border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-100"
      style={{ top, left, right }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
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
