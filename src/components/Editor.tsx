import { useCallback, useRef } from 'react';
import { Trash2, Pin, FileCode2, Maximize2, X, File, Download, Copy, Archive } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TaskSchedulePanel } from './TaskSchedulePanel';
import { TagInput } from './TagInput';
import { MarkdownEditor } from './MarkdownEditor';
import { RichTextEditor } from './RichTextEditor';
import { FolderOverview } from './FolderOverview';
import { ALL_NOTES_ID, isFolderArchived } from '../types';
import type { NoteAttachment } from '../types';

interface EditorProps {
  noteId?: string;
  compact?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
}

function isImageAttachment(attachment: NoteAttachment) {
  return attachment.mimeType.startsWith('image/');
}

function downloadAttachment(attachment: NoteAttachment) {
  const a = document.createElement('a');
  a.href = attachment.dataUrl;
  a.download = attachment.name;
  a.click();
}

export function Editor({ noteId: noteIdProp, compact, onExpand, onClose }: EditorProps = {}) {
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const selectedFolderId = useStore((s) => s.selectedFolderId);
  const activeNoteId = noteIdProp ?? selectedNoteId;
  const notes = useStore((s) => s.notes);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const duplicateNote = useStore((s) => s.duplicateNote);
  const archiveNote = useStore((s) => s.archiveNote);
  const togglePinNote = useStore((s) => s.togglePinNote);
  const toggleNoteEditorMode = useStore((s) => s.toggleNoteEditorMode);
  const addAttachment = useStore((s) => s.addAttachment);
  const removeAttachment = useStore((s) => s.removeAttachment);
  const openNoteByTitle = useStore((s) => s.openNoteByTitle);
  const folders = useStore((s) => s.folders);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const note = notes.find((n) => n.id === activeNoteId);
  const folder = note ? folders.find((f) => f.id === note.folderId) : null;
  const isMarkdown = note?.contentType === 'markdown';
  const canArchive = folder && !isFolderArchived(folder);

  const handleTitleChange = useCallback(
    (title: string) => {
      if (activeNoteId) updateNote(activeNoteId, { title });
    },
    [activeNoteId, updateNote]
  );

  const handleRichUpdate = useCallback(
    (html: string) => {
      if (activeNoteId) updateNote(activeNoteId, { content: html });
    },
    [activeNoteId, updateNote]
  );

  const handleFileDrop = useCallback(
    async (file: File) => {
      if (!activeNoteId || !note) return;
      const attachment = await addAttachment(activeNoteId, file);
      if (!attachment) return;

      if (file.type.startsWith('image/')) {
        updateNote(activeNoteId, {
          content: note.content + `<p><img src="${attachment.dataUrl}" alt="${file.name}" /></p>`,
        });
        return;
      }

      if (isMarkdown) {
        updateNote(activeNoteId, {
          content: `${note.content}\n[📎 ${file.name}](${attachment.dataUrl})\n`,
        });
      } else {
        updateNote(activeNoteId, {
          content:
            note.content +
            `<p><a href="${attachment.dataUrl}" download="${file.name}" class="note-link">📎 ${file.name}</a></p>`,
        });
      }
    },
    [activeNoteId, addAttachment, updateNote, note, isMarkdown]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const file of files) {
      await handleFileDrop(file);
    }
  };

  if (!note) {
    if (
      !compact &&
      selectedFolderId &&
      selectedFolderId !== ALL_NOTES_ID &&
      !noteIdProp
    ) {
      return (
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <FolderOverview folderId={selectedFolderId} />
        </div>
      );
    }

    return (
      <div className={`flex flex-col items-center justify-center text-center bg-background ${compact ? 'h-full' : 'flex-1'}`}>
        <div className="max-w-sm px-4">
          <h2 className="text-lg font-medium text-foreground/80">Select a note</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Choose a note from the list or press{' '}
            <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Ctrl+N</kbd> to create one.
          </p>
        </div>
      </div>
    );
  }

  const padding = compact ? 'px-4' : 'px-8';

  return (
    <div className={`flex flex-col bg-background h-full overflow-hidden ${compact ? '' : 'flex-1'}`}>
      <div className={`flex items-center justify-between ${padding} pt-4 pb-2 border-b border-border/50`}>
        <div className="flex-1 min-w-0">
          {!compact && folder && <p className="text-xs text-muted-foreground mb-1">{folder.name}</p>}
          <input
            value={note.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className={`w-full font-bold bg-transparent outline-none placeholder:text-muted-foreground/40 ${
              compact ? 'text-lg' : 'text-2xl'
            }`}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {compact && onExpand && (
            <button
              onClick={onExpand}
              className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Expand to full editor"
            >
              <Maximize2 size={16} />
            </button>
          )}
          {compact && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          )}
          {!compact && (
            <>
              <button
                onClick={() => togglePinNote(note.id)}
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  note.pinned ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
                }`}
                title={note.pinned ? 'Unpin' : 'Pin note'}
              >
                <Pin size={16} />
              </button>
              <button
                onClick={() => duplicateNote(note.id)}
                className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Duplicate note"
              >
                <Copy size={16} />
              </button>
              {canArchive && (
                <button
                  onClick={() => archiveNote(note.id)}
                  className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Archive note"
                >
                  <Archive size={16} />
                </button>
              )}
              <button
                onClick={() => toggleNoteEditorMode(note.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                  isMarkdown ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
                title="Toggle markdown mode"
              >
                MD
              </button>
            </>
          )}
          <button
            onClick={() => {
              deleteNote(note.id);
              onClose?.();
            }}
            className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            title="Delete note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isMarkdown && !compact && (
        <div className={`flex items-center gap-2 ${padding} py-2 border-b border-border/30 text-xs text-muted-foreground`}>
          <FileCode2 size={14} />
          Markdown mode
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto ${padding} py-3 flex flex-col min-h-0`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files);
          files.forEach((file) => handleFileDrop(file));
        }}
      >
        {isMarkdown ? (
          <MarkdownEditor
            key={note.id}
            content={note.content}
            onChange={(content) => updateNote(note.id, { content })}
            onWikiClick={(title) => {
              if (!openNoteByTitle(title)) {
                alert(`No note found matching "${title}"`);
              }
            }}
            onFileDrop={handleFileDrop}
          />
        ) : (
          <RichTextEditor
            key={note.id}
            noteId={note.id}
            content={note.content}
            onUpdate={handleRichUpdate}
            onFileDrop={handleFileDrop}
            onFileClick={() => fileInputRef.current?.click()}
            compact={compact}
          />
        )}
        {!compact && note.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {note.attachments.map((a) => (
                <div key={a.id} className="relative group">
                  {isImageAttachment(a) ? (
                    <img
                      src={a.dataUrl}
                      alt={a.name}
                      className="h-20 w-20 object-cover rounded-lg border border-border"
                    />
                  ) : (
                    <button
                      onClick={() => downloadAttachment(a)}
                      className="flex items-center gap-2 h-20 min-w-[120px] max-w-[180px] px-3 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors cursor-pointer text-left"
                      title="Download file"
                    >
                      <File size={18} className="shrink-0 text-muted-foreground" />
                      <span className="text-xs truncate">{a.name}</span>
                      <Download size={12} className="shrink-0 text-muted-foreground opacity-60" />
                    </button>
                  )}
                  <button
                    onClick={() => removeAttachment(note.id, a.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 cursor-pointer flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!compact && <TagInput noteId={note.id} tags={note.tags} />}
      <TaskSchedulePanel note={note} compact={compact} />
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
    </div>
  );
}
