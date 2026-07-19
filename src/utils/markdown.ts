import { marked } from 'marked';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

turndown.addRule('taskList', {
  filter: (node) =>
    node.nodeName === 'LI' &&
    node.parentNode?.nodeName === 'UL' &&
    (node as HTMLElement).getAttribute('data-type') === 'taskItem',
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const checked = el.querySelector('input[type="checkbox"]')?.hasAttribute('checked');
    const text = el.textContent?.trim() || '';
    return `- [${checked ? 'x' : ' '}] ${text}\n`;
  },
});

export function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  try {
    return turndown.turndown(html);
  } catch {
    return html;
  }
}

export function markdownToHtml(md: string): string {
  if (!md) return '';
  return marked.parse(md, { async: false, gfm: true, breaks: true }) as string;
}

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

export function renderMarkdownWithWikiLinks(
  md: string,
  onWikiClick: (title: string) => void
): string {
  const html = markdownToHtml(md);
  const div = document.createElement('div');
  div.innerHTML = html;

  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent && WIKI_LINK_REGEX.test(node.textContent)) {
      textNodes.push(node);
    }
    WIKI_LINK_REGEX.lastIndex = 0;
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent || '';
    WIKI_LINK_REGEX.lastIndex = 0;
    if (!WIKI_LINK_REGEX.test(text)) return;
    WIKI_LINK_REGEX.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    WIKI_LINK_REGEX.lastIndex = 0;
    while ((match = WIKI_LINK_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'wiki-link';
      link.textContent = match[1];
      link.dataset.wikiTitle = match[1];
      link.addEventListener('click', (e) => {
        e.preventDefault();
        onWikiClick(match![1]);
      });
      fragment.appendChild(link);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return div.innerHTML;
}

export function stripContent(content: string, contentType: 'html' | 'markdown'): string {
  if (contentType === 'markdown') {
    return content
      .replace(WIKI_LINK_REGEX, '$1')
      .replace(/[#*`[\]()>-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const div = document.createElement('div');
  div.innerHTML = content;
  return div.textContent || div.innerText || '';
}

export function findNoteByTitle(
  notes: { id: string; title: string }[],
  title: string
): string | null {
  const normalized = title.trim().toLowerCase();
  const exact = notes.find((n) => n.title.trim().toLowerCase() === normalized);
  if (exact) return exact.id;
  const partial = notes.find((n) =>
    n.title.trim().toLowerCase().includes(normalized)
  );
  return partial?.id ?? null;
}
