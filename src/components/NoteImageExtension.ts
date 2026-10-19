import Image, { type ImageOptions } from '@tiptap/extension-image';

export type NoteImageOptions = ImageOptions & {
  touchPreview: boolean;
};

/** TipTap image node tagged with the note attachment it came from. */
export const NoteImage = Image.extend<NoteImageOptions>({
  addOptions() {
    const parent = this.parent?.();
    return {
      inline: parent?.inline ?? false,
      allowBase64: parent?.allowBase64 ?? false,
      HTMLAttributes: parent?.HTMLAttributes ?? {},
      resize: parent?.resize ?? false,
      touchPreview: false,
    };
  },

  draggable() {
    return !this.options.touchPreview;
  },

  selectable() {
    return !this.options.touchPreview;
  },

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
