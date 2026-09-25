import type { Editor } from '@tiptap/core';

const MOBILE_QUERY = '(max-width: 767px)';

export function isMobileEditorViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
}

export function getMobileEditorScrollEl(editor: Editor): HTMLElement | null {
  return editor.view.dom.closest('.mobile-editor-scroll') as HTMLElement | null;
}

function isKeyboardLikelyOpen(): boolean {
  const vv = window.visualViewport;
  if (!vv) return false;
  return vv.height < window.innerHeight * 0.85;
}

/** Nudge scroll down only — never pull the page upward (avoids jump-to-top on mobile). */
export function scrollMobileSelectionIntoView(editor: Editor) {
  if (!isMobileEditorViewport()) return;
  if (!editor.isFocused) return;
  if (!isKeyboardLikelyOpen()) return;

  const active = document.activeElement;
  if (active instanceof HTMLInputElement && active.type === 'checkbox') return;

  const scrollEl = getMobileEditorScrollEl(editor);
  if (!scrollEl) return;

  const vv = window.visualViewport;
  if (!vv) return;

  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);
  const visibleBottom = vv.offsetTop + vv.height - 24;

  if (coords.bottom > visibleBottom) {
    scrollEl.scrollTop += coords.bottom - visibleBottom;
  }
}

export function createMobileEditorScrollGuard(scrollEl: HTMLElement | null) {
  let userScrolling = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const onScroll = () => {
    userScrolling = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      userScrolling = false;
    }, 180);
  };

  if (scrollEl && isMobileEditorViewport()) {
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
  }

  return {
    shouldSkipAutoScroll: () => userScrolling,
    dispose: () => {
      if (scrollEl) scrollEl.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    },
  };
}
