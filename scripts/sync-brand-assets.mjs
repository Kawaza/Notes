import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const brandDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'brand');
fs.copyFileSync(
  path.join(brandDir, 'notes-logo-horizontal (2).svg'),
  path.join(brandDir, 'logo-horizontal.svg'),
);
