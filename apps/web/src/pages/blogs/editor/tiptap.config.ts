import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableRow as TiptapTableRow } from '@tiptap/extension-table-row';
import { TableHeader as TiptapTableHeader } from '@tiptap/extension-table-header';
import { TableCell as TiptapTableCell } from '@tiptap/extension-table-cell';
import TiptapAudio from '@tiptap/extension-audio';
import Youtube from '@tiptap/extension-youtube';
import Link from '@tiptap/extension-link';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import { ExternalVideo } from './extensions/external-video';
import { CustomImage } from './extensions/custom-image';

export const DEFAULT_YOUTUBE_WIDTH = 640;
export const DEFAULT_YOUTUBE_HEIGHT = 360;
export const MAX_EXCERPT_LENGTH = 200;

// Replace the imageExtensions with custom image
const imageExtensions = CustomImage.configure({
  HTMLAttributes: {
    class: 'max-w-full h-auto',
  },
});

const audioExtensions = TiptapAudio.configure({
  HTMLAttributes: {
    class: 'max-w-full',
  },
});

const youtubeExtensions = Youtube.configure({
  width: DEFAULT_YOUTUBE_WIDTH,
  height: DEFAULT_YOUTUBE_HEIGHT,
  autoplay: false,
});

export const createLinkExtension = (config: { openOnClick?: boolean }) =>
  Link.configure({
    openOnClick: config.openOnClick ?? false,
    HTMLAttributes: {
      class: 'text-primary-600 dark:text-primary-400 underline cursor-pointer',
    },
  });

/** 基础内容扩展 - 预览和编辑都需要的 */
export const baseContentExtensions = [
  StarterKit,
  TiptapTable.configure({
    resizable: true,
  }),
  TiptapTableRow,
  TiptapTableHeader,
  TiptapTableCell,
  imageExtensions,
  audioExtensions,
  youtubeExtensions,
  ExternalVideo,
];

/** 只读预览扩展 */
export const previewExtensions = [
  ...baseContentExtensions,
  createLinkExtension({ openOnClick: true }),
];

/** 可编辑内容扩展 - 带完整格式工具 */
export const editableExtensions = [
  ...baseContentExtensions,
  Underline,
  TextStyle,
  FontSize,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  FontFamily.configure({ types: ['textStyle'] }),
  createLinkExtension({ openOnClick: false }),
];

/** 内联编辑扩展 - 基础可编辑功能（无字号、颜色等） */
export const inlineEditableExtensions = [
  ...baseContentExtensions,
  Underline,
  TextStyle,
  FontSize,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  FontFamily.configure({ types: ['textStyle'] }),
  createLinkExtension({ openOnClick: false }),
];
