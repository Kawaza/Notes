import type { ColorPalette } from '../types';
import { getPalettePrimary } from '../constants/paletteColors';
import { CALENDAR_COLORS, type CalendarColor, type CalendarColorId } from '../constants/calendarColors';
import { COLOR_PALETTES } from '../constants/palettes';

export const THEME_CALENDAR_COLOR_ID = 'theme' as const;

export type StoredCalendarColorId = CalendarColorId | typeof THEME_CALENDAR_COLOR_ID;

export function defaultCalendarColorId(): StoredCalendarColorId {
  return THEME_CALENDAR_COLOR_ID;
}

/** Accent-aligned calendar colors: theme swatch first, then palette’s closest preset. */
export function calendarColorOptionsForPalette(palette: ColorPalette): CalendarColor[] {
  const accentId = paletteToPresetColorId(palette);
  const accent = CALENDAR_COLORS.find((c) => c.id === accentId) ?? CALENDAR_COLORS[0];
  const rest = CALENDAR_COLORS.filter((c) => c.id !== accent.id);
  return [accent, ...rest];
}

export function paletteToPresetColorId(palette: ColorPalette): CalendarColorId {
  const map: Record<ColorPalette, CalendarColorId> = {
    default: 'purple',
    ocean: 'blue',
    forest: 'green',
    sunset: 'orange',
    rose: 'red',
    pink: 'pink',
    pastel: 'green',
    sky: 'blue',
    yellow: 'yellow',
  };
  return map[palette] ?? 'blue';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixWith(hex: string, other: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function themeCalendarSwatchStyle(palette: ColorPalette, isDark: boolean) {
  const primary = getPalettePrimary(palette, isDark ? 'dark' : 'light');
  const bg = isDark
    ? mixWith(primary, '#0a0a0a', 0.72)
  : mixWith(primary, '#ffffff', 0.82);
  return { backgroundColor: bg, borderColor: primary };
}

export function resolveCalendarEventStyle(
  colorId: string | undefined,
  isDark: boolean,
  palette: ColorPalette,
) {
  if (!colorId || colorId === THEME_CALENDAR_COLOR_ID) {
    const primary = getPalettePrimary(palette, isDark ? 'dark' : 'light');
    const bg = isDark
      ? mixWith(primary, '#0a0a0a', 0.7)
      : mixWith(primary, '#ffffff', 0.8);
    const text = isDark ? mixWith(primary, '#ffffff', 0.35) : mixWith(primary, '#000000', 0.55);
    return {
      backgroundColor: bg,
      borderColor: primary,
      textColor: text,
    };
  }
  const color = CALENDAR_COLORS.find((c) => c.id === colorId) ?? CALENDAR_COLORS[0];
  return {
    backgroundColor: isDark ? color.bgDark : color.bg,
    borderColor: isDark ? color.borderDark : color.border,
    textColor: isDark ? color.textDark : color.text,
  };
}

export function calendarColorLabel(palette: ColorPalette): string {
  return COLOR_PALETTES.find((p) => p.id === palette)?.name ?? 'Theme';
}

export function resolveStoredCalendarColorId(
  colorId: string | undefined,
  palette: ColorPalette,
): StoredCalendarColorId {
  if (!colorId || colorId === THEME_CALENDAR_COLOR_ID) return THEME_CALENDAR_COLOR_ID;
  if (CALENDAR_COLORS.some((c) => c.id === colorId)) return colorId as CalendarColorId;
  return paletteToPresetColorId(palette);
}
