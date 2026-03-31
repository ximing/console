import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface ExternalVideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

// URL patterns for different platforms
const URL_PATTERNS = {
  youtube: {
    pattern: /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    embedUrl: 'https://www.youtube.com/embed/{id}',
    extractId: (match: RegExpMatchArray) => match[3],
  },
  bilibili: {
    pattern: /^https?:\/\/(www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
    embedUrl: 'https://player.bilibili.com/player.html?bvid={id}&autoplay=0',
    extractId: (match: RegExpMatchArray) => match[2],
  },
  douyin: {
    pattern: /^https?:\/\/(www\.)?douyin\.com\/video\/([a-zA-Z0-9]+)/,
    embedUrl: 'https://www.douyin.com/embed/{id}',
    extractId: (match: RegExpMatchArray) => match[2],
  },
} as const;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    externalVideo: {
      setExternalVideo: (options: { src: string }) => ReturnType;
    };
  }
}

export const ExternalVideo = Node.create<ExternalVideoOptions>({
  name: 'externalVideo',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      type: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src*="youtube"], iframe[src*="bilibili"], iframe[src*="douyin"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'w-full aspect-video',
        frameborder: '0',
        allowfullscreen: 'true',
        style: 'max-width: 100%;',
      }),
    ];
  },

  addCommands() {
    return {
      setExternalVideo:
        (options: { src: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('externalVideo');

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handlePaste: (view, event) => {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            const text = clipboardData.getData('text/plain');
            if (!text) return false;

            // Check each platform pattern
            for (const [platform, config] of Object.entries(URL_PATTERNS)) {
              const match = text.match(config.pattern);
              if (match) {
                const videoId = config.extractId(match);
                const embedUrl = config.embedUrl.replace('{id}', videoId);

                // Insert the iframe
                const { tr, selection } = view.state;
                const node = this.type.create({
                  src: embedUrl,
                  type: platform,
                });

                tr.replaceSelectionWith(node);
                view.dispatch(tr);

                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
