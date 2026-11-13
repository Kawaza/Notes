/**
 * Attach auto-update metadata to an existing GitHub release (e.g. if only .exe was uploaded).
 * Usage: node scripts/upload-release-assets.mjs v1.0.92
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const tag = process.argv[2];
if (!tag) {
  console.error('Usage: node scripts/upload-release-assets.mjs <tag>  (e.g. v1.0.92)');
  process.exit(1);
}

const root = process.cwd();
const yml = join(root, 'release', 'latest.yml');
const blockmap = join(root, `release`, `Notes Setup ${tag.replace(/^v/, '')}.exe.blockmap`);

if (!existsSync(yml)) {
  console.error('Missing release/latest.yml — run electron-builder --win first.');
  process.exit(1);
}

const files = [yml];
if (existsSync(blockmap)) files.push(blockmap);

const quoted = files.map((f) => `"${f}"`).join(' ');
execSync(`gh release upload ${tag} ${quoted} --clobber`, { stdio: 'inherit', shell: true });
