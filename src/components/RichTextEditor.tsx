import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LightboxImage } from './ImageLightbox';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import DragHandle from '@tiptap/extension-drag-handle-react';
import {
  defaultComputePositionConfig,
  type NestedOptions,
} from '@tiptap/extension-drag-handle';

import {
  createEditorGutterGuardPlugin,
  editorGutterGuardKey,
  setGutterActive,
} from './EditorGutterGuardPlugin';
import { Extension, type Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { common, createLowlight } from 'lowlight';
import { EditorCodeBlockLanguageAffix } from './EditorCodeBlockLanguageAffix';
import { editorWideDropcursor } from '../utils/editorWideDropcursor';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code2,
  Code,
  ImageIcon,
  Link2,
  Unlink,
  ClipboardList,
  Plus,
  Minus,
  MessageSquare,
  Type,
  GripVertical,
} from 'lucide-react';
import type { NoteAttachment } from '../types';
import { hydrateNoteHtmlContent } from '../utils/noteImageStorage';
import { hydrateWorkspaceTaskMentionsInHtml } from '../utils/workspaceTaskMentionHtml';
import { LinkDialog } from './LinkDialog';
import { CommentDialog } from './CommentDialog';
import { useAuthStore } from '../store/authStore';
import { profileFullName } from '../types/profile';
import { NoteImage } from './NoteImageExtension';
import {
  captureMobileEditorScroll,
  createMobileEditorScrollGuard,
  isKeyboardLikelyOpen,
  isTaskCheckboxLabelTarget,
  restoreMobileEditorScroll,
  scrollMobileSelectionIntoView,
} from '../utils/mobileEditorScroll';
import { editorHtmlEquivalent } from '../utils/editorHtml';
import { WorkspaceTaskMention } from './WorkspaceTaskMentionExtension';
import { NoteComment } from './NoteCommentExtension';
import { clearEditorDropcursor } from '../utils/editorBlockDrag';
const lowlight = createLowlight(common);
if (lowlight.registered('xml')) {
  lowlight.registerAlias({ html: 'xml' });
}

const EditorWideDropcursor = Extension.create({
  name: 'editorWideDropcursor',
  addProseMirrorPlugins() {
    return [
      editorWideDropcursor({
        color: 'var(--color-primary)',
        width: 3,
        class: 'prose-editor-dropcursor',
      }),
    ];
  },
});

const EDITOR_GUTTER_LEFT_PX = -10;
const EDITOR_GUTTER_ROW_HEIGHT_PX = 28;

const EDITOR_DRAG_HANDLE_NESTED: NestedOptions = {
  defaultRules: true,
  edgeDetection: 'none',
  rules: [
    {
      id: 'excludeListWrapper',
      evaluate: ({ node }) =>
        ['bulletList', 'orderedList', 'taskList'].includes(node.type.name) ? 1000 : 0,
    },
    {
      id: 'excludeParagraphInListItem',
      evaluate: ({ node, parent }) =>
        parent?.type.name === 'listItem' && node.type.name === 'paragraph' ? 1000 : 0,
    },
  ],
};

function textPosForBlockInsert(doc: Editor['state']['doc'], blockPos: number): number {
  const node = doc.nodeAt(blockPos);
  if (!node) return blockPos;
  return blockPos + 1;
}

function outerEditorBlockDom(view: Editor['view'], dom: HTMLElement): HTMLElement {
  let el: HTMLElement = dom;
  while (el.parentElement && el.parentElement !== view.dom) {
    el = el.parentElement;
  }
  return el;
}

function gutterBlockElement(view: Editor['view'], pos: number, blockType: string): HTMLElement | null {
  const raw = view.nodeDOM(pos);
  if (!(raw instanceof HTMLElement)) return null;
  if (blockType === 'listItem' || blockType === 'taskItem') {
    const li = raw.closest('li');
    return li instanceof HTMLElement ? li : raw;
  }
  if (blockType === 'horizontalRule') {
    if (raw.matches('hr')) return raw;
    const hr = raw.querySelector('hr');
    if (hr instanceof HTMLElement) return hr;
  }
  return outerEditorBlockDom(view, raw);
}

function virtualGutterRect(blockEl: HTMLElement, blockType: string): DOMRect {
  const rect = blockEl.getBoundingClientRect();
  if (blockType === 'image') {
    return new DOMRect(rect.left, rect.top, rect.width, rect.height);
  }
  const gutterH = EDITOR_GUTTER_ROW_HEIGHT_PX;
  const top = rect.top + Math.max(0, (rect.height - gutterH) / 2);
  return new DOMRect(rect.left, top, rect.width, gutterH);
}

function MenuIconButton({
  onClick,
  active,
  children,
  title,
  className = '',
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors cursor-pointer ${className} ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

type InsertBlockItem = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords: string[];
  run: (editor: Editor) => void;
};

const INSERT_MENU_WIDTH_PX = 340;
const INSERT_MENU_MAX_HEIGHT_PX = 420;

function insertMenuAnchor(editor: Editor, atPos: number) {
  const coords = editor.view.coordsAtPos(atPos);
  const pad = 12;
  const gap = 8;
  const maxHeight = Math.min(INSERT_MENU_MAX_HEIGHT_PX, Math.round(window.innerHeight * 0.65));
  const menuWidth = Math.min(INSERT_MENU_WIDTH_PX, window.innerWidth - pad * 2);
  const left = Math.max(pad, Math.min(coords.left, window.innerWidth - menuWidth - pad));

  const belowTop = coords.bottom + gap;
  const spaceBelow = window.innerHeight - pad - belowTop;
  const spaceAbove = coords.top - gap - pad;
  const minComfortable = Math.min(maxHeight, 220);

  let top: number;
  if (spaceBelow >= minComfortable || spaceBelow >= spaceAbove) {
    top = belowTop;
  } else {
    top = coords.top - gap - maxHeight;
  }
  top = Math.max(pad, Math.min(top, window.innerHeight - pad - 64));
  return { top, left };
}

function getSlashInsertMenu(editor: Editor) {
  const { from, $from } = editor.state.selection;
  if (!$from.parent.isTextblock) return null;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
  const match = textBefore.match(/(?:^|\s)\/([^\s/]*)$/);
  if (!match) return null;
  const filter = match[1] ?? '';
  const slashFrom = from - filter.length - 1;
  const anchor = insertMenuAnchor(editor, from);
  return {
    slashFrom,
    filter,
    top: anchor.top,
    left: anchor.left,
  };
}

function EditorInsertMenuPanel({
  filter,
  top,
  left,
  onPick,
  onClose,
  workspaceTaskSuggestions,
  onInsertImage,
}: {
  filter: string;
  top: number;
  left: number;
  onPick: (item: InsertBlockItem) => void;
  onClose: () => void;
  workspaceTaskSuggestions: { id: string; title: string; folderId: string }[];
  onInsertImage: () => void;
}) {
  const items: InsertBlockItem[] = useMemo(() => {
    const base: InsertBlockItem[] = [
      {
        id: 'text',
        label: 'Text',
        hint: 'Plain paragraph',
        icon: <Type size={16} />,
        keywords: ['text', 'paragraph', 'normal'],
        run: (ed) => ed.chain().focus().setParagraph().run(),
      },
      {
        id: 'h1',
        label: 'Heading 1',
        hint: '#',
        icon: <Heading1 size={16} />,
        keywords: ['heading', 'h1', 'title'],
        run: (ed) => ed.chain().focus().setHeading({ level: 1 }).run(),
      },
      {
        id: 'h2',
        label: 'Heading 2',
        hint: '##',
        icon: <Heading2 size={16} />,
        keywords: ['heading', 'h2', 'subtitle'],
        run: (ed) => ed.chain().focus().setHeading({ level: 2 }).run(),
      },
      {
        id: 'h3',
        label: 'Heading 3',
        hint: '###',
        icon: <Heading3 size={16} />,
        keywords: ['heading', 'h3'],
        run: (ed) => ed.chain().focus().setHeading({ level: 3 }).run(),
      },
      {
        id: 'bullet',
        label: 'Bulleted list',
        icon: <List size={16} />,
        keywords: ['bullet', 'list', 'ul'],
        run: (ed) => ed.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'ordered',
        label: 'Numbered list',
        icon: <ListOrdered size={16} />,
        keywords: ['numbered', 'list', 'ol'],
        run: (ed) => ed.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'task',
        label: 'To-do list',
        icon: <CheckSquare size={16} />,
        keywords: ['todo', 'task', 'checkbox', 'check'],
        run: (ed) => ed.chain().focus().toggleTaskList().run(),
      },
      {
        id: 'code',
        label: 'Code block',
        icon: <Code2 size={16} />,
        keywords: ['code', 'snippet'],
        run: (ed) => ed.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: 'divider',
        label: 'Divider',
        icon: <Minus size={16} />,
        keywords: ['divider', 'line', 'hr', 'rule'],
        run: (ed) => ed.chain().focus().setHorizontalRule().run(),
      },
      {
        id: 'image',
        label: 'Image',
        icon: <ImageIcon size={16} />,
        keywords: ['image', 'photo', 'picture', 'file'],
        run: () => onInsertImage(),
      },
    ];
    if (workspaceTaskSuggestions.length > 0) {
      base.push({
        id: 'task-mention',
        label: 'Link workspace task',
        hint: 'task:',
        icon: <ClipboardList size={16} />,
        keywords: ['task', 'mention', 'company'],
        run: (ed) => ed.chain().focus().insertContent('task:').run(),
      });
    }
    return base;
  }, [onInsertImage, workspaceTaskSuggestions.length]);

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q)),
      )
    : items;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    const pad = 12;
    let rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - pad) {
      const shiftedTop = Math.max(pad, top - (rect.bottom - window.innerHeight + pad));
      el.style.top = `${shiftedTop}px`;
      rect = el.getBoundingClientRect();
    }
    if (rect.top < pad) {
      el.style.top = `${pad}px`;
    }
  }, [top, left, filtered.length]);

  return (
    <div
      ref={panelRef}
      data-editor-insert-menu
      className="fixed z-[60] w-[min(340px,calc(100vw-24px))] max-h-[min(420px,65vh)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-background shadow-xl py-1"
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {q ? 'Type to filter…' : 'Basic blocks'}
      </p>
      {filtered.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">No matches</p>
      ) : (
        filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer"
          >
            <span className="shrink-0 text-muted-foreground">{item.icon}</span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.hint && (
              <span className="text-xs text-muted-foreground/70 tabular-nums">{item.hint}</span>
            )}
          </button>
        ))
      )}
      <p className="px-3 py-1.5 border-t border-border/60 text-[11px] text-muted-foreground">
        Close menu <kbd className="px-1 rounded bg-muted font-mono text-[10px]">Esc</kbd>
      </p>
    </div>
  );
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface RichTextEditorProps {
  noteId: string;
  content: string;
  onUpdate: (html: string) => void;
  onAddAttachment: (file: File) => Promise<NoteAttachment | null>;
  onFileClick: () => void;
  onEditorReady?: (editor: Editor) => void;
  compact?: boolean;
  /** Tap embedded images to preview (mobile); disables drag/select on images. */
  onPreviewImage?: (image: LightboxImage) => void;
  attachments?: NoteAttachment[];
  workspaceTaskSuggestions?: { id: string; title: string; folderId: string }[];
  onOpenWorkspaceTask?: (taskId: string, folderId: string) => void;
}

export function RichTextEditor({
  noteId,
  content,
  onUpdate,
  onAddAttachment,
  onFileClick,
  onEditorReady,
  compact: _compact,
  onPreviewImage,
  attachments = [],
  workspaceTaskSuggestions = [],
  onOpenWorkspaceTask,
}: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentView, setCommentView] = useState<{
    text: string;
    authorName?: string | null;
    top: number;
    left: number;
  } | null>(null);
  const [insertMenu, setInsertMenu] = useState<{
    slashFrom: number | null;
    filter: string;
    top: number;
    left: number;
  } | null>(null);
  const insertMenuPinnedRef = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const dragBlockPosRef = useRef<number | null>(null);
  const dragBlockTypeRef = useRef<string | null>(null);
  const gutterHoverRef = useRef<{ pos: number; type: string } | null>(null);
  const [taskMention, setTaskMention] = useState<{
    query: string;
    from: number;
    top: number;
    left: number;
  } | null>(null);
  const [linkDialogUrl, setLinkDialogUrl] = useState('');
  const onAddAttachmentRef = useRef(onAddAttachment);
  onAddAttachmentRef.current = onAddAttachment;

  const editorRef = useRef<Editor | null>(null);
  const lastEmittedHtmlRef = useRef<string | null>(null);
  const suppressExternalSyncUntilRef = useRef(0);

  const dragHandleComputeConfig = useMemo(() => ({ ...defaultComputePositionConfig }), []);

  const getDragHandleVirtualElement = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return null;
    const pos = dragBlockPosRef.current;
    const blockType = dragBlockTypeRef.current ?? '';
    if (pos == null) return null;
    const blockEl = gutterBlockElement(ed.view, pos, blockType);
    if (!blockEl) return null;
    return {
      getBoundingClientRect: () => virtualGutterRect(blockEl, blockType),
    };
  }, []);
  const mobileTaskScrollHoldRef = useRef<ReturnType<typeof captureMobileEditorScroll>>(null);
  const prevNoteIdRef = useRef(noteId);
  const onPreviewImageRef = useRef(onPreviewImage);
  onPreviewImageRef.current = onPreviewImage;
  const imageTapRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const imagePreviewTouch = Boolean(onPreviewImage);
  const workspaceTaskSuggestionsRef = useRef(workspaceTaskSuggestions);
  workspaceTaskSuggestionsRef.current = workspaceTaskSuggestions;
  const onOpenWorkspaceTaskRef = useRef(onOpenWorkspaceTask);
  onOpenWorkspaceTaskRef.current = onOpenWorkspaceTask;

  const editorHtml = useMemo(() => {
    const base = hydrateNoteHtmlContent(content, attachments);
    return hydrateWorkspaceTaskMentionsInHtml(
      base,
      workspaceTaskSuggestions.map((t) => ({
        id: t.id,
        title: t.title,
        folderId: t.folderId,
      })),
    );
  }, [content, attachments, workspaceTaskSuggestions]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: false,
        dropcursor: false,
        heading: { levels: [1, 2, 3] },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Press / to insert blocks' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      NoteImage.configure({
        inline: false,
        allowBase64: true,
        touchPreview: imagePreviewTouch,
        resize: imagePreviewTouch
          ? false
          : {
              enabled: true,
              directions: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
              minWidth: 80,
              minHeight: 80,
              alwaysPreserveAspectRatio: true,
            },
        HTMLAttributes: {
          class: 'editor-image',
          draggable: imagePreviewTouch ? 'false' : 'true',
        },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'note-link',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      WorkspaceTaskMention,
      NoteComment,
      EditorWideDropcursor,
    ],
    [imagePreviewTouch],
  );

  const refreshInsertMenu = useCallback((ed: Editor) => {
    const slash = getSlashInsertMenu(ed);
    if (slash) {
      insertMenuPinnedRef.current = false;
      setInsertMenu({
        slashFrom: slash.slashFrom,
        filter: slash.filter,
        top: slash.top,
        left: slash.left,
      });
      return;
    }
    if (!insertMenuPinnedRef.current) {
      setInsertMenu(null);
    }
  }, []);

  const refreshTaskMentionMenu = useCallback((ed: Editor) => {
    if (!workspaceTaskSuggestionsRef.current.length) {
      setTaskMention(null);
      return;
    }
    const { from } = ed.state.selection;
    const lookback = 48;
    const start = Math.max(0, from - lookback);
    const textBefore = ed.state.doc.textBetween(start, from, '\n', '\0');
    const lower = textBefore.toLowerCase();
    const trigger = lower.lastIndexOf('task:');
    if (trigger === -1) {
      setTaskMention(null);
      return;
    }
    const query = textBefore.slice(trigger + 5);
    if (/\s/.test(query)) {
      setTaskMention(null);
      return;
    }
    const coords = ed.view.coordsAtPos(from);
    setTaskMention({
      query: query.toLowerCase(),
      from: from - query.length - 5,
      top: coords.bottom + 6,
      left: coords.left,
    });
  }, []);

  const insertWorkspaceTaskMention = useCallback(
    (task: { id: string; title: string; folderId: string }) => {
      const ed = editorRef.current;
      if (!ed || !taskMention) return;
      ed
        .chain()
        .focus()
        .deleteRange({ from: taskMention.from, to: ed.state.selection.from })
        .insertContent({
          type: 'workspaceTaskMention',
          attrs: {
            taskId: task.id,
            taskTitle: task.title,
            folderId: task.folderId,
          },
        })
        .insertContent(' ')
        .run();
      setTaskMention(null);
    },
    [taskMention],
  );

  const insertImageFile = useCallback(
    async (
      file: File,
      view?: {
        posAtCoords: (coords: { left: number; top: number }) => { pos: number } | null;
        state: { selection: { from: number } };
      },
      coords?: { left: number; top: number },
    ) => {
      if (!file.type.startsWith('image/')) return false;
      const attachment = await onAddAttachmentRef.current(file);
      if (!attachment) return false;

      const ed = editorRef.current;
      if (!ed) return false;

      const pos =
        view && coords
          ? view.posAtCoords({ left: coords.left, top: coords.top })?.pos ?? view.state.selection.from
          : ed.state.selection.from;

      ed.chain()
        .focus()
        .insertContentAt(pos, {
          type: 'image',
          attrs: {
            src: attachment.dataUrl,
            alt: file.name,
            attachmentId: attachment.id,
          },
        })
        .run();
      return true;
    },
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: editorHtml,
    editorProps: {
      attributes: {
        class:
          'prose-editor editor-prose-inset focus:outline-none min-h-[300px] max-md:min-h-[180px] pr-1',
        spellcheck: 'true',
      },
      // On mobile we scroll the note pane ourselves (keyboard-aware).
      handleScrollToSelection: () => !window.matchMedia('(max-width: 767px)').matches,
      handleClick(_view, _pos, event) {
        const target = event.target;
        if (target instanceof Element) {
          const commentEl = target.closest('.note-comment');
          if (commentEl instanceof HTMLElement) {
            const text = commentEl.getAttribute('data-note-comment')?.trim();
            if (text) {
              event.preventDefault();
              const rect = commentEl.getBoundingClientRect();
              setCommentView({
                text,
                authorName: commentEl.getAttribute('data-comment-author'),
                top: rect.bottom + 6,
                left: rect.left,
              });
              return true;
            }
          }
        }
        return false;
      },
      handleClickOn(_view, _pos, node, _nodePos, event) {
        if (node.type.name === 'workspaceTaskMention') {
          event.preventDefault();
          const taskId = node.attrs.taskId as string;
          const folderId = node.attrs.folderId as string;
          if (taskId && folderId) onOpenWorkspaceTaskRef.current?.(taskId, folderId);
          return true;
        }
        if (!onPreviewImageRef.current || node.type.name !== 'image') return false;
        event.preventDefault();
        onPreviewImageRef.current({
          src: node.attrs.src as string,
          alt: (node.attrs.alt as string) || 'Note image',
          attachmentId: (node.attrs.attachmentId as string | null) ?? null,
        });
        return true;
      },
      handleDOMEvents: {
        touchstart: (view, event) => {
          if (!isTaskCheckboxLabelTarget(event.target)) {
            if (onPreviewImageRef.current && event.target instanceof Element) {
              const img = event.target.closest('img.editor-image, .prose-editor img');
              if (img instanceof HTMLImageElement) {
                const touch = event.touches[0];
                if (touch) {
                  imageTapRef.current = {
                    x: touch.clientX,
                    y: touch.clientY,
                    t: Date.now(),
                  };
                }
              }
            }
            return false;
          }
          mobileTaskScrollHoldRef.current = captureMobileEditorScroll(view.dom);
          if (!isKeyboardLikelyOpen()) {
            event.preventDefault();
          }
          return false;
        },
        touchend: (_view, event) => {
          const pending = imageTapRef.current;
          imageTapRef.current = null;
          if (!pending || !onPreviewImageRef.current) return false;
          const touch = event.changedTouches[0];
          if (!touch) return false;
          if (Math.hypot(touch.clientX - pending.x, touch.clientY - pending.y) > 14) {
            return false;
          }
          if (Date.now() - pending.t > 650) return false;
          const target = event.target;
          if (!(target instanceof Element)) return false;
          const img = target.closest('img.editor-image, .prose-editor img');
          if (!(img instanceof HTMLImageElement)) return false;
          event.preventDefault();
          onPreviewImageRef.current({
            src: img.currentSrc || img.src,
            alt: img.alt || 'Note image',
            attachmentId: img.getAttribute('data-attachment-id'),
          });
          return true;
        },
        mousedown: (view, event) => {
          if (!isTaskCheckboxLabelTarget(event.target)) return false;
          mobileTaskScrollHoldRef.current = captureMobileEditorScroll(view.dom);
          if (!isKeyboardLikelyOpen()) {
            event.preventDefault();
          }
          return false;
        },
      },
      handleDrop: (view, event, _slice, moved) => {
        // Internal drags (e.g. repositioning an image) must not create new attachments.
        if (moved) return false;

        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;

        event.preventDefault();
        void (async () => {
          for (const file of files) {
            if (file.type.startsWith('image/')) {
              await insertImageFile(file, view, { left: event.clientX, top: event.clientY });
            } else {
              await onAddAttachmentRef.current(file);
            }
          }
        })();
        return true;
      },
    },
    onSelectionUpdate: ({ editor: ed }) => {
      refreshTaskMentionMenu(ed);
      refreshInsertMenu(ed);
    },
    onUpdate: ({ editor: ed }) => {
      refreshTaskMentionMenu(ed);
      refreshInsertMenu(ed);
      const html = ed.getHTML();
      lastEmittedHtmlRef.current = html;
      suppressExternalSyncUntilRef.current = Date.now() + 800;
      onUpdate(html);
    },
  });

  editorRef.current = editor;

  const taskMentionOptions = useMemo(() => {
    if (!taskMention) return [];
    const q = taskMention.query;
    return workspaceTaskSuggestions
      .filter((t) => !q || t.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [taskMention, workspaceTaskSuggestions]);

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;

    if (prevNoteIdRef.current !== noteId) {
      prevNoteIdRef.current = noteId;
      lastEmittedHtmlRef.current = null;
      editor.commands.setContent(editorHtml || '', { emitUpdate: false });
      return;
    }

    if (Date.now() < suppressExternalSyncUntilRef.current) {
      return;
    }

    if (
      editorHtml === lastEmittedHtmlRef.current ||
      editorHtmlEquivalent(editorHtml, editor.getHTML()) ||
      editorHtmlEquivalent(editorHtml, lastEmittedHtmlRef.current ?? '')
    ) {
      return;
    }

    const scrollEl = editor.view.dom.closest('.mobile-editor-scroll') as HTMLElement | null;
    const scrollTop = scrollEl?.scrollTop ?? null;

    editor.commands.setContent(editorHtml || '', { emitUpdate: false });

    if (scrollEl && scrollTop !== null) {
      requestAnimationFrame(() => {
        scrollEl.scrollTop = scrollTop;
      });
    }
  }, [noteId, editorHtml, editor]);

  useEffect(() => {
    if (!editor) return;

    const scrollEl = editor.view.dom.closest('.mobile-editor-scroll') as HTMLElement | null;
    const guard = createMobileEditorScrollGuard(scrollEl);

    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      const hold = mobileTaskScrollHoldRef.current;
      if (!hold || !transaction.docChanged) return;
      mobileTaskScrollHoldRef.current = null;
      if (isKeyboardLikelyOpen()) return;
      restoreMobileEditorScroll(editor.view.dom, hold, { blurFocus: true });
    };

    let raf = 0;
    const scheduleScroll = () => {
      if (guard.shouldSkipAutoScroll()) return;
      if (!isKeyboardLikelyOpen()) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => scrollMobileSelectionIntoView(editor));
    };

    editor.on('transaction', onTransaction);
    editor.on('focus', scheduleScroll);

    return () => {
      cancelAnimationFrame(raf);
      guard.dispose();
      editor.off('transaction', onTransaction);
      editor.off('focus', scheduleScroll);
    };
  }, [editor]);

  const applyLink = (rawUrl: string) => {
    if (!editor) return;
    const url = normalizeUrl(rawUrl);
    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const { empty } = editor.state.selection;
    if (empty) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: url,
          marks: [{ type: 'link', attrs: { href: url } }],
        })
        .run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const openLinkDialog = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    setLinkDialogUrl(previousUrl ?? '');
    setLinkDialogOpen(true);
  };

  const openPlusInsertMenu = useCallback(() => {
    if (!editor) return;
    const blockPos = dragBlockPosRef.current;
    const insertAt =
      blockPos != null
        ? textPosForBlockInsert(editor.state.doc, blockPos)
        : editor.state.selection.from;
    editor.chain().focus().setTextSelection(insertAt).run();
    insertMenuPinnedRef.current = true;
    const anchor = insertMenuAnchor(editor, insertAt);
    setInsertMenu({
      slashFrom: null,
      filter: '',
      top: anchor.top,
      left: anchor.left,
    });
  }, [editor]);

  const closeInsertMenu = useCallback(() => {
    insertMenuPinnedRef.current = false;
    setInsertMenu(null);
  }, []);

  useEffect(() => {
    if (!insertMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest('[data-editor-insert-menu]')) return;
      closeInsertMenu();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [insertMenu, closeInsertMenu]);

  useEffect(() => {
    if (!editor) return;
    const guard = createEditorGutterGuardPlugin(
      () => gutterHoverRef.current,
      EDITOR_GUTTER_LEFT_PX,
    );
    const registerId = window.setTimeout(() => {
      if (!editor.isDestroyed) {
        editor.registerPlugin(guard);
      }
    }, 0);
    return () => {
      window.clearTimeout(registerId);
      if (!editor.isDestroyed) {
        editor.unregisterPlugin(editorGutterGuardKey);
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const parent = editor.view.dom.parentElement;
    const onLeave = (e: MouseEvent) => {
      const related = e.relatedTarget;
      if (related instanceof Node && parent?.contains(related)) return;
      if (related instanceof Element && related.closest('.editor-drag-gutter')) return;
      gutterHoverRef.current = null;
      dragBlockPosRef.current = null;
      dragBlockTypeRef.current = null;
      setGutterActive(editor, false);
    };
    editor.view.dom.addEventListener('mouseleave', onLeave);
    return () => editor.view.dom.removeEventListener('mouseleave', onLeave);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const view = editor.view;
    const clearDropLine = () => clearEditorDropcursor(editor);
    const flushDropLine = () => {
      clearDropLine();
      requestAnimationFrame(clearDropLine);
      window.setTimeout(clearDropLine, 0);
      window.setTimeout(clearDropLine, 50);
    };
    document.addEventListener('dragend', flushDropLine);
    view.dom.addEventListener('drop', flushDropLine);
    return () => {
      document.removeEventListener('dragend', flushDropLine);
      view.dom.removeEventListener('drop', flushDropLine);
    };
  }, [editor]);

  const runInsertItem = useCallback(
    (item: InsertBlockItem) => {
      if (!editor) return;
      if (insertMenu?.slashFrom != null) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: insertMenu.slashFrom, to: editor.state.selection.from })
          .run();
      }
      item.run(editor);
      closeInsertMenu();
    },
    [editor, insertMenu, closeInsertMenu],
  );

  const openCommentDialog = () => {
    if (!editor) return;
    if (editor.state.selection.empty) return;
    const attrs = editor.getAttributes('noteComment');
    setCommentDraft((attrs.comment as string | undefined) ?? '');
    setCommentDialogOpen(true);
  };

  const saveComment = (text: string) => {
    if (!editor) return;
    const profile = useAuthStore.getState().profile;
    const authorName = profile ? profileFullName(profile) : 'You';
    editor
      .chain()
      .focus()
      .extendMarkRange('noteComment')
      .setMark('noteComment', { comment: text, authorName })
      .run();
  };

  const removeComment = () => {
    editor?.chain().focus().extendMarkRange('noteComment').unsetMark('noteComment').run();
  };

  useEffect(() => {
    if (!commentView) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest('[data-comment-popover]')) return;
      setCommentView(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [commentView]);

  return (
    <>
      <LinkDialog
        open={linkDialogOpen}
        initialUrl={linkDialogUrl}
        onSave={applyLink}
        onClose={() => setLinkDialogOpen(false)}
      />
      <CommentDialog
        open={commentDialogOpen}
        initialComment={commentDraft}
        onSave={saveComment}
        onRemove={commentDraft ? removeComment : undefined}
        onClose={() => setCommentDialogOpen(false)}
      />
      {commentView && (
        <div
          data-comment-popover
          className="fixed z-[70] max-w-sm rounded-lg border border-border bg-background shadow-xl px-3 py-2.5"
          style={{ top: commentView.top, left: commentView.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {commentView.authorName && (
            <p className="text-[11px] font-medium text-muted-foreground mb-1">{commentView.authorName}</p>
          )}
          <p className="text-sm text-foreground whitespace-pre-wrap">{commentView.text}</p>
        </div>
      )}

      {!editor ? (
        <div className="flex items-center justify-center min-h-[300px] text-sm text-muted-foreground">
          Loading editor...
        </div>
      ) : (
        <div ref={shellRef} className="relative editor-shell">
          <DragHandle
            editor={editor}
            nested={EDITOR_DRAG_HANDLE_NESTED}
            className="editor-drag-gutter"
            computePositionConfig={dragHandleComputeConfig}
            getReferencedVirtualElement={getDragHandleVirtualElement}
            onNodeChange={({ node, pos }) => {
              if (!node) return;
              const type = node.type.name;
              dragBlockPosRef.current = pos;
              dragBlockTypeRef.current = type;
              gutterHoverRef.current = { pos, type };
              setGutterActive(editor, true);
            }}
            onElementDragEnd={() => clearEditorDropcursor(editor)}
          >
            <div className="editor-block-gutter">
              <button
                type="button"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  openPlusInsertMenu();
                }}
                className="editor-gutter-btn"
                title="Insert block"
                aria-label="Insert block"
              >
                <Plus size={16} strokeWidth={1.75} />
              </button>
              <span
                className="editor-gutter-drag"
                title="Drag to move block"
                aria-label="Drag block"
              >
                <GripVertical size={16} strokeWidth={1.75} />
              </span>
            </div>
          </DragHandle>

          <BubbleMenu
            editor={editor}
            className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-background shadow-lg px-1.5 py-1.5 max-w-[min(100vw-24px,420px)]"
            options={{
              placement: 'top',
              offset: 12,
              flip: {
                padding: { top: 96, bottom: 16, left: 20, right: 20 },
              },
              shift: { padding: 20 },
            }}
            shouldShow={({ editor: ed, from, to }) =>
              from !== to && !ed.isActive('codeBlock') && !ed.isActive('image')
            }
          >
            <MenuIconButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Bold"
            >
              <Bold size={15} />
            </MenuIconButton>
            <MenuIconButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Italic"
            >
              <Italic size={15} />
            </MenuIconButton>
            <MenuIconButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough size={15} />
            </MenuIconButton>
            <MenuIconButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')}
              title="Inline code"
            >
              <Code size={15} />
            </MenuIconButton>
            <div className="w-px h-5 bg-border mx-0.5" />
            <MenuIconButton onClick={openLinkDialog} active={editor.isActive('link')} title="Link">
              <Link2 size={15} />
            </MenuIconButton>
            {editor.isActive('link') && (
              <MenuIconButton
                onClick={() => editor.chain().focus().unsetLink().run()}
                title="Remove link"
              >
                <Unlink size={15} />
              </MenuIconButton>
            )}
            <MenuIconButton
              onClick={openCommentDialog}
              active={editor.isActive('noteComment')}
              title="Comment"
            >
              <MessageSquare size={15} />
            </MenuIconButton>
          </BubbleMenu>

          <EditorCodeBlockLanguageAffix editor={editor} />

          {insertMenu && (
            <EditorInsertMenuPanel
              filter={insertMenu.filter}
              top={insertMenu.top}
              left={insertMenu.left}
              workspaceTaskSuggestions={workspaceTaskSuggestions}
              onInsertImage={onFileClick}
              onClose={closeInsertMenu}
              onPick={(item) => {
                if (item.id === 'image') {
                  if (insertMenu.slashFrom != null) {
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: insertMenu.slashFrom, to: editor.state.selection.from })
                      .run();
                  }
                  closeInsertMenu();
                  onFileClick();
                  return;
                }
                runInsertItem(item);
              }}
            />
          )}

          {taskMention && taskMentionOptions.length > 0 && (
            <div
              className="fixed z-50 min-w-[200px] max-w-sm py-1 rounded-lg border border-border bg-background shadow-lg"
              style={{ top: taskMention.top, left: taskMention.left }}
            >
              {taskMentionOptions.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertWorkspaceTaskMention(task);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer truncate"
                >
                  {task.title || 'Untitled task'}
                </button>
              ))}
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      )}
    </>
  );
}

/** Insert image(s) from file picker at the current cursor. */
export async function insertImagesFromFiles(
  editor: Editor,
  files: File[],
  onAddAttachment: (file: File) => Promise<NoteAttachment | null>,
) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      await onAddAttachment(file);
      continue;
    }
    const attachment = await onAddAttachment(file);
    if (!attachment) continue;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'image',
        attrs: {
          src: attachment.dataUrl,
          alt: file.name,
          attachmentId: attachment.id,
        },
      })
      .run();
  }
}
