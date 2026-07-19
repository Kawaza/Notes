import { useState } from 'react';
import { Palette } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CalendarColorPicker } from './CalendarColorPicker';
import { getCalendarColor } from '../constants/calendarColors';

interface FolderColorBarProps {
  folderId: string;
}

export function FolderColorBar({ folderId }: FolderColorBarProps) {
  const folders = useStore((s) => s.folders);
  const updateFolder = useStore((s) => s.updateFolder);
  const [editing, setEditing] = useState(false);

  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return null;

  const color = getCalendarColor(folder.calendarColor);

  return (
    <div className="border-t border-border px-8 py-2.5 bg-muted/30 shrink-0">
      {editing ? (
        <div className="flex items-center gap-3">
          <Palette size={14} className="text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">Folder Color</span>
          <CalendarColorPicker
            compact
            value={folder.calendarColor}
            onChange={(calendarColor) => {
              updateFolder(folderId, { calendarColor });
              setEditing(false);
            }}
          />
          <button
            onClick={() => setEditing(false)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Done
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 w-full text-left cursor-pointer group"
          title="Click to change folder color"
        >
          <Palette size={14} className="text-muted-foreground shrink-0" />
          <span
            className="w-3 h-3 rounded-full shrink-0 border-2"
            style={{ backgroundColor: color.border, borderColor: color.text }}
          />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Folder Color · {color.name}
          </span>
        </button>
      )}
    </div>
  );
}
