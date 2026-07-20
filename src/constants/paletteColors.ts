import type { ColorPalette, Theme } from '../types';

/** Primary brand colors — keep in sync with src/index.css palette blocks. */
export const PALETTE_PRIMARY: Record<ColorPalette, Record<Theme, string>> = {
  default: { light: '#6366f1', dark: '#818cf8' },
  ocean: { light: '#0ea5e9', dark: '#38bdf8' },
  forest: { light: '#22c55e', dark: '#4ade80' },
  sunset: { light: '#f97316', dark: '#fb923c' },
  rose: { light: '#f43f5e', dark: '#fb7185' },
  pink: { light: '#ec4899', dark: '#f472b6' },
  pastel: { light: '#4ade80', dark: '#86efac' },
  sky: { light: '#60a5fa', dark: '#93c5fd' },
  yellow: { light: '#eab308', dark: '#facc15' },
};

export function getPalettePrimary(palette: ColorPalette, theme: Theme): string {
  return PALETTE_PRIMARY[palette][theme];
}
