import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';

function taskItemText(li) {
  for (const child of li.children) {
    if (child.tagName === 'DIV') {
      return (child.textContent ?? '').trim().replace(/\s+/g, ' ');
    }
  }
  return (li.textContent ?? '').trim().replace(/\s+/g, ' ');
}

function taskItemChecked(li) {
  if (li.getAttribute('data-checked') === 'true') return true;
  const cb = li.querySelector('label input[type="checkbox"]');
  return Boolean(cb?.hasAttribute('checked'));
}

function taskListElementToMarkdown(ul) {
  const lines = [];
  for (const child of ul.children) {
    if (child.tagName !== 'LI') continue;
    lines.push(`- [${taskItemChecked(child) ? 'x' : ' '}] ${taskItemText(child)}`);
  }
  return lines.join('\n');
}

function replaceTaskListsWithMarkers(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const blocks = [];
  doc.querySelectorAll('ul[data-type="taskList"]').forEach((ul, index) => {
    blocks.push(taskListElementToMarkdown(ul));
    const marker = doc.createElement('p');
    marker.textContent = `NOTES-TASK-MD-${index}`;
    ul.replaceWith(marker);
  });
  return { html: doc.body.innerHTML, blocks };
}

const html = `<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>asd</p></div></li></ul>`;
const { html: stripped, blocks } = replaceTaskListsWithMarkers(html);
const td = new TurndownService({ headingStyle: 'atx' });
const md = td.turndown(stripped);
let out = md;
blocks.forEach((block, index) => {
  const marker = `NOTES-TASK-MD-${index}`;
  out = out.replace(new RegExp(`^${marker}\\s*$`, 'gm'), `\n\n${block}\n\n`);
});
console.log('OUT:\n', out);
