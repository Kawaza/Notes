/**
 * One-shot: dedupe embedded images (HTML src + attachments) in notes-data.json.
 * Run: node scripts/compact-notes-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const dataPath = path.join(process.env.APPDATA || '', 'Notes', 'notes-data.json');

function mimeFromDataUrl(dataUrl) {
  const semi = dataUrl.indexOf(';');
  if (semi > 5) return dataUrl.slice(5, semi);
  return 'image/png';
}

function compactNote(note) {
  if (note.contentType === 'markdown') return note;
  let attachments = [...(note.attachments || [])];
  const byId = new Map(attachments.map((a) => [a.id, a]));
  let content = note.content || '';
  let changed = false;

  content = content.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcM = tag.match(/\bsrc="([^"]+)"/i);
    const src = srcM?.[1] ?? '';
    if (!src.startsWith('data:image/')) return tag;

    let idM = tag.match(/\bdata-attachment-id="([^"]+)"/i);
    let attachmentId = idM?.[1];
    if (!attachmentId) {
      attachmentId = uuidv4();
      if (/\bdata-attachment-id="/i.test(tag)) {
        tag = tag.replace(/\bdata-attachment-id="[^"]*"/i, `data-attachment-id="${attachmentId}"`);
      } else {
        tag = tag.replace(/<img\b/i, `<img data-attachment-id="${attachmentId}"`);
      }
    }

    let att = byId.get(attachmentId);
    if (!att) {
      att = {
        id: attachmentId,
        name: (tag.match(/\balt="([^"]*)"/i)?.[1] || 'image.png').slice(0, 200),
        dataUrl: src,
        mimeType: mimeFromDataUrl(src),
      };
      attachments.push(att);
      byId.set(attachmentId, att);
    } else if (src.length > att.dataUrl.length) {
      att.dataUrl = src;
    }

    if (src === PLACEHOLDER) return tag;
    changed = true;
    if (/\bsrc="[^"]*"/i.test(tag)) {
      return tag.replace(/\bsrc="[^"]*"/i, `src="${PLACEHOLDER}"`);
    }
    return tag.replace(/<img\b/i, `<img src="${PLACEHOLDER}"`);
  });

  if (!changed && attachments.length === (note.attachments || []).length) return note;
  return { ...note, attachments, content };
}

const raw = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(raw);
const before = Buffer.byteLength(raw, 'utf8');

let lifted = 0;
data.notes = (data.notes || []).map((note) => {
  const next = compactNote(note);
  lifted += (next.attachments?.length || 0) - (note.attachments?.length || 0);
  return next;
});

const out = JSON.stringify(data);
const after = Buffer.byteLength(out, 'utf8');

const backup = dataPath + '.pre-compact-' + Date.now() + '.bak';
fs.copyFileSync(dataPath, backup);
fs.writeFileSync(dataPath, out);

console.log('Backup:', backup);
console.log('Before:', (before / (1024 * 1024)).toFixed(2), 'MB');
console.log('After:', (after / (1024 * 1024)).toFixed(2), 'MB');
console.log('Attachments added:', lifted);
