import { useEffect, useState, useCallback, useMemo } from 'react';
import { view, useService } from '@rabjs/react';
import { useParams, useNavigate } from 'react-router';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TiptapImage from '@tiptap/extension-image';
import TiptapTable from '@tiptap/extension-table';
import TiptapTableRow from '@tiptap/extension-table-row';
import TiptapTableHeader from '@tiptap/extension-table-header';
import TiptapTableCell from '@tiptap/extension-table-cell';
import TiptapAudio from '@tiptap/extension-audio';
import Youtube from '@tiptap/extension-youtube';
import Link from '@tiptap/extension-link';
import { Loader2, Save, Send, ArrowLeft } from 'lucide-react';
import slugify from 'slugify';
import { BlogService } from '../../../services/blog.service';
import { DirectoryService } from '../../../services/directory.service';
import { TagService } from '../../../services/tag.service';
import { ToastService } from '../../../services/toast.service';
import { EditorToolbar } from '../components/editor-toolbar';
import { Select } from '../../../components/select';

interface BlogEditorProps {
  id?: string;
}

/**
 * Blog Editor Component
 * Handles both creating new blogs and editing existing ones
 */
export const BlogEditor = view(({ id }: BlogEditorProps) => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const tagService = useService(TagService);
  const toastService = useService(ToastService);
  const navigate = useNavigate();
  const params = useParams();

  // Use URL id if not provided via props
  const blogId = id || params.id;

  // Local state
  const [title, setTitle] = useState('');
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);

  // Check if we're editing an existing blog
  const isEditing = !!blogId;

  // Initialize editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TiptapImage.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      TiptapTable.configure({
        resizable: true,
      }),
      TiptapTableRow,
      TiptapTableHeader,
      TiptapTableCell,
      TiptapAudio.configure({
        HTMLAttributes: {
          class: 'max-w-full',
        },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        autoplay: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 dark:text-primary-400 underline cursor-pointer',
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      // Trigger auto-save when content changes
      if (isEditing && blogService.currentBlog) {
        const content = editor.getJSON();
        blogService.updateBlog(blogId!, {
          content,
          excerpt: editor.getText().slice(0, 200),
        });
      }
    },
  });

  // Load directories and tags
  useEffect(() => {
    directoryService.loadDirectories();
    tagService.loadTags();
  }, []);

  // Load existing blog if editing
  useEffect(() => {
    if (isEditing && blogId) {
      blogService.loadBlog(blogId).then(() => {
        const blog = blogService.currentBlog;
        if (blog) {
          setTitle(blog.title);
          setSelectedDirectoryId(blog.directoryId || '');
          setSelectedTagIds(blog.tags.map((t) => t.id));
          if (editor && blog.content) {
            editor.commands.setContent(blog.content);
          }
          setContentLoaded(true);
        }
      });
    }
  }, [isEditing, blogId, editor]);

  // Handle title change with auto-save
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      if (isEditing && blogId) {
        blogService.updateBlog(blogId, {
          title: newTitle,
          slug: slugify(newTitle, { lower: true, locale: 'zh' }),
        });
      }
    },
    [isEditing, blogId]
  );

  // Handle directory change
  const handleDirectoryChange = useCallback(
    (directoryId: string) => {
      setSelectedDirectoryId(directoryId);
      if (isEditing && blogId) {
        blogService.updateBlog(blogId, {
          directoryId: directoryId || null,
        });
      }
    },
    [isEditing, blogId]
  );

  // Handle tags change
  const handleTagsChange = useCallback(
    (tagIds: string[]) => {
      setSelectedTagIds(tagIds);
      if (isEditing && blogId) {
        blogService.updateBlog(blogId, {
          tagIds,
        });
      }
    },
    [isEditing, blogId]
  );

  // Handle save (Ctrl/Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing && blogId && blogService.currentBlog) {
          const content = editor?.getJSON();
          blogService.saveBlog(blogId, {
            content,
            excerpt: editor?.getText().slice(0, 200),
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, blogId, editor]);

  // Create new blog if not editing
  useEffect(() => {
    if (!isEditing && !blogService.currentBlog && !blogService.loading) {
      // Create a new draft blog
      const createNewBlog = async () => {
        const blog = await blogService.createBlog({
          title: '未命名博客',
          excerpt: '',
        });
        if (blog) {
          navigate(`/blogs/${blog.id}/editor`, { replace: true });
        }
      };
      createNewBlog();
    }
  }, [isEditing, blogService.currentBlog, blogService.loading, navigate]);

  // Save status text
  const saveStatusText = useMemo(() => {
    if (blogService.saving) {
      return '保存中...';
    }
    if (blogService.lastSavedAt) {
      return '\u2713 已保存';
    }
    return '';
  }, [blogService.saving, blogService.lastSavedAt]);

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    const newTags = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    handleTagsChange(newTags);
  };

  // Publish blog
  const handlePublish = async () => {
    if (!blogId) return;
    setIsPublishing(true);
    try {
      const content = editor?.getJSON();
      await blogService.saveBlog(blogId, {
        content,
        excerpt: editor?.getText().slice(0, 200),
        status: 'published',
      });
      const blog = await blogService.publishBlog(blogId);
      if (blog) {
        toastService.success('博客发布成功');
        navigate('/blogs');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!blogId) return;
    const content = editor?.getJSON();
    await blogService.saveBlog(blogId, {
      content,
      excerpt: editor?.getText().slice(0, 200),
      status: 'draft',
    });
    toastService.success('草稿保存成功');
  };

  // Build directory options
  const directoryOptions = useMemo(() => {
    const buildOptions = (nodes: ReturnType<DirectoryService['buildTree']>, level = 0): { value: string; label: string }[] => {
      const options: { value: string; label: string }[] = [];
      nodes.forEach((node) => {
        const prefix = level > 0 ? '\u00A0\u00A0'.repeat(level) + '\u251C\u2500 ' : '';
        options.push({ value: node.id, label: prefix + node.name });
        if (node.children.length > 0) {
          options.push(...buildOptions(node.children, level + 1));
        }
      });
      return options;
    };
    return buildOptions(directoryService.buildTree());
  }, [directoryService.directories]);

  // Loading state
  if (isEditing && blogService.loading && !contentLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/blogs')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            title="返回列表"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {saveStatusText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={!isEditing || blogService.saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存草稿
          </button>
          <button
            onClick={handlePublish}
            disabled={!isEditing || isPublishing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            发布
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="博客标题"
            className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
          />

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Directory Selector */}
            <div className="w-[200px]">
              <Select
                value={selectedDirectoryId}
                options={[{ value: '', label: '选择目录...' }, ...directoryOptions]}
                onChange={handleDirectoryChange}
                placeholder="选择目录"
                aria-label="选择目录"
              />
            </div>

            {/* Tags */}
            <div className="flex-1 min-w-[300px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">标签:</span>
                {tagService.tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`
                      px-2 py-1 text-xs font-medium rounded-full transition-colors
                      ${selectedTagIds.includes(tag.id)
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600'
                      }
                    `}
                    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    {tag.name}
                  </button>
                ))}
                {tagService.tags.length === 0 && (
                  <span className="text-sm text-gray-400 dark:text-gray-600">暂无标签</span>
                )}
              </div>
            </div>
          </div>

          {/* Editor Toolbar */}
          <EditorToolbar editor={editor} />

          {/* Editor Content */}
          <EditorContent editor={editor} className="min-h-[400px]" />

          {/* Placeholder if editor is empty */}
          {!editor?.getText() && !contentLoaded && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 pointer-events-none">
              开始写作...
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
