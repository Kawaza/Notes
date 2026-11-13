import { Node, mergeAttributes } from '@tiptap/core';

export interface WorkspaceTaskMentionAttrs {
  taskId: string;
  taskTitle: string;
  folderId: string;
}

export const WorkspaceTaskMention = Node.create({
  name: 'workspaceTaskMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      taskId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-workspace-task-id'),
      },
      taskTitle: {
        default: '',
        parseHTML: (el) => {
          const node = el as HTMLElement;
          return (
            node.getAttribute('data-workspace-task-title')?.trim() ||
            node.textContent?.trim() ||
            ''
          );
        },
      },
      folderId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-workspace-task-folder-id'),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-workspace-task-id]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const taskId = node.attrs.taskId as string;
    const folderId = node.attrs.folderId as string;
    const title = (node.attrs.taskTitle as string)?.trim() || 'Task';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-workspace-task-id': taskId,
        'data-workspace-task-folder-id': folderId,
        'data-workspace-task-title': title,
        class: 'workspace-task-mention',
        contenteditable: 'false',
      }),
      title,
    ];
  },
});
