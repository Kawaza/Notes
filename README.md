# Notes

A free, local note-taking desktop app inspired by Notion and Obsidian.

## Features

### Organization
- **All Notes** — see every note across all folders
- **Folders** — organize notes (default folder: "Other Notes")
- **Tags** — cross-folder labels, filter from sidebar
- **Pinned notes** — quick access in sidebar
- **Drag & drop** — reorder notes, drop onto folders

### Writing
- **Rich text editor** — headings, lists, tasks, code blocks
- **Markdown mode** — toggle with `MD` button; live preview
- **Wiki links** — type `[[Note Title]]` to link between notes
- **Code blocks** — syntax highlighting
- **Image attachments** — drag images into notes

### Productivity
- **Calendar** — schedule tasks, drag to reschedule
- **Templates** — meeting notes, daily journal, project plan, code snippet
- **Global search** — `Ctrl+K` across notes, folders, tags
- **Keyboard shortcuts** — `Ctrl+N` new note, `Ctrl+Shift+D` toggle theme

### Customization
- **Light & dark themes**
- **6 color palettes** — Indigo, Ocean, Forest, Sunset, Rose, Mono

### Data
- **Export** — JSON backup or Markdown ZIP
- **Import** — JSON or `.md` files
- **System tray** — quick capture from taskbar (desktop app)
- All data stored locally on your machine

## Getting Started

```bash
npm install
npm run dev          
npm run electron:dev # Desktop app
npm run electron:build:win  # Build Windows .exe
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Search |
| `Ctrl+N` | New note |
| `Ctrl+Shift+D` | Toggle light/dark |
