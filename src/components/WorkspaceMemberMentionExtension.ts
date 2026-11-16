import { Node, mergeAttributes } from '@tiptap/core';

export interface WorkspaceMemberMentionAttrs {
  userId: string;
  memberLabel: string;
}

export const WorkspaceMemberMention = Node.create({
  name: 'workspaceMemberMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      userId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-workspace-member-id'),
      },
      memberLabel: {
        default: '',
        parseHTML: (el) => {
          const node = el as HTMLElement;
          const fromAttr = node.getAttribute('data-workspace-member-label')?.trim();
          if (fromAttr) return fromAttr;
          const text = node.textContent?.trim() ?? '';
          return text.startsWith('@') ? text.slice(1) : text;
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-workspace-member-id]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const userId = node.attrs.userId as string;
    const label = (node.attrs.memberLabel as string)?.trim() || 'Member';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-workspace-member-id': userId,
        'data-workspace-member-label': label,
        class: 'workspace-member-mention',
        contenteditable: 'false',
      }),
      `@${label}`,
    ];
  },
});