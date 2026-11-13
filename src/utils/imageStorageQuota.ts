import type { Note, NoteAttachment } from '../types';
import { formatSyncPayloadSize } from '../sync/syncUtils';

/** Hard cap on a single image upload (any note type). */
export const MAX_SINGLE_IMAGE_BYTES = 3 * 1024 * 1024;

/** Image budget for personal / private-folder notes synced to your account. */
export const MAX_PRIVATE_IMAGE_BYTES = 25 * 1024 * 1024;

export function dataUrlByteSize(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor(b64.length * 0.75);
}

function isImageDataUrl(dataUrl: string | undefined): boolean {
  return Boolean(dataUrl?.startsWith('data:image/'));
}

function bytesFromAttachment(att: NoteAttachment): number {
  if (!isImageDataUrl(att.dataUrl)) return 0;
  return dataUrlByteSize(att.dataUrl);
}

function bytesFromHtmlImages(html: string): number {
  let total = 0;
  const imgRe = /<img[^>]+>/gi;
  const srcRe = /src="([^"]+)"/i;
  for (const tag of html.match(imgRe) || []) {
    const m = tag.match(srcRe);
    const src = m?.[1] ?? '';
    if (src.startsWith('data:image/') && src.length > 120) {
      total += dataUrlByteSize(src);
    }
  }
  return total;
}

export function imageBytesInNote(note: Pick<Note, 'attachments' | 'content'>): number {
  let total = 0;
  for (const a of note.attachments ?? []) total += bytesFromAttachment(a);
  total += bytesFromHtmlImages(note.content ?? '');
  return total;
}

export function imageBytesInNotes(notes: Note[]): number {
  return notes.reduce((sum, n) => sum + imageBytesInNote(n), 0);
}

export type ImageStorageUsage = {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percent: number;
};

export function buildPrivateImageStorageUsage(usedBytes: number): ImageStorageUsage {
  const limitBytes = MAX_PRIVATE_IMAGE_BYTES;
  const remainingBytes = Math.max(0, limitBytes - usedBytes);
  const percent = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  return { usedBytes, limitBytes, remainingBytes, percent };
}

export function singleImageTooLargeMessage(fileBytes: number): string {
  return (
    `This image is ${formatSyncPayloadSize(fileBytes)}. Each image must be ${formatSyncPayloadSize(MAX_SINGLE_IMAGE_BYTES)} or smaller. ` +
    `Resize or compress it on your device, then try again.`
  );
}

export function privateImageQuotaExceededMessage(usedBytes: number, incomingBytes: number): string {
  const usage = buildPrivateImageStorageUsage(usedBytes);
  return (
    `Private note image storage is full (${formatSyncPayloadSize(usage.usedBytes)} of ${formatSyncPayloadSize(usage.limitBytes)} used). ` +
    `This image needs about ${formatSyncPayloadSize(incomingBytes)} more room. ` +
    `Remove older images from your personal notes and folders, then try again.`
  );
}

export class ImageStorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageStorageQuotaError';
  }
}
