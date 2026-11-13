import { Plugin, type EditorState } from '@tiptap/pm/state';
import { dropPoint } from '@tiptap/pm/transform';
import type { EditorView } from '@tiptap/pm/view';

type DropCursorOptions = {
  color?: string | false;
  width?: number;
  class?: string;
};

/** Block dropcursor line spans the full editor width (incl. inside lists). */
class WideDropCursorView {
  private editorView: EditorView;
  private cursorPos: number | null = null;
  private element: HTMLDivElement | null = null;
  private timeout = -1;
  private lastDragEvent: DragEvent | null = null;
  private width: number;
  private color?: string;
  private class?: string;
  private handlers: { name: string; handler: (e: Event) => void }[] = [];

  constructor(editorView: EditorView, options: DropCursorOptions = {}) {
    this.editorView = editorView;
    this.width = options.width ?? 2;
    this.color = options.color === false ? undefined : options.color ?? 'var(--color-primary)';
    this.class = options.class;
    this.handlers = (['dragover', 'dragend', 'drop', 'dragleave'] as const).map((name) => {
      const handler = (e: Event) => {
        this[name](e as DragEvent);
      };
      editorView.dom.addEventListener(name, handler);
      return { name, handler };
    });
  }

  destroy() {
    this.handlers.forEach(({ name, handler }) =>
      this.editorView.dom.removeEventListener(name, handler),
    );
    this.setCursor(null);
  }

  update(editorView: EditorView, prevState: EditorState) {
    if (this.cursorPos != null && prevState.doc !== editorView.state.doc) {
      if (this.lastDragEvent) {
        const target = this.computeTarget(this.lastDragEvent);
        if (target === this.cursorPos) this.updateOverlay();
        else this.setCursor(target);
      } else {
        this.updateOverlay();
      }
    }
  }

  setCursor(pos: number | null) {
    if (pos === this.cursorPos) return;
    this.cursorPos = pos;
    if (pos == null) {
      this.element?.parentNode?.removeChild(this.element);
      this.element = null;
    } else {
      this.updateOverlay();
    }
  }

  updateOverlay() {
    if (this.cursorPos == null) return;

    const $pos = this.editorView.state.doc.resolve(this.cursorPos);
    const isBlock = !$pos.parent.inlineContent;
    const editorDOM = this.editorView.dom;
    const editorRect = editorDOM.getBoundingClientRect();
    const scaleX = editorRect.width / editorDOM.offsetWidth;
    const scaleY = editorRect.height / editorDOM.offsetHeight;

    let rect: { left: number; right: number; top: number; bottom: number } | undefined;

    if (isBlock) {
      const before = $pos.nodeBefore;
      const after = $pos.nodeAfter;
      if (before || after) {
        const node = this.editorView.nodeDOM(this.cursorPos - (before ? before.nodeSize : 0));
        if (node instanceof HTMLElement) {
          const nodeRect = node.getBoundingClientRect();
          let top = before ? nodeRect.bottom : nodeRect.top;
          if (before && after) {
            const afterDom = this.editorView.nodeDOM(this.cursorPos);
            if (afterDom instanceof HTMLElement) {
              top = (top + afterDom.getBoundingClientRect().top) / 2;
            }
          }
          const halfWidth = (this.width / 2) * scaleY;
          rect = {
            left: editorRect.left,
            right: editorRect.right,
            top: top - halfWidth,
            bottom: top + halfWidth,
          };
        }
      }
    }

    if (!rect) {
      const coords = this.editorView.coordsAtPos(this.cursorPos);
      const halfWidth = (this.width / 2) * scaleX;
      rect = {
        left: editorRect.left,
        right: editorRect.right,
        top: coords.top - halfWidth,
        bottom: coords.bottom + halfWidth,
      };
    }

    const parent = this.editorView.dom.offsetParent as HTMLElement | null;
    if (!this.element) {
      const mount = parent ?? document.body;
      this.element = mount.appendChild(document.createElement('div'));
      if (this.class) this.element.className = this.class;
      this.element.style.cssText = 'position: absolute; z-index: 50; pointer-events: none;';
      if (this.color) this.element.style.backgroundColor = this.color;
    }

    this.element.classList.toggle('prosemirror-dropcursor-block', isBlock);
    this.element.classList.toggle('prosemirror-dropcursor-inline', !isBlock);
    this.element.classList.add('prose-editor-dropcursor');

    let parentLeft: number;
    let parentTop: number;
    if (!parent || (parent === document.body && getComputedStyle(parent).position === 'static')) {
      parentLeft = -window.scrollX;
      parentTop = -window.scrollY;
    } else {
      const parentRect = parent.getBoundingClientRect();
      const parentScaleX = parentRect.width / parent.offsetWidth;
      const parentScaleY = parentRect.height / parent.offsetHeight;
      parentLeft = parentRect.left - parent.scrollLeft * parentScaleX;
      parentTop = parentRect.top - parent.scrollTop * parentScaleY;
    }

    this.element.style.left = `${(rect.left - parentLeft) / scaleX}px`;
    this.element.style.top = `${(rect.top - parentTop) / scaleY}px`;
    this.element.style.width = `${(rect.right - rect.left) / scaleX}px`;
    this.element.style.height = `${(rect.bottom - rect.top) / scaleY}px`;
  }

  scheduleRemoval(ms: number) {
    clearTimeout(this.timeout);
    this.timeout = window.setTimeout(() => this.setCursor(null), ms);
  }

  computeTarget(event: DragEvent): number | null {
    const pos = this.editorView.posAtCoords({ left: event.clientX, top: event.clientY });
    const node = pos && pos.inside >= 0 ? this.editorView.state.doc.nodeAt(pos.inside) : null;
    const disableDropCursor = node && node.type.spec.disableDropCursor;
    const disabled =
      typeof disableDropCursor === 'function'
        ? disableDropCursor(this.editorView, pos, event)
        : disableDropCursor;
    if (!pos || disabled) return null;

    let target = pos.pos;
    const dragging = this.editorView.dragging as { slice?: unknown } | null;
    if (dragging?.slice) {
      const point = dropPoint(this.editorView.state.doc, target, dragging.slice as never);
      if (point != null) target = point;
    }
    return target;
  }

  dragover(event: DragEvent) {
    if (!this.editorView.editable) return;
    this.lastDragEvent = event;
    const target = this.computeTarget(event);
    if (target != null) {
      this.setCursor(target);
      this.scheduleRemoval(5000);
    }
  }

  dragend() {
    this.scheduleRemoval(20);
  }

  drop() {
    this.scheduleRemoval(20);
  }

  dragleave(event: DragEvent) {
    if (event.target === this.editorView.dom) this.scheduleRemoval(30);
  }
}

export function editorWideDropcursor(options: DropCursorOptions = {}) {
  return new Plugin({
    view(editorView) {
      return new WideDropCursorView(editorView, options);
    },
  });
}
