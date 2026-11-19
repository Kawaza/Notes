/** IANA timezone for FullCalendar — matches the OS/browser local zone. */
export function calendarTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    /* ignore */
  }
  return 'local';
}

function dateTimeFormatOptions(timeZone: string): Intl.DateTimeFormatOptions {
  const base: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  };
  if (timeZone !== 'local') return { ...base, timeZone };
  return base;
}

function ymdFormatOptions(timeZone: string): Intl.DateTimeFormatOptions {
  const base: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  if (timeZone !== 'local') return { ...base, timeZone };
  return base;
}

/** Minutes since midnight on the wall clock in `timeZone`. */
export function wallClockMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', dateTimeFormatOptions(timeZone)).formatToParts(
    date,
  );
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

/** Calendar date yyyy-mm-dd in `timeZone` for comparing “today”. */
export function calendarYmd(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', ymdFormatOptions(timeZone)).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}