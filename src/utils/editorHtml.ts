/** Loose equality for TipTap HTML (task checkbox toggles often differ only by attribute order). */
export function editorHtmlEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  return normalizeEditorHtml(a) === normalizeEditorHtml(b);
}

export function normalizeEditorHtml(html: string): string {
  return html
    .replace(/\sdata-checked="(true|false)"/gi, '')
    .replace(/\scontenteditable="(true|false)"/gi, '')
    .replace(/\sclass="([^"]*)"/gi, (_, cls: string) => {
      const trimmed = cls.trim().replace(/\s+/g, ' ');
      return trimmed ? ` class="${trimmed}"` : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}
