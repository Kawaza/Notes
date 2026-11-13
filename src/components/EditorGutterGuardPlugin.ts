import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export const editorGutterGuardKey = new PluginKey('editorGutterGuard');

type GutterHover = { pos: number; type: string };

export function setGutterActive(editor: Editor | null | undefined, active: boolean) {
  if (!editor || editor.isDestroyed) return;
  const gutter = editor.view.dom.parentElement?.querySelector(
    '.editor-drag-gutter',
  ) as HTMLElement | null;
  if (!gutter) return;
  if (active) {
    gutter.dataset.gutterActive = 'true';
  } else {
    delete gutter.dataset.gutterActive;
  }
}

export function createEditorGutterGuardPlugin(
  getHover: () => GutterHover | null,
  pinLeftPx: number,
) {
  const pinLeft = (view: EditorView) => {
    const gutter = view.dom.parentElement?.querySelector(
      '.editor-drag-gutter',
    ) as HTMLElement | null;
    if (!gutter) return;
    const leftStr = `${pinLeftPx}px`;
    if (gutter.style.left !== leftStr) {
      gutter.style.left = leftStr;
    }
  };

  const syncActive = (view: EditorView) => {
    const gutter = view.dom.parentElement?.querySelector(
      '.editor-drag-gutter',
    ) as HTMLElement | null;
    if (!gutter) return;
    const active = getHover() != null;
    if (active) {
      gutter.dataset.gutterActive = 'true';
    } else {
      delete gutter.dataset.gutterActive;
    }
    pinLeft(view);
  };

  return new Plugin({
    key: editorGutterGuardKey,
    view(view) {
      let syncRaf = 0;
      const scheduleSync = () => {
        cancelAnimationFrame(syncRaf);
        syncRaf = requestAnimationFrame(() => syncActive(view));
      };
      scheduleSync();
      return {
        update() {
          scheduleSync();
        },
        destroy() {
          cancelAnimationFrame(syncRaf);
        },
      };
    },
  });
}
