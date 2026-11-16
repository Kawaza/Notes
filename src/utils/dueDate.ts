import { format, isBefore, startOfDay } from 'date-fns';

/** Local calendar date `yyyy-MM-dd` → ISO stored at local noon (stable across timezones). */
export function dueDateInputToIso(dateInput: string): string {
  const [y, m, d] = dateInput.split('-').map((n) => Number(n));
  if (!y || !m || !d) return new Date(dateInput).toISOString();
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}

export function dueDateToInputValue(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

export function formatDueDateLabel(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy');
}

/** FullCalendar all-day `start` value. */
export function dueDateToAllDayStart(iso: string): string {
  return dueDateToInputValue(iso);
}

export function isDueDateOverdue(iso: string, now = new Date()): boolean {
  return isBefore(startOfDay(new Date(iso)), startOfDay(now));
}