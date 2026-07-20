/**
 * Build tray/window/installer PNG icons from the logo SVG template.
 * Run before electron-builder so Windows gets real PNG icons (not SVG in tray).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const PALETTE_PRIMARY = {
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

function logoSvg(primary) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192" fill="none">
  <rect width="192" height="192" rx="36" fill="${primary}"/>
  <circle cx="138" cy="54" r="16" fill="#ffffff"/>
  <path d="M0 192L0 132L60 192Z" fill="#ffffff"/>
</svg>`;
}

async function writePng(svg, outPath, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
}

const iconsDir = path.join(root, 'electron', 'icons');
const buildDir = path.join(root, 'build');
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(buildDir, { recursive: true });

for (const [palette, themes] of Object.entries(PALETTE_PRIMARY)) {
  for (const [theme, color] of Object.entries(themes)) {
    const svg = logoSvg(color);
    const base = path.join(iconsDir, `${palette}-${theme}`);
    await writePng(svg, `${base}-16.png`, 16);
    await writePng(svg, `${base}-32.png`, 32);
    await writePng(svg, `${base}-256.png`, 256);
  }
}

await writePng(logoSvg(PALETTE_PRIMARY.default.light), path.join(buildDir, 'icon.png'), 512);
await writePng(logoSvg(PALETTE_PRIMARY.default.light), path.join(iconsDir, 'icon.png'), 256);

console.log('Generated app icons in electron/icons and build/icon.png');
