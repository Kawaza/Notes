import JSZip from 'jszip';
import type { AppData, Note } from '../types';
import { stripContent } from './markdown';

function sanitizeFilename(title: string): string {
  return (title || 'Untitled').replace(/[<>:"/\\|?*]/g, '-').slice(0, 80);
}

function noteToMarkdown(note: Note, folderName: string): string {
  const frontmatter = [
    '---',
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `folder: "${folderName}"`,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    note.tags.length ? `tags: [${note.tags.map((t) => `"${t}"`).join(', ')}]` : null,
    note.pinned ? 'pinned: true' : null,
    note.scheduledAt ? `scheduled: ${note.scheduledAt}` : null,
    '---',
    '',
  ]
    .filter(Boolean)
    .join('\n');

  const body = note.contentType === 'markdown' ? note.content : stripContent(note.content, 'html');
  return frontmatter + body;
}

export async function exportAsJson(data: AppData): Promise<Blob> {
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export async function exportAsMarkdownZip(data: AppData): Promise<Blob> {
  const zip = new JSZip();
  const folderMap = Object.fromEntries(data.folders.map((f) => [f.id, f.name]));

  data.notes.forEach((note) => {
    const folderName = folderMap[note.folderId] || 'Other Notes';
    const filename = `${sanitizeFilename(note.title)}.md`;
    zip.file(`${folderName}/${filename}`, noteToMarkdown(note, folderName));
  });

  return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedJson(text: string): AppData | null {
  try {
    const data = JSON.parse(text) as AppData;
    if (!data.folders || !data.notes) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseMarkdownFile(text: string, filename: string): Partial<Note> {
  let title = filename.replace(/\.md$/i, '');
  let content = text;
  let tags: string[] = [];

  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    content = fmMatch[2];
    const fm = fmMatch[1];
    const titleMatch = fm.match(/title:\s*"?([^"\n]+)"?/);
    if (titleMatch) title = titleMatch[1];
    const tagsMatch = fm.match(/tags:\s*\[(.*?)\]/);
    if (tagsMatch) {
      tags = tagsMatch[1].split(',').map((t) => t.trim().replace(/"/g, ''));
    }
  }

  return { title, content, contentType: 'markdown', tags };
}

export async function importMarkdownFiles(files: FileList): Promise<Partial<Note>[]> {
  const results: Partial<Note>[] = [];
  for (const file of Array.from(files)) {
    if (!file.name.endsWith('.md')) continue;
    const text = await file.text();
    results.push(parseMarkdownFile(text, file.name));
  }
  return results;
}
