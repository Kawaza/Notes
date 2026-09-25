import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Code2,
  ImageIcon,
  Link2,
  Unlink,
  Pilcrow,
} from 'lucide-react';
import type { NoteAttachment } from '../types';
import { LinkDialog } from './LinkDialog';
import { NoteImage } from './NoteImageExtension';
import {
  createMobileEditorScrollGuard,
  scrollMobileSelectionIntoView,
} from '../utils/mobileEditorScroll';
import { editorHtmlEquivalent } from '../utils/editorHtml';

const lowlight = createLowlight(common);

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
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
}

export function RichTextEditor({
  noteId,
  content,
  onUpdate,
  onAddAttachment,
  onFileClick,
  onEditorReady,
  compact,
}: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogUrl, setLinkDialogUrl] = useState('');
  const onAddAttachmentRef = useRef(onAddAttachment);
  onAddAttachmentRef.current = onAddAttachment;

  const editorRef = useRef<Editor | null>(null);
  const lastEmittedHtmlRef = useRef<string | null>(null);
  const suppressExternalSyncUntilRef = useRef(0);
  const prevNoteIdRef = useRef(noteId);

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
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2] },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Start writing or paste a link...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      NoteImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'editor-image', draggable: 'true' },
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
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none min-h-[300px] max-md:min-h-[180px] px-1',
        spellcheck: 'true',
      },
      // On mobile we scroll the note pane ourselves (keyboard-aware).
      handleScrollToSelection: () => !window.matchMedia('(max-width: 767px)').matches,
      handleDOMEvents: {
        focus: (_view, event) => {
          const target = event.target as HTMLElement | null;
          if (
            window.matchMedia('(max-width: 767px)').matches &&
            target?.matches('input[type="checkbox"]')
          ) {
            target.blur();
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
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmittedHtmlRef.current = html;
      suppressExternalSyncUntilRef.current = Date.now() + 800;
      onUpdate(html);
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;

    if (prevNoteIdRef.current !== noteId) {
      prevNoteIdRef.current = noteId;
      lastEmittedHtmlRef.current = null;
      editor.commands.setContent(content || '', { emitUpdate: false });
      return;
    }

    if (Date.now() < suppressExternalSyncUntilRef.current) {
      return;
    }

    if (
      content === lastEmittedHtmlRef.current ||
      editorHtmlEquivalent(content, editor.getHTML()) ||
      editorHtmlEquivalent(content, lastEmittedHtmlRef.current ?? '')
    ) {
      return;
    }

    const scrollEl = editor.view.dom.closest('.mobile-editor-scroll') as HTMLElement | null;
    const scrollTop = scrollEl?.scrollTop ?? null;

    editor.commands.setContent(content || '', { emitUpdate: false });

    if (scrollEl && scrollTop !== null) {
      requestAnimationFrame(() => {
        scrollEl.scrollTop = scrollTop;
      });
    }
  }, [noteId, content, editor]);

  useEffect(() => {
    if (!editor) return;

    const scrollEl = editor.view.dom.closest('.mobile-editor-scroll') as HTMLElement | null;
    const guard = createMobileEditorScrollGuard(scrollEl);

    let raf = 0;
    const scheduleScroll = () => {
      if (guard.shouldSkipAutoScroll()) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => scrollMobileSelectionIntoView(editor));
    };

    editor.on('focus', scheduleScroll);

    return () => {
      cancelAnimationFrame(raf);
      guard.dispose();
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

  const setParagraph = () => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (editor.isActive('bulletList')) chain.toggleBulletList();
    if (editor.isActive('orderedList')) chain.toggleOrderedList();
    if (editor.isActive('taskList')) chain.toggleTaskList();
    chain.setParagraph().run();
  };

  const toggleHeading = (level: 1 | 2) => {
    if (!editor) return;
    if (editor.isActive('heading', { level })) {
      editor.chain().focus().setParagraph().run();
      return;
    }
    editor.chain().focus().setHeading({ level }).run();
  };

  const toggleBulletList = () => {
    if (!editor) return;
    editor.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    if (!editor) return;
    editor.chain().focus().toggleOrderedList().run();
  };

  const toggleTaskList = () => {
    if (!editor) return;
    editor.chain().focus().toggleTaskList().run();
  };

  const toolbarPad = compact
    ? '-mx-4 px-4 max-md:mx-0 max-md:px-0'
    : '-mx-4 px-4 md:-mx-8 md:px-8 max-md:mx-0 max-md:px-0';

  return (
    <>
      <LinkDialog
        open={linkDialogOpen}
        initialUrl={linkDialogUrl}
        onSave={applyLink}
        onClose={() => setLinkDialogOpen(false)}
      />

      {editor && (
        <div
          className={`flex items-center gap-0.5 ${toolbarPad} py-2 border-b border-border/30 mb-3 max-md:mb-2 max-md:overflow-x-auto max-md:flex-nowrap max-md:mobile-toolbar-scroll max-md:pr-1 md:flex-wrap`}
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic size={16} />
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton
            onClick={openLinkDialog}
            active={editor.isActive('link')}
            title="Add link (select text first)"
          >
            <Link2 size={16} />
          </ToolbarButton>
          {editor.isActive('link') && (
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetLink().run()}
              title="Remove link"
            >
              <Unlink size={16} />
            </ToolbarButton>
          )}
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton
            onClick={setParagraph}
            active={
              !editor.isActive('heading') &&
              !editor.isActive('bulletList') &&
              !editor.isActive('orderedList') &&
              !editor.isActive('taskList')
            }
            title="Normal text (exit heading or list)"
          >
            <Pilcrow size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => toggleHeading(1)}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1 (current line only)"
          >
            <Heading1 size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => toggleHeading(2)}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2 (current line only)"
          >
            <Heading2 size={16} />
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton
            onClick={toggleBulletList}
            active={editor.isActive('bulletList')}
            title="Bullets (current line)"
          >
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggleOrderedList}
            active={editor.isActive('orderedList')}
            title="Numbers (current line)"
          >
            <ListOrdered size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggleTaskList}
            active={editor.isActive('taskList')}
            title="Tasks (current line)"
          >
            <CheckSquare size={16} />
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code"
          >
            <Code2 size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={onFileClick} title="Insert file or image">
            <ImageIcon size={16} />
          </ToolbarButton>
        </div>
      )}

      {!editor ? (
        <div className="flex items-center justify-center min-h-[300px] text-sm text-muted-foreground">
          Loading editor...
        </div>
      ) : (
        <EditorContent editor={editor} />
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
