import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CustomImageNodeView } from './custom-image-nodeview';

export interface CustomImageOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: (options: { path: string; alt?: string; title?: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

export const CustomImage = Node.create<CustomImageOptions>({
  name: 'customImage',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      path: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-path]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Render with data attributes but no src (NodeView will handle rendering)
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-path': HTMLAttributes.path,
        'data-width': HTMLAttributes.width,
        'data-height': HTMLAttributes.height,
        alt: HTMLAttributes.alt,
        title: HTMLAttributes.title,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CustomImageNodeView);
  },

  addCommands() {
    return {
      setCustomImage:
        (options: { path: string; alt?: string; title?: string; width?: number; height?: number }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
