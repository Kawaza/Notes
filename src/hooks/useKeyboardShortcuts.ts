import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getNewNoteFolderId } from '../types';

export function useKeyboardShortcuts() {
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const createNote = useStore((s) => s.createNote);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const selectedFolderId = useStore((s) => s.selectedFolderId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (mod && e.key === 'n') {
        e.preventDefault();
        createNote(getNewNoteFolderId(selectedFolderId));
      } else if (mod && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen, createNote, toggleTheme, selectedFolderId]);
}
