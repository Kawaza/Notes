import { Mark, mergeAttributes } from '@tiptap/core';

/** Inline comment highlight stored in note HTML (syncs with workspace note content). */
export const NoteComment = Mark.create({
  name: 'noteComment',

  addAttributes() {
    return {
      comment: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-note-comment'),
        renderHTML: (attrs) => {
          if (!attrs.comment) return {};
          return {
            'data-note-comment': attrs.comment,
            title: attrs.comment,
          };
        },
      },
      authorName: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-author'),
        renderHTML: (attrs) => {
          if (!attrs.authorName) return {};
          return { 'data-comment-author': attrs.authorName };
        },
      },
      authorUserId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-author-user-id'),
        renderHTML: (attrs) => {
          if (!attrs.authorUserId) return {};
          return { 'data-comment-author-user-id': attrs.authorUserId };
        },
      },
      mentionedUserIds: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-mentioned-user-ids'),
        renderHTML: (attrs) => {
          if (!attrs.mentionedUserIds) return {};
          return { 'data-mentioned-user-ids': attrs.mentionedUserIds };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-note-comment]' }, { tag: 'span.note-comment' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'note-comment' }), 0];
  },
});
