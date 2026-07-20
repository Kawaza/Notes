import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getCalendarColor, type CalendarColor } from '../constants/calendarColors';
import { isFolderArchived } from '../types';

type FolderSelectProps = {
  value: string;
  onChange: (folderId: string) => void;
  size?: 'sm' | 'md';
  className?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

const MENU_GAP = 4;

function folderDotStyle(color: CalendarColor, isDark: boolean) {
  return {
    backgroundColor: isDark ? color.borderDark : color.border,
  };
}

function estimateMenuHeight(count: number) {
  return count * 30 + 8;
}

export function FolderSelect({ value, onChange, size = 'md', className = '' }: FolderSelectProps) {
  const folders = useStore((s) => s.folders);
  const theme = useStore((s) => s.theme);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeFolders = useMemo(
    () => folders.filter((f) => !isFolderArchived(f)),
    [folders],
  );

  const selected = activeFolders.find((f) => f.id === value) ?? activeFolders[0];
  const isDark = theme === 'dark';

  const computeMenuPosition = () => {
    const el = rootRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? estimateMenuHeight(activeFolders.length);
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const spaceAbove = rect.top - MENU_GAP;
    const openAbove = menuHeight > spaceBelow && spaceAbove >= spaceBelow;

    return {
      top: openAbove ? rect.top - MENU_GAP - menuHeight : rect.bottom + MENU_GAP,
      left: rect.left,
      minWidth: rect.width,
    };
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const pos = computeMenuPosition();
      if (pos) setMenuPos(pos);
    };
    update();
    const raf = requestAnimationFrame(update);
    const onReposition = () => update();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, activeFolders.length]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
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
  }, [open]);

  const sizeClass =
    size === 'sm'
      ? 'h-6 px-1.5 text-xs gap-1 min-w-[88px] max-w-[112px]'
      : 'h-7 px-2 text-[13px] gap-1.5 min-w-[108px] max-w-[148px]';

  const chevronSize = size === 'sm' ? 11 : 12;

  const menu =
    open
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100] py-1 rounded-lg border border-border bg-background shadow-lg animate-in fade-in"
            style={{
              top: menuPos?.top ?? -9999,
              left: menuPos?.left ?? 0,
              minWidth: menuPos?.minWidth,
              maxWidth: 220,
              visibility: menuPos ? 'visible' : 'hidden',
            }}
          >
            {activeFolders.map((folder) => {
              const color = getCalendarColor(folder.calendarColor);
              const isSelected = folder.id === value;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    onChange(folder.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                    isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={folderDotStyle(color, isDark)}
                  />
                  <span className="truncate">{folder.name}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-primary/40 ${sizeClass}`}
        title="Folder"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected ? (
          <>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={folderDotStyle(getCalendarColor(selected.calendarColor), isDark)}
            />
            <span className="flex-1 truncate text-left">{selected.name}</span>
          </>
        ) : (
          <>
            <FolderOpen size={chevronSize} className="shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-left text-muted-foreground">Folder</span>
          </>
        )}
        <ChevronDown
          size={chevronSize}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}
