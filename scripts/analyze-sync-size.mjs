import fs from 'fs';
import path from 'path';

const dataPath = path.join(
  process.env.APPDATA || '',
  'Notes',
  'notes-data.json',
);

const raw = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(raw);

let attachBytes = 0;
let contentImgBytes = 0;
let contentBytes = 0;
let attachCount = 0;
let imgInContent = 0;
const imgRe = /<img[^>]+>/gi;
const srcRe = /src="([^"]+)"/i;

for (const n of data.notes || []) {
  contentBytes += (n.content || '').length;
  const imgs = (n.content || '').match(imgRe) || [];
  imgInContent += imgs.length;
  for (const tag of imgs) {
    const m = tag.match(srcRe);
    if (m) contentImgBytes += m[1].length;
  }
  for (const a of n.attachments || []) {
    attachCount += 1;
    attachBytes += (a.dataUrl || '').length;
  }
}

const payload = {
  folders: data.folders,
  notes: data.notes,
  noteDeletions: data.noteDeletions || [],
  folderLinks: data.folderLinks,
  folderSecrets: data.folderSecrets,
  theme: data.theme,
  colorPalette: data.colorPalette,
  foldersSectionName: data.foldersSectionName,
};
const syncJson = JSON.stringify(payload);

function fmt(b) {
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

console.log('notes-data.json on disk:', fmt(Buffer.byteLength(raw, 'utf8')));
console.log('sync payload (JSON UTF-8):', fmt(Buffer.byteLength(syncJson, 'utf8')));
console.log('notes count:', (data.notes || []).length);
console.log('attachments:', attachCount, '→', fmt(attachBytes), 'of dataUrl text in JSON');
console.log('<img> in note HTML:', imgInContent, '→', fmt(contentImgBytes), 'of src= in content');
console.log('all note content text:', fmt(contentBytes));
console.log(
  'estimated image duplication (content src + attachment dataUrl overlap):',
  fmt(contentImgBytes + attachBytes),
  '(same bytes often stored twice)',
);

const byNote = (data.notes || [])
  .map((n) => {
    let ab = 0;
    let cb = 0;
    for (const a of n.attachments || []) ab += (a.dataUrl || '').length;
    for (const tag of (n.content || '').match(imgRe) || []) {
      const m = tag.match(srcRe);
      if (m) cb += m[1].length;
    }
    return { title: n.title, total: ab + cb, imgs: (n.content || '').match(imgRe)?.length || 0, att: n.attachments?.length || 0 };
  })
  .filter((x) => x.total > 0)
  .sort((a, b) => b.total - a.total);

console.log('\nLargest notes by embedded image data:');
for (const row of byNote.slice(0, 8)) {
  console.log(`  ${JSON.stringify(row.title)} — ${fmt(row.total)} (${row.imgs} img tags, ${row.att} attachments)`);
}

let decodedBinary = 0;
let imgCount = 0;
for (const n of data.notes || []) {
  for (const tag of (n.content || '').match(imgRe) || []) {
    const m = tag.match(srcRe);
    if (!m || !m[1].startsWith('data:')) continue;
    const comma = m[1].indexOf(',');
    if (comma < 0) continue;
    const b64 = m[1].slice(comma + 1);
    decodedBinary += Math.floor((b64.length * 3) / 4);
    imgCount += 1;
  }
}
console.log(`\n${imgCount} base64 images in HTML → ~${fmt(decodedBinary)} decoded file bytes (what you'd expect on disk)`);
