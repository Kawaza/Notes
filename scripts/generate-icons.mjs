/**
 * Build tray/window/favicon PNG icons and Windows .ico from the branded app mark.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

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

/** Colored tile with white mark — visible on light and dark taskbars/trays. */
function buildBrandMarkSvg(primary) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 192 192" fill="none">
  <rect width="192" height="192" rx="36" fill="${primary}"/>
  <circle cx="138" cy="54" r="16" fill="#ffffff"/>
  <path d="M0 192L0 132L60 192Z" fill="#ffffff"/>
</svg>`;
}

const publicDir = path.join(root, 'public');
const iconsDir = path.join(root, 'electron', 'icons');
const buildDir = path.join(root, 'build');
const taskbarIconSource = path.join(root, 'src', 'assets', 'brand', 'logo-icon (1).png');

fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(buildDir, { recursive: true });

async function renderBrandIcon(primary, size) {
  const svg = Buffer.from(buildBrandMarkSvg(primary));
  return sharp(svg, { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function writeBrandIcon(primary, outPath, size) {
  const png = await renderBrandIcon(primary, size);
  fs.writeFileSync(outPath, png);
}

for (const palette of Object.keys(PALETTE_PRIMARY)) {
  for (const theme of Object.keys(PALETTE_PRIMARY[palette])) {
    const primary = PALETTE_PRIMARY[palette][theme];
    const base = path.join(iconsDir, `${palette}-${theme}`);
    await writeBrandIcon(primary, `${base}-16.png`, 16);
    await writeBrandIcon(primary, `${base}-32.png`, 32);
    await writeBrandIcon(primary, `${base}-256.png`, 256);
  }
}

async function renderTaskbarIcon(size) {
  return sharp(taskbarIconSource)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toBuffer();
}

// Windows taskbar / .exe icon: white branded mark on black tile
const taskbarPrimary = PALETTE_PRIMARY.default.light;
await renderTaskbarIcon(512).then((png) => fs.writeFileSync(path.join(buildDir, 'icon.png'), png));
await writeBrandIcon(taskbarPrimary, path.join(iconsDir, 'icon.png'), 256);

const icoSizes = await Promise.all([256, 48, 32, 16].map((size) => renderTaskbarIcon(size)));
fs.writeFileSync(path.join(buildDir, 'icon.ico'), await toIco(icoSizes));

await writeBrandIcon(taskbarPrimary, path.join(publicDir, 'favicon.png'), 512);
await writeBrandIcon(PALETTE_PRIMARY.default.dark, path.join(publicDir, 'favicon-dark.png'), 512);

console.log('Generated app icons (white taskbar mark + colored tray tiles)');
