import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

export const DROP_CURSOR_SELECTOR =
  '.prose-editor-dropcursor, .prosemirror-dropcursor, .prosemirror-dropcursor-block';

export function clearEditorDropcursor(editor: Editor) {
  const { view } = editor;
  view.dragging = null;
  const strip = (root: ParentNode | null | undefined) => {
    root?.querySelectorAll(DROP_CURSOR_SELECTOR).forEach((el) => el.remove());
  };
  strip(document);
  strip(view.dom);
  strip(view.dom.parentElement);
  strip(view.root);
}

export function startEditorBlockDrag(editor: Editor, event: DragEvent, blockPos: number) {
  if (!event.dataTransfer) return;
  const { view } = editor;
  const node = view.state.doc.nodeAt(blockPos);
  if (!node) return;

  const from = blockPos;
  const to = blockPos + node.nodeSize;
  const slice = view.state.doc.slice(from, to);
  const selection = NodeSelection.create(view.state.doc, from);

  const dom = view.nodeDOM(from);
  const blockEl =
    dom instanceof HTMLElement
      ? ((node.type.name === 'listItem' || node.type.name === 'taskItem'
          ? dom.closest('li')
          : dom) as HTMLElement | null)
      : null;

  const preview = document.createElement('div');
  if (blockEl) {
    const clone = blockEl.cloneNode(true) as HTMLElement;
    clone.style.margin = '0';
    preview.appendChild(clone);
  }
  preview.style.position = 'absolute';
  preview.style.top = '-10000px';
  preview.style.left = '0';
  document.body.append(preview);

  event.dataTransfer.clearData();
  const rect = preview.getBoundingClientRect();
  event.dataTransfer.setDragImage(preview, Math.max(8, rect.width * 0.5), 12);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    preview.remove();
    document.removeEventListener('drop', cleanup);
    document.removeEventListener('dragend', cleanup);
  };
  document.addEventListener('drop', cleanup, { once: true });
  document.addEventListener('dragend', cleanup, { once: true });

  // ProseMirror sets `node` on drag for node selections; typings omit it.
  (view as { dragging: { slice: typeof slice; move: boolean; node?: typeof selection } | null }).dragging = {
    slice,
    move: true,
    node: selection,
  };
  view.dispatch(view.state.tr.setSelection(selection).setMeta('addToHistory', false));
}
