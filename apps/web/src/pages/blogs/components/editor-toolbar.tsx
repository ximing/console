import { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
  Image,
  Mic,
  Youtube,
  Link,
  X,
} from 'lucide-react';

type InsertType = 'image' | 'audio' | 'youtube' | 'link';

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      p-2 rounded-lg transition-colors
      ${isActive
        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      disabled:opacity-50 disabled:cursor-not-allowed
    `}
  >
    {children}
  </button>
);

const ToolbarDivider = () => (
  <div className="w-px h-6 bg-gray-200 dark:bg-dark-700 mx-1" />
);

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  const [pendingInsert, setPendingInsert] = useState<{ type: InsertType; url: string } | null>(null);

  if (!editor) {
    return null;
  }

  const handleInsertClick = (type: InsertType) => {
    setPendingInsert({ type, url: '' });
  };

  const handleInsertConfirm = () => {
    if (!pendingInsert || !pendingInsert.url) return;

    const { type, url } = pendingInsert;

    switch (type) {
      case 'image':
        editor.chain().focus().setImage({ src: url }).run();
        break;
      case 'audio':
        editor.chain().focus().setAudio({ src: url }).run();
        break;
      case 'youtube':
        editor.commands.setYoutubeVideo({ src: url });
        break;
      case 'link':
        editor.chain().focus().setLink({ href: url }).run();
        break;
    }

    setPendingInsert(null);
  };

  const handleInsertCancel = () => {
    setPendingInsert(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInsertConfirm();
    } else if (e.key === 'Escape') {
      handleInsertCancel();
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const getPlaceholder = (type: InsertType): string => {
    switch (type) {
      case 'image':
        return '输入图片 URL';
      case 'audio':
        return '输入音频 URL';
      case 'youtube':
        return '输入 YouTube 视频 URL';
      case 'link':
        return '输入链接 URL';
    }
  };

  const getInsertLabel = (type: InsertType): string => {
    switch (type) {
      case 'image':
        return '插入图片';
      case 'audio':
        return '插入音频';
      case 'youtube':
        return '插入视频';
      case 'link':
        return '插入链接';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="粗体 (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="斜体 (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="下划线 (Ctrl+U)"
      >
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="删除线"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="标题 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="标题 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="标题 3"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="无序列表"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="有序列表"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block Elements */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="引用"
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="行内代码"
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Media & Links */}
      <ToolbarButton
        onClick={addTable}
        isActive={editor.isActive('table')}
        title="插入表格"
      >
        <Table className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => handleInsertClick('image')}
        title="插入图片"
      >
        <Image className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => handleInsertClick('audio')}
        title="插入音频"
      >
        <Mic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => handleInsertClick('youtube')}
        title="插入 YouTube 视频"
      >
        <Youtube className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => handleInsertClick('link')}
        isActive={editor.isActive('link')}
        title="插入链接"
      >
        <Link className="w-4 h-4" />
      </ToolbarButton>

      {/* URL Input for Image/Audio/YouTube/Link insertion */}
      {pendingInsert && (
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-dark-700">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {getInsertLabel(pendingInsert.type)}:
          </span>
          <input
            type="text"
            value={pendingInsert.url}
            onChange={(e) => setPendingInsert({ ...pendingInsert, url: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder(pendingInsert.type)}
            className="flex-1 min-w-[200px] px-2 py-1 text-sm bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-900 dark:text-white placeholder:text-gray-400"
            autoFocus
          />
          <ToolbarButton onClick={handleInsertConfirm} title="确认">
            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">确认</span>
          </ToolbarButton>
          <ToolbarButton onClick={handleInsertCancel} title="取消">
            <X className="w-4 h-4" />
          </ToolbarButton>
        </div>
      )}
    </div>
  );
};
