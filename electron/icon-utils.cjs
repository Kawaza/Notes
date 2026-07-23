const path = require('path');
const { nativeImage } = require('electron');

function logoSvg(primary) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192" fill="none">
  <rect width="192" height="192" rx="36" fill="${primary}"/>
  <circle cx="138" cy="54" r="16" fill="#ffffff"/>
  <path d="M0 192L0 132L60 192Z" fill="#ffffff"/>
</svg>`;
}

function iconPath(name) {
  return path.join(__dirname, 'icons', name);
}

function loadIconFromFile(fileName) {
  const image = nativeImage.createFromPath(iconPath(fileName));
  if (!image.isEmpty()) return image;
  return null;
}

function loadIconFromSvg(primary, size) {
  const svg = logoSvg(primary);
  const image = nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  );
  if (image.isEmpty()) return null;
  return size ? image.resize({ width: size, height: size }) : image;
}

function getBrandIcon(palette, theme, size) {
  const fileName = `${palette}-${theme}-${size}.png`;
  const fromFile = loadIconFromFile(fileName);
  if (fromFile) return fromFile;

  const fallback = loadIconFromFile(`icon.png`);
  if (fallback) return size ? fallback.resize({ width: size, height: size }) : fallback;

  return loadIconFromSvg('#6366f1', size);
}

function getTrayIcon(palette, theme) {
  const icon =
    getBrandIcon(palette, theme, 16) ??
    getBrandIcon(palette, theme, 32) ??
    getBrandIcon('default', theme === 'dark' ? 'dark' : 'light', 16);
  return icon ?? nativeImage.createEmpty();
}

function getWindowIcon(_palette, _theme) {
  const windowIcon = loadIconFromFile('window-icon.png');
  if (windowIcon) return windowIcon;

  return getBrandIcon('default', 'light', 256) ?? loadIconFromSvg('#6366f1', 256);
}

module.exports = { getTrayIcon, getWindowIcon, logoSvg };
