import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = path.join(__dirname, '..', 'src', 'assets', 'brand');

function flattenLogoSvg(svg, defaults) {
  const imageTag = svg.match(/<image[\s\S]*?\/>/)?.[0] ?? svg.match(/<image[\s\S]*?<\/image>/)?.[0];
  const useTag = svg.match(/<use[\s\S]*?\/>/)?.[0];
  if (!imageTag || !useTag) throw new Error('Could not parse logo SVG');

  const href = imageTag.match(/href="([^"]+)"/)?.[1];
  const width = imageTag.match(/width="([^"]+)"/)?.[1] ?? defaults.width;
  const height = imageTag.match(/height="([^"]+)"/)?.[1] ?? defaults.height;
  const x = useTag.match(/\bx="([^"]+)"/)?.[1] ?? defaults.x;
  const y = useTag.match(/\by="([^"]+)"/)?.[1] ?? defaults.y;
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? defaults.viewBox;

  if (!href) throw new Error('Missing image href in logo SVG');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-hidden="true">
  <image x="${x}" y="${y}" width="${width}" height="${height}" href="${href}" />
</svg>`;
}

for (const file of ['logo-horizontal.svg', 'logo-icon.svg']) {
  const inputPath = path.join(brandDir, file);
  const svg = fs.readFileSync(inputPath, 'utf8');
  const defaults =
    file === 'logo-horizontal.svg'
      ? { viewBox: '0 0 660 192', width: '415', height: '144', x: '30', y: '30' }
      : { viewBox: '0 0 256 256', width: '176', height: '192', x: '40', y: '40' };
  const flat = flattenLogoSvg(svg, defaults);
  fs.writeFileSync(inputPath, flat);
  console.log('Flattened', file);
}
