/**
 * Compress embedded note images in notes-data.json (desktop emergency fix).
 * Run: node scripts/shrink-notes-images.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const MAX_EDGE = 1920;
const JPEG_QUALITY = 82;

const dataPath = path.join(process.env.APPDATA || '', 'Notes', 'notes-data.json');

function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

async function compressDataUrl(dataUrl, mimeType) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return { dataUrl, mimeType };
  if (!mimeType.startsWith('image/') || mimeType === 'image/gif') {
    return { dataUrl, mimeType };
  }
  try {
    let img = sharp(parsed.buffer, { failOn: 'none' });
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (!w || !h) return { dataUrl, mimeType };

    if (Math.max(w, h) > MAX_EDGE) {
      img = img.resize({
        width: w >= h ? MAX_EDGE : undefined,
        height: h > w ? MAX_EDGE : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const outBuffer = await img.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    if (outBuffer.length >= parsed.buffer.length && dataUrl.length < 500_000) {
      return { dataUrl, mimeType };
    }
    const out = `data:image/jpeg;base64,${outBuffer.toString('base64')}`;
    return { dataUrl: out, mimeType: 'image/jpeg' };
  } catch {
    return { dataUrl, mimeType };
  }
}

function liftAndCompactHtml(note) {
  if (note.contentType === 'markdown') return note;
  let attachments = [...(note.attachments || [])];
  const byId = new Map(attachments.map((a) => [a.id, a]));
  let content = note.content || '';

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
        name: (tag.match(/\balt="([^"]*)"/i)?.[1] || 'image.jpg').slice(0, 200),
        dataUrl: src,
        mimeType: src.slice(5, src.indexOf(';')) || 'image/png',
      };
      attachments.push(att);
      byId.set(attachmentId, att);
    } else if (src !== PLACEHOLDER && src.length > att.dataUrl.length) {
      att.dataUrl = src;
    }

    if (src === PLACEHOLDER) return tag;
    return tag.replace(/\bsrc="[^"]*"/i, `src="${PLACEHOLDER}"`);
  });

  return { ...note, attachments, content };
}

async function compressNote(note) {
  const lifted = liftAndCompactHtml(note);
  const attachments = [];
  for (const att of lifted.attachments || []) {
    if (att.dataUrl?.startsWith('data:image/')) {
      const compressed = await compressDataUrl(att.dataUrl, att.mimeType || 'image/png');
      attachments.push({ ...att, ...compressed });
    } else {
      attachments.push(att);
    }
  }
  return { ...lifted, attachments };
}

const raw = fs.readFileSync(dataPath, 'utf8');
const before = Buffer.byteLength(raw, 'utf8');
const data = JSON.parse(raw);

const backup = `${dataPath}.pre-shrink-${Date.now()}.bak`;
fs.copyFileSync(dataPath, backup);

const notes = [];
for (const note of data.notes || []) {
  notes.push(await compressNote(note));
}
data.notes = notes;

const out = JSON.stringify(data);
const after = Buffer.byteLength(out, 'utf8');
fs.writeFileSync(dataPath, out);

console.log('Backup:', backup);
console.log('Before:', (before / (1024 * 1024)).toFixed(2), 'MB');
console.log('After:', (after / (1024 * 1024)).toFixed(2), 'MB');
