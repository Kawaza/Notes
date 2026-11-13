import { Node, mergeAttributes } from '@tiptap/core';

export interface WorkspaceTaskMentionAttrs {
  taskId: string | null;
  personalTaskId: string | null;
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
      personalTaskId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-personal-task-id'),
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
    return [
      { tag: 'span[data-workspace-task-id]' },
      { tag: 'span[data-personal-task-id]' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const taskId = node.attrs.taskId as string | null;
    const personalTaskId = node.attrs.personalTaskId as string | null;
    const folderId = node.attrs.folderId as string;
    const title = (node.attrs.taskTitle as string)?.trim() || 'Task';
    const attrs: Record<string, string> = {
      'data-workspace-task-title': title,
      class: 'workspace-task-mention',
      contenteditable: 'false',
    };
    if (personalTaskId) {
      attrs['data-personal-task-id'] = personalTaskId;
      if (folderId) attrs['data-personal-task-folder-id'] = folderId;
    } else if (taskId) {
      attrs['data-workspace-task-id'] = taskId;
      if (folderId) attrs['data-workspace-task-folder-id'] = folderId;
    }
    return ['span', mergeAttributes(HTMLAttributes, attrs), title];
  },
});
