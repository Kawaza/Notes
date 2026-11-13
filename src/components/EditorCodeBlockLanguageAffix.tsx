import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { ChevronDown, Search } from 'lucide-react';
import { CODE_LANGUAGE_OPTIONS } from '../constants/codeLanguages';

function currentLanguage(editor: Editor): string {
  const attrs = editor.getAttributes('codeBlock');
  const lang = attrs?.language;
  return typeof lang === 'string' ? lang : '';
}

function findActivePre(editor: Editor): DOMRect | null {
  const { view, state } = editor;
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type.name !== 'codeBlock') continue;
    const pos = $from.before(depth);
    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) return null;
    const pre = dom.tagName === 'PRE' ? dom : dom.closest('pre');
    return pre?.getBoundingClientRect() ?? null;
  }
  return null;
}

export function EditorCodeBlockLanguageAffix({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [preRect, setPreRect] = useState<DOMRect | null>(null);
  const active = currentLanguage(editor);

  const label = CODE_LANGUAGE_OPTIONS.find((o) => o.value === active)?.label ?? 'Plain text';

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CODE_LANGUAGE_OPTIONS;
    return CODE_LANGUAGE_OPTIONS.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [query]);

  const refresh = useCallback(() => {
    if (!editor.isActive('codeBlock')) {
      setPreRect(null);
      setOpen(false);
      return;
    }
    setPreRect(findActivePre(editor));
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', refresh);
    editor.on('transaction', refresh);
    const scrollEl = editor.view.dom.closest('.mobile-editor-scroll');
    scrollEl?.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('scroll', refresh, true);
    window.addEventListener('resize', refresh);
    refresh();
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('transaction', refresh);
      scrollEl?.removeEventListener('scroll', refresh);
      window.removeEventListener('scroll', refresh, true);
      window.removeEventListener('resize', refresh);
    };
  }, [editor, refresh]);

  if (!preRect) return null;

  const top = preRect.top + 10;
  const right = window.innerWidth - preRect.right + 10;

  return createPortal(
    <div
      className="fixed z-[60]"
      style={{ top, right, left: 'auto' }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-border/80 bg-background/95 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground shadow-md"
      >
        {label}
        <ChevronDown size={13} className="opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 max-h-72 overflow-hidden rounded-lg border border-border bg-background shadow-xl flex flex-col">
          <div className="flex items-center gap-2 border-b border-border px-2 py-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a language…"
              className="w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <ul className="overflow-y-auto py-1">
            {options.map((opt) => (
              <li key={opt.value || '__plain'}>
                <button
                  type="button"
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .updateAttributes('codeBlock', { language: opt.value || null })
                      .run();
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-muted cursor-pointer ${
                    active === opt.value ? 'text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
            {!options.length && (
              <li className="px-3 py-2 text-xs text-muted-foreground">No matches</li>
            )}
          </ul>
        </div>
      )}
    </div>,
    document.body,
  );
}
