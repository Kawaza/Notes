import Image from '@tiptap/extension-image';

/** TipTap image node tagged with the note attachment it came from. */
export const NoteImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      attachmentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-attachment-id'),
        renderHTML: (attributes) =>
          attributes.attachmentId
            ? { 'data-attachment-id': attributes.attachmentId as string }
            : {},
      },
    };
  },
});
