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
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-note-comment]' }, { tag: 'span.note-comment' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'note-comment' }), 0];
  },
});
