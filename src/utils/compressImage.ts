const MAX_IMAGE_EDGE = 1920;
const JPEG_QUALITY = 0.82;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/** Shrink large photos before they are stored or synced (browser only). */
export async function compressImageDataUrl(
  dataUrl: string,
  mimeType: string,
): Promise<{ dataUrl: string; mimeType: string }> {
  if (typeof document === 'undefined') return { dataUrl, mimeType };
  if (!mimeType.startsWith('image/') || mimeType === 'image/gif') {
    return { dataUrl, mimeType };
  }

  try {
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return { dataUrl, mimeType };

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(w, h));
    if (scale >= 1 && dataUrl.length < 400_000) {
      return { dataUrl, mimeType };
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return { dataUrl, mimeType };
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const outMime = mimeType === 'image/png' ? 'image/jpeg' : mimeType;
    const compressed = canvas.toDataURL(outMime, JPEG_QUALITY);
    if (compressed.length >= dataUrl.length) return { dataUrl, mimeType };
    return { dataUrl: compressed, mimeType: outMime };
  } catch {
    return { dataUrl, mimeType };
  }
}

export async function compressImageFile(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const mimeType = file.type || 'application/octet-stream';
  if (!mimeType.startsWith('image/')) return { dataUrl, mimeType };
  return compressImageDataUrl(dataUrl, mimeType);
}
