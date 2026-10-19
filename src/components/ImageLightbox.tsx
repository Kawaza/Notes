import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type LightboxImage = { src: string; alt: string; attachmentId?: string | null };

const TAP_MOVE_PX = 14;
const TAP_MAX_MS = 650;

function lightboxFromImg(img: HTMLImageElement): LightboxImage {
  return {
    src: img.currentSrc || img.src,
    alt: img.alt || 'Note image',
    attachmentId: img.getAttribute('data-attachment-id'),
  };
}

function isLightboxImageTarget(target: EventTarget | null): target is HTMLImageElement {
  if (!(target instanceof HTMLImageElement)) return false;
  return Boolean(
    target.closest('.prose-editor, .markdown-preview, [data-note-image-thumb]'),
  );
}

function pinchDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function ImageLightbox({
  image,
  onClose,
}: {
  image: LightboxImage;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [image.src]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const clampScale = (s: number) => Math.min(5, Math.max(1, s));

  const onPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      pinchStartRef.current = { distance: pinchDistance(pts[0], pts[1]), scale };
      panStartRef.current = null;
    } else if (pointersRef.current.size === 1) {
      panStartRef.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = [...pointersRef.current.values()];
      const dist = pinchDistance(pts[0], pts[1]);
      const next = clampScale((dist / pinchStartRef.current.distance) * pinchStartRef.current.scale);
      setScale(next);
      if (next <= 1) setTranslate({ x: 0, y: 0 });
      return;
    }

    if (pointersRef.current.size === 1 && panStartRef.current && scale > 1) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTranslate({
        x: panStartRef.current.tx + dx,
        y: panStartRef.current.ty + dy,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) panStartRef.current = null;

    if (scale < 1.05) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  };

  const onDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (scale > 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 safe-area-padding"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || 'Image preview'}
    >
      <div className="flex justify-end p-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white cursor-pointer"
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>

      <div
        className="flex-1 min-h-0 flex items-center justify-center touch-none select-none overflow-hidden"
        onClick={onClose}
      >
        <img
          src={image.src}
          alt={image.alt}
          draggable={false}
          className="max-w-full max-h-full object-contain will-change-transform"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDoubleTap();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <p className="text-center text-xs text-white/60 pb-4 shrink-0 px-4">
        Pinch to zoom · Double-tap to zoom · Drag when zoomed in
      </p>
    </div>,
    document.body,
  );
}

/** Tap images inside note content to open fullscreen (touch / narrow screens). */
export function useNoteImageLightbox(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [image, setImage] = useState<LightboxImage | null>(null);

  useEffect(() => {
    if (!enabled) {
      setImage(null);
      return;
    }
    const root = containerRef.current;
    if (!root) return;

    let pendingTap: { x: number; y: number; t: number; img: HTMLImageElement } | null = null;

    const openFromTarget = (target: HTMLImageElement, e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      setImage(lightboxFromImg(target));
    };

    const onClick = (e: MouseEvent) => {
      if (!isLightboxImageTarget(e.target)) return;
      openFromTarget(e.target, e);
    };

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target;
      if (!isLightboxImageTarget(target)) return;
      if (target.closest('.ProseMirror')) return;
      const touch = e.touches[0];
      if (!touch) return;
      pendingTap = {
        img: target,
        x: touch.clientX,
        y: touch.clientY,
        t: Date.now(),
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!pendingTap) return;
      const tap = pendingTap;
      pendingTap = null;
      const touch = e.changedTouches[0];
      if (!touch) return;
      if (Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > TAP_MOVE_PX) return;
      if (Date.now() - tap.t > TAP_MAX_MS) return;
      if (e.target !== tap.img && !tap.img.contains(e.target as Node)) return;
      openFromTarget(tap.img, e);
    };

    root.addEventListener('click', onClick, true);
    root.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    root.addEventListener('touchend', onTouchEnd, true);
    root.addEventListener('touchcancel', () => {
      pendingTap = null;
    }, true);
    return () => {
      root.removeEventListener('click', onClick, true);
      root.removeEventListener('touchstart', onTouchStart, true);
      root.removeEventListener('touchend', onTouchEnd, true);
    };
  }, [containerRef, enabled]);

  const close = useCallback(() => setImage(null), []);
  const openImage = useCallback((next: LightboxImage) => setImage(next), []);

  return { image, close, openImage };
}
