import type { ColorPalette } from '../types';
import {
  THEME_CALENDAR_COLOR_ID,
  paletteToPresetColorId,
  type StoredCalendarColorId,
} from './themeCalendarColor';

/** Default calendar block color follows the active accent palette. */
export function defaultCalendarColorForPalette(_palette: ColorPalette): StoredCalendarColorId {
  return THEME_CALENDAR_COLOR_ID;
}

export { paletteToPresetColorId, THEME_CALENDAR_COLOR_ID };
