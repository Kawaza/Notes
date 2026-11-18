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