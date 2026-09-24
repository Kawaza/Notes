import { useEffect, type RefObject } from 'react';

/** Extra scroll padding while the software keyboard is open (mobile web / PWA). */
export function useMobileKeyboardInset(
  scrollRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  layoutKey?: string | null,
) {
  useEffect(() => {
    if (!enabled) return;

    const el = scrollRef.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;

    const apply = () => {
      const keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.paddingBottom = `calc(${keyboardInset}px + max(1.25rem, env(safe-area-inset-bottom, 0px)))`;
    };

    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    apply();

    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      el.style.paddingBottom = '';
    };
  }, [enabled, scrollRef, layoutKey]);
}
