/**
 * Build tray/window/favicon PNG icons from the brand logo icon.
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

const logoSvgPath = path.join(root, 'src', 'assets', 'brand', 'logo-icon.svg');
const logoSvg = fs.readFileSync(logoSvgPath);
const publicDir = path.join(root, 'public');
const iconsDir = path.join(root, 'electron', 'icons');
const buildDir = path.join(root, 'build');

fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(buildDir, { recursive: true });

async function prepareSource(invert = false) {
  let pipeline = sharp(logoSvg, { density: 300 }).trim({ threshold: 12 });
  if (invert) {
    pipeline = pipeline.negate({ alpha: false });
  }
  return pipeline.png().toBuffer();
}

async function writeIcon(source, outPath, size) {
  await sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

const lightSource = await prepareSource(false);
const darkSource = await prepareSource(true);

for (const palette of Object.keys(PALETTE_PRIMARY)) {
  for (const theme of Object.keys(PALETTE_PRIMARY[palette])) {
    const source = theme === 'dark' ? darkSource : lightSource;
    const base = path.join(iconsDir, `${palette}-${theme}`);
    await writeIcon(source, `${base}-16.png`, 16);
    await writeIcon(source, `${base}-32.png`, 32);
    await writeIcon(source, `${base}-256.png`, 256);
  }
}

await writeIcon(lightSource, path.join(buildDir, 'icon.png'), 512);
const icoSizes = await Promise.all(
  [256, 48, 32, 16].map(async (size) => {
    return sharp(lightSource)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }),
);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), await toIco(icoSizes));
await writeIcon(lightSource, path.join(iconsDir, 'icon.png'), 256);
await writeIcon(lightSource, path.join(publicDir, 'favicon.png'), 512);
await writeIcon(darkSource, path.join(publicDir, 'favicon-dark.png'), 512);
await writeIcon(lightSource, path.join(publicDir, 'logo-icon.png'), 512);

console.log('Generated app icons from brand SVG');
