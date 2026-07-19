import { useEffect, useRef, useCallback } from 'react';
import { renderMarkdownWithWikiLinks } from '../utils/markdown';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onWikiClick: (title: string) => void;
  onFileDrop: (file: File) => void;
}

export function MarkdownEditor({ content, onChange, onWikiClick, onFileDrop }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const updatePreview = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.innerHTML = renderMarkdownWithWikiLinks(content, onWikiClick);
    }
  }, [content, onWikiClick]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    for (const file of files) {
      await onFileDrop(file);
    }
  };

  return (
    <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        placeholder="Write markdown... Use [[Note Title]] for wiki links. Drop files or images here."
        spellCheck={false}
        className="flex-1 resize-none bg-transparent outline-none font-mono text-sm leading-relaxed px-1 py-0 min-h-[300px] border-r border-border/30"
      />
      <div className="flex-1 overflow-y-auto px-4 py-0 markdown-preview">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Preview</p>
        <div ref={previewRef} className="prose-editor text-sm" />
      </div>
    </div>
  );
}
