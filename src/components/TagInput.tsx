import { useState } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';

export function TagInput({ noteId, tags }: { noteId: string; tags: string[] }) {
  const addTagToNote = useStore((s) => s.addTagToNote);
  const removeTagFromNote = useStore((s) => s.removeTagFromNote);
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      addTagToNote(noteId, input.trim());
      setInput('');
    }
  };

  return (
    <div className="border-t border-border px-8 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Tag size={14} className="text-muted-foreground shrink-0" />
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
          >
            #{tag}
            <button
              onClick={() => removeTagFromNote(noteId, tag)}
              className="opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="Add tag..."
            className="text-xs bg-transparent outline-none w-20 placeholder:text-muted-foreground/50"
          />
          <button
            onClick={handleAdd}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground cursor-pointer"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
