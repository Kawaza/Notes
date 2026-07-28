export type EmbeddedImageRef = {
  attachmentId: string | null;
  src: string;
};

/** Collect image references from rich-text HTML. */
export function getEmbeddedImagesFromHtml(html: string): EmbeddedImageRef[] {
  const div = document.createElement('div');
  div.innerHTML = html;
  return Array.from(div.querySelectorAll('img')).map((img) => ({
    attachmentId: img.getAttribute('data-attachment-id'),
    src: img.getAttribute('src') ?? '',
  }));
}

export function getEmbeddedImageAttachmentIds(html: string): Set<string> {
  return new Set(
    getEmbeddedImagesFromHtml(html)
      .map((img) => img.attachmentId)
      .filter((id): id is string => Boolean(id)),
  );
}

export function getEmbeddedImageSrcs(html: string): Set<string> {
  return new Set(getEmbeddedImagesFromHtml(html).map((img) => img.src).filter(Boolean));
}

/** Remove an embedded image by attachment id and/or src. */
export function removeEmbeddedImageFromHtml(
  html: string,
  { attachmentId, src }: { attachmentId?: string; src?: string },
): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  div.querySelectorAll('img').forEach((img) => {
    const imgAttachmentId = img.getAttribute('data-attachment-id');
    const imgSrc = img.getAttribute('src') ?? '';
    const matchesId = attachmentId && imgAttachmentId === attachmentId;
    const matchesSrc = src && imgSrc === src;
    if (!matchesId && !matchesSrc) return;

    const parent = img.parentElement;
    img.remove();
    if (parent?.tagName === 'P' && parent.textContent?.trim() === '') {
      parent.remove();
    }
  });

  return div.innerHTML;
}
