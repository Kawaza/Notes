import { v4 as uuidv4 } from 'uuid';
import type { Note, NoteAttachment } from '../types';

/** Tiny transparent GIF — keeps TipTap/HTML valid while bytes live in attachments. */
export const IMAGE_SRC_PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function isPlaceholderSrc(src: string) {
  return src === IMAGE_SRC_PLACEHOLDER;
}

function isDataImageSrc(src: string) {
  return src.startsWith('data:image/') && !isPlaceholderSrc(src);
}

function isImageAttachment(att: NoteAttachment) {
  return (
    att.mimeType?.startsWith('image/') ||
    att.dataUrl?.startsWith('data:image/') ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(att.name || '')
  );
}

function mimeFromDataUrl(dataUrl: string): string {
  const semi = dataUrl.indexOf(';');
  if (semi > 5) return dataUrl.slice(5, semi);
  return 'image/png';
}

function parseHtmlImages(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

function resolveAttachmentSrc(att: NoteAttachment | undefined): string | null {
  if (!att?.dataUrl || isPlaceholderSrc(att.dataUrl)) return null;
  return att.dataUrl;
}

/** Fill image src from attachments; lift orphan base64 into attachments. */
export function hydrateNoteForDisplay(note: Note): Note {
  if (note.contentType === 'markdown') return note;

  const attachments = [...note.attachments];
  const byId = new Map(attachments.map((a) => [a.id, a]));
  const div = parseHtmlImages(note.content);
  let contentChanged = false;

  const imgs = Array.from(div.querySelectorAll('img'));
  const claimedAttachmentIds = new Set<string>();

  for (const img of imgs) {
    const id = img.getAttribute('data-attachment-id');
    if (id && byId.has(id)) claimedAttachmentIds.add(id);
  }

  const spareImageAttachments = attachments.filter(
    (a) => isImageAttachment(a) && !claimedAttachmentIds.has(a.id) && resolveAttachmentSrc(a),
  );

  for (const img of imgs) {
    const src = img.getAttribute('src') ?? '';
    let attachmentId = img.getAttribute('data-attachment-id');

    if (isPlaceholderSrc(src)) {
      let resolved = attachmentId ? resolveAttachmentSrc(byId.get(attachmentId)) : null;

      if (!resolved && spareImageAttachments.length) {
        const spare = spareImageAttachments.shift()!;
        attachmentId = spare.id;
        img.setAttribute('data-attachment-id', spare.id);
        claimedAttachmentIds.add(spare.id);
        resolved = resolveAttachmentSrc(spare);
      }

      if (resolved) {
        img.setAttribute('src', resolved);
        contentChanged = true;
      }
      continue;
    }

    if (isDataImageSrc(src)) {
      if (!attachmentId) {
        attachmentId = uuidv4();
        img.setAttribute('data-attachment-id', attachmentId);
        const attachment: NoteAttachment = {
          id: attachmentId,
          name: img.getAttribute('alt') || 'image.png',
          dataUrl: src,
          mimeType: mimeFromDataUrl(src),
        };
        attachments.push(attachment);
        byId.set(attachmentId, attachment);
        claimedAttachmentIds.add(attachmentId);
        contentChanged = true;
        continue;
      }

      const existing = byId.get(attachmentId);
      if (!existing) {
        const attachment: NoteAttachment = {
          id: attachmentId,
          name: img.getAttribute('alt') || 'image.png',
          dataUrl: src,
          mimeType: mimeFromDataUrl(src),
        };
        attachments.push(attachment);
        byId.set(attachmentId, attachment);
        claimedAttachmentIds.add(attachmentId);
        contentChanged = true;
        continue;
      }

      if (src.length > existing.dataUrl.length) {
        existing.dataUrl = src;
        contentChanged = true;
      }
      continue;
    }

    if (attachmentId && !src) {
      const resolved = resolveAttachmentSrc(byId.get(attachmentId));
      if (resolved) {
        img.setAttribute('src', resolved);
        contentChanged = true;
      }
    }
  }

  if (!contentChanged) return note;
  return {
    ...note,
    attachments,
    content: div.innerHTML,
  };
}

/** Store each photo once in attachments; strip duplicate base64 from HTML. */
export function compactNoteForStorage(note: Note): Note {
  if (note.contentType === 'markdown') return note;

  let attachments = [...note.attachments];
  const byId = new Map(attachments.map((a) => [a.id, a]));
  const div = parseHtmlImages(note.content);
  let contentChanged = false;

  div.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    if (!isDataImageSrc(src) && !isPlaceholderSrc(src)) return;
    if (isPlaceholderSrc(src)) return;

    let attachmentId = img.getAttribute('data-attachment-id');
    if (!attachmentId) {
      attachmentId = uuidv4();
      img.setAttribute('data-attachment-id', attachmentId);
      const attachment: NoteAttachment = {
        id: attachmentId,
        name: img.getAttribute('alt') || 'image.png',
        dataUrl: src,
        mimeType: mimeFromDataUrl(src),
      };
      attachments.push(attachment);
      byId.set(attachmentId, attachment);
    } else {
      const existing = byId.get(attachmentId);
      if (existing) {
        if (existing.dataUrl !== src && src.length >= existing.dataUrl.length) {
          existing.dataUrl = src;
        }
      } else {
        const attachment: NoteAttachment = {
          id: attachmentId,
          name: img.getAttribute('alt') || 'image.png',
          dataUrl: src,
          mimeType: mimeFromDataUrl(src),
        };
        attachments.push(attachment);
        byId.set(attachmentId, attachment);
      }
    }

    if (src !== IMAGE_SRC_PLACEHOLDER) {
      img.setAttribute('src', IMAGE_SRC_PLACEHOLDER);
      contentChanged = true;
    }
  });

  if (!contentChanged && attachments.length === note.attachments.length) return note;
  return {
    ...note,
    attachments,
    content: div.innerHTML,
  };
}

export function compactNotesForSync(notes: Note[]): Note[] {
  return notes.map(compactNoteForStorage);
}

/** Expand compact on-disk HTML for the rich-text editor. */
export function hydrateNoteHtmlContent(content: string, attachments: NoteAttachment[]): string {
  return hydrateNoteForDisplay({
    id: '',
    folderId: null,
    title: '',
    content,
    contentType: 'html',
    tags: [],
    pinned: false,
    attachments,
    createdAt: '',
    updatedAt: '',
    isTask: false,
    order: 0,
  }).content;
}
