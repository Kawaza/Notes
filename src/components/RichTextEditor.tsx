import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
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
} from 'lucide-react';

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
  onFileDrop: (file: File) => void;
  onFileClick: () => void;
  compact?: boolean;
}

export function RichTextEditor({
  noteId,
  content,
  onUpdate,
  onFileDrop,
  onFileClick,
  compact,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Start writing or paste a link...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, allowBase64: true }),
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
      attributes: { class: 'prose-editor focus:outline-none min-h-[300px] px-1' },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        files.forEach(onFileDrop);
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => onUpdate(ed.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== content) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [noteId, content, editor]);

  const handleSetLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;

    if (editor.isActive('link')) {
      const url = window.prompt('Edit link URL (leave empty to remove):', previousUrl ?? '');
      if (url === null) return;
      if (!url.trim()) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: normalizeUrl(url) })
        .run();
      return;
    }

    const url = window.prompt('Enter link URL:');
    if (!url?.trim()) return;
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: normalizeUrl(url) })
      .run();
  };

  const toolbarPad = compact ? '-mx-4 px-4' : '-mx-8 px-8';

  return (
    <>
      {editor && (
        <div className={`flex items-center gap-0.5 ${toolbarPad} py-2 border-b border-border/30 flex-wrap mb-4`}>
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
            onClick={handleSetLink}
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
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="H1"
          >
            <Heading1 size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="H2"
          >
            <Heading2 size={16} />
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullets"
          >
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbers"
          >
            <ListOrdered size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            title="Tasks"
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
