/**
 * Publish Windows build to GitHub Releases.
 * Uses `gh auth token` so you don't need to paste GH_TOKEN manually.
 * Requires: gh CLI logged in as Kawaza (`gh auth switch -u Kawaza`)
 */
import { execSync } from 'node:child_process';

function run(cmd, env = process.env) {
  execSync(cmd, { stdio: 'inherit', env, shell: true });
}

let token;
try {
  token = execSync('gh auth token', { encoding: 'utf8' }).trim();
} catch {
  console.error('Could not get GitHub token. Run: gh auth switch -u Kawaza');
  process.exit(1);
}

if (!token) {
  console.error('GitHub token is empty. Run: gh auth login');
  process.exit(1);
}

const env = {
  ...process.env,
  GH_TOKEN: token,
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
};

console.log('Building and publishing to GitHub Releases…');
run('npm run build', env);
run('electron-builder --win --publish always', env);
