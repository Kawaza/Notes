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
const desktopIconSource = path.join(root, 'src', 'assets', 'brand', 'desktop icon.png');
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

const HOME_SCREEN_BG = { r: 255, g: 255, b: 255 };

/** Square, fully opaque home-screen icon (no alpha — iOS adds gloss if any transparency exists). */
async function writeOpaqueHomeScreenIcon(source, outPath, size, logoScale = 0.4) {
  const logoSize = Math.round(size * logoScale);
  const offset = Math.round((size - logoSize) / 2);
  const logo = await sharp(source)
    .resize(logoSize * 4, logoSize * 4, {
      fit: 'contain',
      background: { ...HOME_SCREEN_BG, alpha: 1 },
    })
    .flatten({ background: HOME_SCREEN_BG })
    .greyscale()
    .threshold(235)
    .resize(logoSize, logoSize, { kernel: sharp.kernel.nearest })
    .flatten({ background: HOME_SCREEN_BG })
    .removeAlpha()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: HOME_SCREEN_BG,
    },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .flatten({ background: HOME_SCREEN_BG })
    .removeAlpha()
    .png({ compressionLevel: 9, palette: false })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  if (meta.hasAlpha) {
    throw new Error(`${outPath} must not have an alpha channel`);
  }
  if (meta.width !== size || meta.height !== size) {
    throw new Error(`${outPath} must be exactly ${size}x${size}`);
  }
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

await writeIcon(lightSource, path.join(iconsDir, 'icon.png'), 256);
await writeIcon(darkSource, path.join(buildDir, 'icon.png'), 512);
await writeIcon(darkSource, path.join(iconsDir, 'window-icon.png'), 256);
const taskbarIcoSizes = await Promise.all(
  [256, 48, 32, 16].map(async (size) => {
    return sharp(darkSource)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }),
);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), await toIco(taskbarIcoSizes));
await writeIcon(lightSource, path.join(publicDir, 'favicon.png'), 512);
await writeIcon(darkSource, path.join(publicDir, 'favicon-dark.png'), 512);
await writeIcon(lightSource, path.join(publicDir, 'logo-icon.png'), 512);

// iOS home screen — exact square sizes, fully opaque RGB PNGs (iOS applies its own mask).
for (const size of [180, 152, 167]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `apple-touch-icon-${size}.png`;
  await writeOpaqueHomeScreenIcon(lightSource, path.join(publicDir, name), size);
}

for (const size of [192, 512]) {
  await writeOpaqueHomeScreenIcon(lightSource, path.join(publicDir, `pwa-icon-${size}.png`), size);
}

/** Keep source padding; use transparent background so uneven margins don't become black lines. */
async function renderDesktopIcon(size) {
  return sharp(desktopIconSource)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

if (fs.existsSync(desktopIconSource)) {
  const desktopIcoSizes = await Promise.all([256, 48, 32, 16].map((size) => renderDesktopIcon(size)));
  fs.writeFileSync(path.join(buildDir, 'desktop-icon.ico'), await toIco(desktopIcoSizes));
  console.log('Generated app icons from brand SVG + desktop shortcut icon');
} else {
  console.log('Generated app icons from brand SVG');
}
