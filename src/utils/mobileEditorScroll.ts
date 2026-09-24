import type { Editor } from '@tiptap/core';

const MOBILE_QUERY = '(max-width: 767px)';

export function isMobileEditorViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
}

export function getMobileEditorScrollEl(editor: Editor): HTMLElement | null {
  return editor.view.dom.closest('.mobile-editor-scroll') as HTMLElement | null;
}

/** Keep the caret visible above the on-screen keyboard (mobile). */
export function scrollMobileSelectionIntoView(editor: Editor) {
  if (!isMobileEditorViewport()) return;

  const scrollEl = getMobileEditorScrollEl(editor);
  if (!scrollEl) return;

  const vv = window.visualViewport;
  if (!vv) return;

  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);
  const visibleBottom = vv.offsetTop + vv.height - 20;
  const visibleTop = vv.offsetTop + 64;

  if (coords.bottom > visibleBottom) {
    scrollEl.scrollTop += coords.bottom - visibleBottom;
  } else if (coords.top < visibleTop) {
    scrollEl.scrollTop += coords.top - visibleTop;
  }
}
