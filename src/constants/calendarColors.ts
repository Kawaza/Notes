export type CalendarColorId =
  | 'blue'
  | 'green'
  | 'purple'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'pink'
  | 'teal'
  | 'gray';

export interface CalendarColor {
  id: CalendarColorId;
  name: string;
  bg: string;
  border: string;
  text: string;
  bgDark: string;
  borderDark: string;
  textDark: string;
}

export const CALENDAR_COLORS: CalendarColor[] = [
  {
    id: 'blue',
    name: 'Blue',
    bg: '#dbeafe',
    border: '#60a5fa',
    text: '#1e40af',
    bgDark: '#1e3a5f',
    borderDark: '#3b82f6',
    textDark: '#bfdbfe',
  },
  {
    id: 'green',
    name: 'Green',
    bg: '#dcfce7',
    border: '#4ade80',
    text: '#166534',
    bgDark: '#14532d',
    borderDark: '#22c55e',
    textDark: '#bbf7d0',
  },
  {
    id: 'purple',
    name: 'Purple',
    bg: '#ede9fe',
    border: '#a78bfa',
    text: '#5b21b6',
    bgDark: '#3b0764',
    borderDark: '#8b5cf6',
    textDark: '#ddd6fe',
  },
  {
    id: 'red',
    name: 'Red',
    bg: '#fee2e2',
    border: '#f87171',
    text: '#991b1b',
    bgDark: '#450a0a',
    borderDark: '#ef4444',
    textDark: '#fecaca',
  },
  {
    id: 'orange',
    name: 'Orange',
    bg: '#ffedd5',
    border: '#fb923c',
    text: '#9a3412',
    bgDark: '#431407',
    borderDark: '#f97316',
    textDark: '#fed7aa',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    bg: '#fef9c3',
    border: '#facc15',
    text: '#854d0e',
    bgDark: '#422006',
    borderDark: '#eab308',
    textDark: '#fef08a',
  },
  {
    id: 'pink',
    name: 'Pink',
    bg: '#fce7f3',
    border: '#f472b6',
    text: '#9d174d',
    bgDark: '#500724',
    borderDark: '#ec4899',
    textDark: '#fbcfe8',
  },
  {
    id: 'teal',
    name: 'Teal',
    bg: '#ccfbf1',
    border: '#2dd4bf',
    text: '#115e59',
    bgDark: '#042f2e',
    borderDark: '#14b8a6',
    textDark: '#99f6e4',
  },
  {
    id: 'gray',
    name: 'Gray',
    bg: '#f4f4f5',
    border: '#a1a1aa',
    text: '#3f3f46',
    bgDark: '#27272a',
    borderDark: '#71717a',
    textDark: '#e4e4e7',
  },
];

export function getCalendarColor(id?: string): CalendarColor {
  return CALENDAR_COLORS.find((c) => c.id === id) ?? CALENDAR_COLORS[0];
}

export function getEventStyle(colorId: string | undefined, isDark: boolean) {
  const color = getCalendarColor(colorId);
  return {
    backgroundColor: isDark ? color.bgDark : color.bg,
    borderColor: isDark ? color.borderDark : color.border,
    textColor: isDark ? color.textDark : color.text,
  };
}
