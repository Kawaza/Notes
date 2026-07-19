import type { ColorPalette } from '../types';

export const COLOR_PALETTES: { id: ColorPalette; name: string; preview: string }[] = [
  { id: 'default', name: 'Indigo', preview: '#6366f1' },
  { id: 'ocean', name: 'Ocean', preview: '#0ea5e9' },
  { id: 'forest', name: 'Forest', preview: '#22c55e' },
  { id: 'sunset', name: 'Sunset', preview: '#f97316' },
  { id: 'rose', name: 'Rose', preview: '#f43f5e' },
  { id: 'pink', name: 'Pink', preview: '#ec4899' },
  { id: 'pastel', name: 'Pastel Green', preview: '#86efac' },
  { id: 'sky', name: 'Pastel Blue', preview: '#93c5fd' },
  { id: 'yellow', name: 'Yellow', preview: '#eab308' },
];

export function applyPalette(palette: ColorPalette, theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-palette', palette);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
