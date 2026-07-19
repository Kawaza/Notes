import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, FileText, FolderOpen, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { stripContent } from '../utils/markdown';

export function GlobalSearch() {
  const searchOpen = useStore((s) => s.searchOpen);
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const notes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const selectNote = useStore((s) => s.selectNote);
  const selectFolder = useStore((s) => s.selectFolder);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().replace(/^#/, '');
    const items: {
      type: 'note' | 'folder';
      id: string;
      title: string;
      subtitle?: string;
    }[] = [];

    notes.forEach((n) => {
      const preview = stripContent(n.content, n.contentType);
      if (
        n.title.toLowerCase().includes(q) ||
        preview.toLowerCase().includes(q) ||
        n.tags.some((t) => t.includes(q))
      ) {
        const folder = folders.find((f) => f.id === n.folderId);
        const tagMatch = n.tags.find((t) => t.includes(q));
        items.push({
          type: 'note',
          id: n.id,
          title: n.title || 'Untitled',
          subtitle: tagMatch ? `#${tagMatch} · ${folder?.name}` : folder?.name,
        });
      }
    });

    folders.forEach((f) => {
      if (f.name.toLowerCase().includes(q)) {
        items.push({ type: 'folder', id: f.id, title: f.name });
      }
    });

    return items.slice(0, 12);
  }, [query, notes, folders]);

  const handleSelect = (item: (typeof results)[0]) => {
    if (item.type === 'note') selectNote(item.id);
    else selectFolder(item.id);
    setSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  if (!searchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search notes, folders, tags..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">ESC</kbd>
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 rounded hover:bg-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {query.trim() === '' ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Search by title, content, folder name, or tag (e.g. meeting)
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No results found</p>
          ) : (
            results.map((item, i) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                  i === selectedIndex ? 'bg-accent' : 'hover:bg-muted/60'
                }`}
              >
                {item.type === 'note' ? (
                  <FileText size={16} className="text-muted-foreground shrink-0" />
                ) : (
                  <FolderOpen size={16} className="text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
