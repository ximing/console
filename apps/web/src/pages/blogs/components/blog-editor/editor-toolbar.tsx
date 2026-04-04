import { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Sketch } from '@uiw/react-color';
import { useService } from '@rabjs/react';
import { ToastService } from '../../../../services/toast.service';
import { uploadImagePlaceholder } from '../../../../utils/editor';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  FileCode,
  Table,
  Image,
  Mic,
  Youtube,
  Link,
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  TableCellsMerge,
  TableCellsSplit,
  Undo2,
  Redo2,
  PaintRoller,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  RemoveFormatting,
  ChevronDown,
} from 'lucide-react';

import { MediaUploadModal } from './media-upload-modal';
import { uploadMedia, validateMediaFile } from '../../../../api/blog-media';

type InsertType = 'image' | 'audio' | 'youtube' | 'link';

interface EditorToolbarProps {
  editor: Editor | null;
  blogId: string;
  isCollaborating?: boolean;
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
      flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-sm
      ${
        isActive
          ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
          : 'text-gray-600 dark:text-zinc-400 hover:bg-green-50/50 dark:hover:bg-green-900/20'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      disabled:opacity-50 disabled:cursor-not-allowed
    `}
  >
    {children}
  </button>
);

const ToolbarDivider = () => <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1" />;

const MediaInsertSelect = ({
  onSelect,
}: {
  onSelect: (type: 'image' | 'audio' | 'video' | 'youtube') => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'image', label: '图片', icon: <Image className="w-4 h-4" /> },
    { value: 'audio', label: '音频', icon: <Mic className="w-4 h-4" /> },
    { value: 'video', label: '视频', icon: <Youtube className="w-4 h-4" /> },
    { value: 'youtube', label: '嵌入 YouTube', icon: <Youtube className="w-4 h-4" /> },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-dark-700"
      >
        <span>插入</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-dark-700"
              onClick={() => {
                onSelect(opt.value as 'image' | 'audio' | 'video' | 'youtube');
                setIsOpen(false);
              }}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AlignSelect = ({
  editor,
}: {
  editor: Editor;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignOptions = [
    { value: 'left', label: '左对齐', icon: <AlignLeft className="w-4 h-4" /> },
    { value: 'center', label: '居中', icon: <AlignCenter className="w-4 h-4" /> },
    { value: 'right', label: '右对齐', icon: <AlignRight className="w-4 h-4" /> },
    { value: 'justify', label: '两端对齐', icon: <AlignJustify className="w-4 h-4" /> },
  ];

  const currentAlign = alignOptions.find((opt) =>
    editor.isActive({ textAlign: opt.value })
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-sm ${
          currentAlign
            ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            : 'text-gray-600 dark:text-zinc-400 hover:bg-green-50/50 dark:hover:bg-green-900/20'
        }`}
      >
        {currentAlign?.icon ?? <AlignLeft className="w-4 h-4" />}
        <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[120px] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden">
          {alignOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-700 ${
                editor.isActive({ textAlign: opt.value })
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-700 dark:text-zinc-300'
              }`}
              onClick={() => {
                editor.chain().focus().setTextAlign(opt.value as 'left' | 'center' | 'right' | 'justify').run();
                setIsOpen(false);
              }}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ColorPicker = ({
  color,
  onChange,
  title,
}: {
  color: string | null;
  onChange: (color: string | null) => void;
  title: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          justOpenedRef.current = true;
          setIsOpen(!isOpen);
        }}
        title={title}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-dark-700"
      >
        {title === '字体颜色' ? (
          <Palette className="w-4 h-4" style={color ? { color } : {}} />
        ) : (
          <Highlighter className="w-4 h-4" style={color ? { backgroundColor: color } : {}} />
        )}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-50">
          <Sketch
            color={color || '#000000'}
            onChange={(colorResult) => {
              onChange(colorResult.hex);
            }}
            disableAlpha={title === '字体背景'}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-gray-200"
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TableColorPicker = ({
  color,
  onChange,
}: {
  color: string | null;
  onChange: (color: string | null) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          justOpenedRef.current = true;
          setIsOpen(!isOpen);
        }}
        title="单元格背景色"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-dark-700"
      >
        <Palette className="w-4 h-4" style={color ? { color } : {}} />
        <span>颜色</span>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-50">
          <Sketch
            color={color || '#000000'}
            onChange={(colorResult) => {
              onChange(colorResult.hex);
            }}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-gray-200"
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FontSizeSelect = ({ editor }: { editor: Editor }) => {
  const fontSizes = [
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '28px', value: '28px' },
    { label: '32px', value: '32px' },
    { label: '36px', value: '36px' },
    { label: '48px', value: '48px' },
  ];

  const getCurrentSize = () => {
    if (editor.isActive('heading', { level: 1 })) return '36px';
    if (editor.isActive('heading', { level: 2 })) return '28px';
    if (editor.isActive('heading', { level: 3 })) return '24px';
    const size = editor.getAttributes('textStyle').fontSize;
    return size || '16px';
  };

  return (
    <select
      value={getCurrentSize()}
      onChange={(e) => {
        const size = e.target.value;
        if (editor.isActive('heading')) {
          editor
            .chain()
            .focus()
            .toggleHeading({ level: editor.getAttributes('heading').level || 1 })
            .run();
        }
        editor.chain().focus().setFontSize(size).run();
      }}
      className="px-2 py-1.5 text-sm bg-transparent dark:bg-transparent hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg focus:outline-none text-gray-700 dark:text-zinc-300 cursor-pointer"
    >
      {fontSizes.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
};

const HeadingSelect = ({ editor }: { editor: Editor }) => {
  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    return 'paragraph';
  };

  return (
    <select
      value={getCurrentHeading()}
      onChange={(e) => {
        const value = e.target.value;
        if (value === 'paragraph') {
          editor.chain().focus().setParagraph().run();
        } else {
          const level = parseInt(value.replace('h', '')) as 1 | 2 | 3;
          editor.chain().focus().toggleHeading({ level }).run();
        }
      }}
      className="px-2 py-1.5 text-sm bg-transparent dark:bg-transparent hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg focus:outline-none text-gray-700 dark:text-zinc-300 cursor-pointer min-w-[100px]"
    >
      <option value="paragraph">正文</option>
      <option value="h1">标题 1</option>
      <option value="h2">标题 2</option>
      <option value="h3">标题 3</option>
    </select>
  );
};

export const EditorToolbar = ({ editor, blogId, isCollaborating = false }: EditorToolbarProps) => {
  const toastService = useService(ToastService);
  const [pendingInsert, setPendingInsert] = useState<{ type: InsertType; url: string } | null>(
    null
  );
  const [isTableActive, setIsTableActive] = useState(false);
  const [textColor, setTextColor] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string | null>(null);

  const [uploadModal, setUploadModal] = useState<{
    filename: string;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  } | null>(null);

  // Track table active state
  useEffect(() => {
    if (!editor) return;

    const updateTableState = () => {
      setIsTableActive(editor.isActive('table'));
    };

    updateTableState();

    editor.on('selectionUpdate', updateTableState);
    editor.on('transaction', updateTableState);

    return () => {
      editor.off('selectionUpdate', updateTableState);
      editor.off('transaction', updateTableState);
    };
  }, [editor]);

  // Track text color state
  useEffect(() => {
    if (!editor) return;

    const updateColorState = () => {
      const color = editor.getAttributes('textStyle').color;
      setTextColor(color || null);
      const highlight = editor.getAttributes('highlight').color;
      setBgColor(highlight || null);
    };

    updateColorState();

    editor.on('selectionUpdate', updateColorState);
    editor.on('transaction', updateColorState);

    return () => {
      editor.off('selectionUpdate', updateColorState);
      editor.off('transaction', updateColorState);
    };
  }, [editor]);

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
        editor.chain().focus().setCustomImage({ path: url }).run();
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

  const handleFileUpload = async (type: 'image' | 'audio' | 'video', blogId: string) => {
    const input = document.createElement('input');
    input.type = 'file';

    switch (type) {
      case 'image':
        input.accept = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';
        break;
      case 'audio':
        input.accept = 'audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/flac';
        break;
      case 'video':
        input.accept = 'video/mp4,video/webm,video/quicktime';
        break;
    }

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        toastService.error(validation.error || '文件验证失败');
        return;
      }

      if (type === 'image' && editor) {
        uploadImagePlaceholder(editor, file, blogId, (msg) => toastService.error(msg));
        return;
      }

      // For audio/video, show modal (existing behavior)
      setUploadModal({
        filename: file.name,
        progress: 0,
        status: 'uploading',
      });

      try {
        const result = await uploadMedia(file, blogId, (progress) => {
          setUploadModal((prev) =>
            prev ? { ...prev, progress: progress.percent } : null
          );
        });

        // Insert into editor
        if (editor) {
          switch (type) {
            case 'audio':
              editor.chain().focus().setAudio({ src: result.path }).run();
              break;
            case 'video':
              editor.chain().focus().insertContent(`<video src="${result.path}" controls style="max-width: 100%; height: auto;" />`).run();
              break;
          }
        }

        setUploadModal((prev) =>
          prev ? { ...prev, status: 'success' } : null
        );

        // Auto close after 1 second
        setTimeout(() => {
          setUploadModal(null);
        }, 1000);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '上传失败';
        setUploadModal((prev) =>
          prev
            ? { ...prev, status: 'error', error: message }
            : null
        );
      }
    };

    input.click();
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const toggleHeaderRow = () => {
    editor.chain().focus().toggleHeaderRow().run();
  };

  const addColumnBefore = () => {
    editor.chain().focus().addColumnBefore().run();
  };

  const addColumnAfter = () => {
    editor.chain().focus().addColumnAfter().run();
  };

  const deleteColumn = () => {
    editor.chain().focus().deleteColumn().run();
  };

  const addRowBefore = () => {
    editor.chain().focus().addRowBefore().run();
  };

  const addRowAfter = () => {
    editor.chain().focus().addRowAfter().run();
  };

  const deleteRow = () => {
    editor.chain().focus().deleteRow().run();
  };

  const deleteTable = () => {
    editor.chain().focus().deleteTable().run();
  };

  const mergeCells = () => {
    editor.chain().focus().mergeCells().run();
  };

  const splitCell = () => {
    editor.chain().focus().splitCell().run();
  };

  const setCellBackground = (color: string | null) => {
    editor.chain().focus().setCellAttribute('backgroundColor', color || '').run();
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
    <div className="flex flex-col relative">
      {/* Main Toolbar - Centered */}
      <div className="flex flex-wrap items-center justify-center gap-1 p-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
        {/* Section 1: History & Format */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={isCollaborating}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={isCollaborating}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="格式刷"
        >
          <PaintRoller className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="清除格式"
        >
          <RemoveFormatting className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Section 2: Paragraph & Text Style */}
        <HeadingSelect editor={editor} />
        <FontSizeSelect editor={editor} />

        <ToolbarDivider />

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
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="删除线"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="下划线 (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ColorPicker
          color={textColor}
          onChange={(color) =>
            editor
              .chain()
              .focus()
              .setColor(color || '')
              .run()
          }
          title="字体颜色"
        />
        <ColorPicker
          color={bgColor}
          onChange={(color) =>
            editor
              .chain()
              .focus()
              .setHighlight(color ? { color } : { color: '' })
              .run()
          }
          title="字体背景"
        />

        <ToolbarDivider />

        <AlignSelect editor={editor} />

        <ToolbarDivider />

        {/* Section 3: Lists */}
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

        {/* Section 4: Block Elements */}
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
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="代码块"
        >
          <FileCode className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Section 5: Table */}
        <ToolbarButton onClick={addTable} isActive={isTableActive} title="插入表格">
          <Table className="w-4 h-4" />
        </ToolbarButton>

        {/* Section 6: Media Insert */}
        <MediaInsertSelect
          onSelect={(type) => {
            switch (type) {
              case 'image':
                handleFileUpload('image', blogId);
                break;
              case 'audio':
                handleFileUpload('audio', blogId);
                break;
              case 'video':
                handleFileUpload('video', blogId);
                break;
              case 'youtube':
                handleInsertClick('youtube');
                break;
            }
          }}
        />

        <ToolbarDivider />

        {/* Link button */}
        <ToolbarButton
          onClick={() => handleInsertClick('link')}
          isActive={editor.isActive('link')}
          title="插入链接"
        >
          <Link className="w-4 h-4" />
        </ToolbarButton>

        {/* URL Input for Image/Audio/YouTube/Link insertion */}
        {pendingInsert && (
          <div className="flex items-center gap-2 ml-2 pl-2">
            <span className="text-xs text-gray-500 dark:text-zinc-400 whitespace-nowrap">
              {getInsertLabel(pendingInsert.type)}:
            </span>
            <input
              type="text"
              value={pendingInsert.url}
              onChange={(e) => setPendingInsert({ ...pendingInsert, url: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(pendingInsert.type)}
              className="flex-1 min-w-[200px] px-2 py-1 text-sm bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded focus:outline-none focus:border-green-400 dark:focus:border-green-500 text-gray-900 dark:text-zinc-50 placeholder:text-gray-400"
              autoFocus
            />
            <ToolbarButton onClick={handleInsertConfirm} title="确认">
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                确认
              </span>
            </ToolbarButton>
            <ToolbarButton onClick={handleInsertCancel} title="取消">
              <X className="w-4 h-4" />
            </ToolbarButton>
          </div>
        )}
      </div>

      {/* Table Operations - Show when cursor is in table, Centered */}
      <div
        className={`absolute left-0 right-0 z-10 overflow-hidden transition-all duration-200 ease-in-out ${isTableActive ? 'top-full opacity-100' : 'top-0 -z-10 opacity-0 pointer-events-none'}`}
      >
        <div
          className={`flex flex-wrap items-center justify-center gap-1 p-1 bg-gray-50/80 dark:bg-zinc-800/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${isTableActive ? 'h-auto' : 'h-0 p-0 border-0 overflow-hidden'}`}
        >
          <span className="text-xs text-gray-500 dark:text-zinc-400 mr-2">表格:</span>

          <ToolbarButton
            onClick={toggleHeaderRow}
            isActive={editor.isActive('tableHeader')}
            title="设置/取消表头"
          >
            <Check className="w-4 h-4" />
            <span>表头</span>
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-zinc-600 mx-1" />

          <ToolbarButton onClick={addRowBefore} title="上方插入行">
            <Plus className="w-4 h-4" />
            <span>上行</span>
          </ToolbarButton>
          <ToolbarButton onClick={addRowAfter} title="下方插入行">
            <Plus className="w-4 h-4" />
            <span>下行</span>
          </ToolbarButton>
          <ToolbarButton onClick={deleteRow} title="删除当前行">
            <Minus className="w-4 h-4" />
            <span>删行</span>
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-zinc-600 mx-1" />

          <ToolbarButton onClick={addColumnBefore} title="左侧插入列">
            <Plus className="w-4 h-4" />
            <span>左列</span>
          </ToolbarButton>
          <ToolbarButton onClick={addColumnAfter} title="右侧插入列">
            <Plus className="w-4 h-4" />
            <span>右列</span>
          </ToolbarButton>
          <ToolbarButton onClick={deleteColumn} title="删除当前列">
            <Minus className="w-4 h-4" />
            <span>删列</span>
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-zinc-600 mx-1" />

          <ToolbarButton
            onClick={mergeCells}
            title="合并单元格"
          >
            <TableCellsMerge className="w-4 h-4" />
            <span>合并</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={splitCell}
            title="拆分单元格"
          >
            <TableCellsSplit className="w-4 h-4" />
            <span>拆分</span>
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-zinc-600 mx-1" />

          <TableColorPicker
            color={editor.getAttributes('tableCell').backgroundColor || null}
            onChange={setCellBackground}
          />

          <div className="w-px h-6 bg-gray-300 dark:bg-zinc-600 mx-1" />

          <ToolbarButton onClick={deleteTable} title="删除表格">
            <Trash2 className="w-4 h-4 text-red-500" />
            <span className="text-red-500">删除</span>
          </ToolbarButton>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <MediaUploadModal
          filename={uploadModal.filename}
          progress={uploadModal.progress}
          status={uploadModal.status}
          error={uploadModal.error}
          onClose={() => setUploadModal(null)}
        />
      )}
    </div>
  );
};
