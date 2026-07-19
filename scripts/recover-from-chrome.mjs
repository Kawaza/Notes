/**
 * Recover notes from Chrome localStorage (localhost:5174) into the desktop app data file.
 * Run: npm run recover:chrome
 *
 * Close Chrome first for best results. If recovery fails, use the browser export method
 * described in Settings → Import.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const CHROME_LDB =
  process.env.CHROME_LDB ??
  path.join(
    os.homedir(),
    'AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb',
  );

const OUT_FILE =
  process.env.NOTES_DATA_OUT ??
  path.join(os.homedir(), 'AppData/Roaming/Notes/notes-data.json');

const KEY = Buffer.from('notes-app-data', 'utf8');

function ldbFilesWithKey(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ldb'))
    .map((f) => path.join(dir, f))
    .filter((file) => fs.readFileSync(file).includes(KEY));
}

function extractJson(raw) {
  let keyIdx = -1;
  for (let i = 0; i < raw.length - KEY.length; i++) {
    if (raw.subarray(i, i + KEY.length).equals(KEY)) {
      keyIdx = i;
      break;
    }
  }
  if (keyIdx === -1) return null;

  let start = -1;
  for (let i = keyIdx; i < raw.length - 1; i++) {
    if (raw[i] === 0x7b && raw[i + 1] === 0x00) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  const text = raw.subarray(start).toString('utf16le');
  const jsonStart = text.indexOf('{');
  if (jsonStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = jsonStart; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.slice(jsonStart, i + 1));
      }
    }
  }

  return null;
}

const ldbFiles = ldbFilesWithKey(CHROME_LDB);
if (!ldbFiles.length) {
  console.error('Chrome local storage not found at:', CHROME_LDB);
  console.error('No notes-app-data key found. Your notes may be in Edge/Firefox instead.');
  process.exit(1);
}

let data = null;
for (const file of ldbFiles) {
  const found = extractJson(fs.readFileSync(file));
  if (found?.notes?.length) {
    data = found;
    console.log('Found data in', file);
    break;
  }
}

if (!data) {
  console.error('Could not parse notes-app-data from Chrome storage.');
  console.error('Try the browser export method below.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
console.log(`Recovered ${data.notes.length} notes, ${data.folders.length} folders`);
console.log('Saved to', OUT_FILE);
console.log('Restart the Notes desktop app to see your data.');
