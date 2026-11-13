import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';

const PILL =
  'inline-flex items-center gap-1.5 h-8 rounded-lg border border-border/70 bg-muted/25 text-xs shrink-0 max-w-full';

const fieldClass =
  'w-full px-2.5 py-1.5 text-sm rounded-md bg-muted/30 border border-border outline-none focus:ring-1 focus:ring-primary/40 [color-scheme:dark]';

export function DueDatePicker({
  dueAt,
  onChange,
}: {
  dueAt?: string;
  onChange: (iso: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const dueLabel = dueAt ? format(new Date(dueAt), 'MMM d, yyyy · h:mm a') : 'Set due date';

  const datePart = dueAt ? format(new Date(dueAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const timePart = dueAt ? format(new Date(dueAt), 'HH:mm') : '12:00';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const apply = (date: string, time: string) => {
    if (!date) return;
    onChange(new Date(`${date}T${time || '12:00'}`).toISOString());
  };

  return (
    <div ref={rootRef} className={`relative ${PILL} pl-2.5 pr-2 min-w-[10.5rem] max-w-[15rem]`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full min-w-0 text-left cursor-pointer text-muted-foreground hover:text-foreground"
        title="Due date"
      >
        <Calendar size={13} className="shrink-0 opacity-80" />
        <span className="truncate tabular-nums font-medium flex-1">{dueLabel}</span>
        <ChevronDown size={12} className="shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[240px] rounded-lg border border-border bg-background p-3 shadow-lg">
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Due date</p>
          <div className="space-y-2">
            <input
              type="date"
              value={datePart}
              onChange={(e) => apply(e.target.value, timePart)}
              className={fieldClass}
            />
            <input
              type="time"
              value={timePart}
              onChange={(e) => apply(datePart, e.target.value)}
              className={fieldClass}
            />
          </div>
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
