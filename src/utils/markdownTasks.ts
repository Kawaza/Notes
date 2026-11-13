function taskItemText(li: Element): string {
  for (const child of li.children) {
    if (child.tagName === 'DIV') {
      return (child.textContent ?? '').trim().replace(/\s+/g, ' ');
    }
  }
  return (li.textContent ?? '').trim().replace(/\s+/g, ' ');
}

function taskItemChecked(li: Element): boolean {
  if (li.getAttribute('data-checked') === 'true') return true;
  const cb = li.querySelector(':scope > label > input[type="checkbox"]');
  return Boolean(cb?.hasAttribute('checked'));
}

export function taskListElementToMarkdown(ul: HTMLUListElement): string {
  const lines: string[] = [];
  [...ul.children].forEach((child) => {
    if (child.tagName !== 'LI') return;
    const text = taskItemText(child);
    const checked = taskItemChecked(child);
    lines.push(`- [${checked ? 'x' : ' '}] ${text}`);
  });
  return lines.join('\n');
}

/** Ensure TipTap-shaped task lists before export (checkbox in label + div body). */
export function normalizeTaskListsInDocument(doc: Document): void {
  doc.querySelectorAll('ul').forEach((ul) => {
    if (ul.getAttribute('data-type') === 'taskList') return;

    const items = [...ul.children].filter((n) => n.tagName === 'LI');
    if (!items.length) return;

    const isTaskList = items.every(
      (li) =>
        li.getAttribute('data-type') === 'taskItem' ||
        li.querySelector(':scope > label > input[type="checkbox"]'),
    );
    if (!isTaskList) return;

    ul.setAttribute('data-type', 'taskList');
    items.forEach((li) => {
      li.setAttribute('data-type', 'taskItem');
      li.setAttribute('data-checked', taskItemChecked(li) ? 'true' : 'false');
    });
  });
}

/** Marked GFM → TipTap task list HTML (`ul/li[data-type]`). */
export function upgradeTaskListsForTipTap(html: string): string {
  if (!/<ul[\s>]/i.test(html) && !/<input[^>]+checkbox/i.test(html)) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  normalizeTaskListsInDocument(doc);

  doc.querySelectorAll('ul').forEach((ul) => {
    if (ul.getAttribute('data-type') === 'taskList') return;

    const items = [...ul.children].filter((n) => n.tagName === 'LI');
    if (!items.length) return;

    const isTaskList = items.every((li) => li.querySelector(':scope > input[type="checkbox"]'));
    if (!isTaskList) return;

    ul.setAttribute('data-type', 'taskList');
    items.forEach((li) => {
      const cb = li.querySelector(':scope > input[type="checkbox"]') as HTMLInputElement | null;
      const checked = cb?.hasAttribute('checked') || Boolean(cb?.checked);
      li.setAttribute('data-type', 'taskItem');
      li.setAttribute('data-checked', checked ? 'true' : 'false');
    });
  });

  return doc.body.innerHTML;
}

const TASK_MARKER_PREFIX = 'NOTES-TASK-MD-';

export function replaceTaskListsWithMarkers(html: string): { html: string; blocks: string[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  normalizeTaskListsInDocument(doc);

  const blocks: string[] = [];
  doc.querySelectorAll('ul[data-type="taskList"]').forEach((ul, index) => {
    blocks.push(taskListElementToMarkdown(ul as HTMLUListElement));
    const marker = doc.createElement('p');
    marker.textContent = `${TASK_MARKER_PREFIX}${index}`;
    ul.replaceWith(marker);
  });

  return { html: doc.body.innerHTML, blocks };
}

export function restoreTaskListMarkers(markdown: string, blocks: string[]): string {
  if (!blocks.length) return markdown;
  let out = markdown;
  blocks.forEach((block, index) => {
    const marker = `${TASK_MARKER_PREFIX}${index}`;
    const re = new RegExp(`^${marker.replace(/-/g, '\\-')}\\s*$`, 'gm');
    out = out.replace(re, `\n\n${block}\n\n`);
  });
  return out.trim();
}
