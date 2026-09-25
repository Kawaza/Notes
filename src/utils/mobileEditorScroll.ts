import type { Editor } from '@tiptap/core';

const MOBILE_QUERY = '(max-width: 767px)';

export function isMobileEditorViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
}

export function getMobileEditorScrollEl(editor: Editor): HTMLElement | null {
  return editor.view.dom.closest('.mobile-editor-scroll') as HTMLElement | null;
}

export function isKeyboardLikelyOpen(): boolean {
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

export interface MobileScrollSnapshot {
  scrollTop: number;
  windowY: number;
}

export function captureMobileEditorScroll(dom: HTMLElement): MobileScrollSnapshot | null {
  if (!isMobileEditorViewport()) return null;
  const scrollEl = dom.closest('.mobile-editor-scroll') as HTMLElement | null;
  return {
    scrollTop: scrollEl?.scrollTop ?? 0,
    windowY: window.scrollY,
  };
}

export function restoreMobileEditorScroll(
  dom: HTMLElement,
  snapshot: MobileScrollSnapshot,
  options?: { blurFocus?: boolean },
) {
  if (!isMobileEditorViewport()) return;

  const apply = () => {
    const scrollEl = dom.closest('.mobile-editor-scroll') as HTMLElement | null;
    if (scrollEl) scrollEl.scrollTop = snapshot.scrollTop;
    if (window.scrollY !== snapshot.windowY) window.scrollTo(0, snapshot.windowY);
  };

  if (options?.blurFocus && !isKeyboardLikelyOpen()) {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }
  }

  apply();
  requestAnimationFrame(apply);
}

export function isTaskCheckboxLabelTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('ul[data-type="taskList"] li > label'));
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
