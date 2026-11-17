import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import {
  dueDateInputToIso,
  dueDateToInputValue,
  formatDueDateLabel,
} from '../utils/dueDate';
import { useStore } from '../store/useStore';

const PILL =
  'inline-flex items-center gap-1.5 h-8 rounded-lg border border-border/70 bg-muted/25 text-xs shrink-0 max-w-full';

export function DueDatePicker({
  dueAt,
  onChange,
}: {
  dueAt?: string;
  onChange: (iso: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const theme = useStore((s) => s.theme);

  const dueLabel = dueAt ? formatDueDateLabel(dueAt) : 'Set due date';
  const datePart = dueAt ? dueDateToInputValue(dueAt) : dueDateToInputValue(new Date().toISOString());

  const fieldClass =
    theme === 'dark'
      ? 'w-full px-2.5 py-2 text-sm rounded-md bg-muted/30 border border-border outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer [color-scheme:dark]'
      : 'w-full px-2.5 py-2 text-sm rounded-md bg-muted/30 border border-border outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer [color-scheme:light]';

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    el.focus();
    try {
      el.showPicker();
    } catch {
      el.click();
    }
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${PILL} pl-2.5 pr-2 min-w-[10.5rem] max-w-[15rem]`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full min-w-0 text-left cursor-pointer text-muted-foreground hover:text-foreground"
        title="Due date"
      >
        <Calendar size={13} className="shrink-0 text-foreground/75" />
        <span className="truncate tabular-nums font-medium flex-1">{dueLabel}</span>
        <ChevronDown size={12} className="shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[240px] rounded-lg border border-border bg-background p-3 shadow-lg">
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Due date</p>
          <button
            type="button"
            onClick={openDatePicker}
            className="block w-full text-left cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <input
              ref={dateInputRef}
              type="date"
              value={datePart}
              onChange={(e) => {
                const v = e.target.value;
                if (v) onChange(dueDateInputToIso(v));
              }}
              onClick={(e) => {
                e.stopPropagation();
                try {
                  e.currentTarget.showPicker();
                } catch {
                  /* browser may not support showPicker */
                }
              }}
              className={fieldClass}
              aria-label="Due date"
            />
          </button>
          <div className="flex justify-between mt-3 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-xs text-muted-foreground hover:text-destructive cursor-pointer px-1"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:opacity-90 cursor-pointer px-2 py-0.5"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}