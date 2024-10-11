import { useEffect, useState, useCallback, useRef } from 'react';
import { view, useService, raw } from '@rabjs/react';
import { useParams, useNavigate } from 'react-router';
import { useEditor, EditorContent } from '@tiptap/react';
import { Loader2, Save, Send, ArrowLeft, Eye, Edit2, Trash2 } from 'lucide-react';
import slugify from 'slugify';
import { BlogService } from '../../../services/blog.service';
import { DirectoryService } from '../../../services/directory.service';
import { TagService } from '../../../services/tag.service';
import { ToastService } from '../../../services/toast.service';
import { EditorToolbar } from './editor-toolbar';
import { previewExtensions, inlineEditableExtensions, MAX_EXCERPT_LENGTH } from '../editor/tiptap.config';
import type { BlogDto } from '@x-console/dto';

interface BlogEditorPageProps {
  pageId?: string;
  onBack?: () => void;
}

// Helper functions moved outside component
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getDirectoryPath = (blog: BlogDto | undefined, directories: { id: string; name: string }[]): string => {
  if (!blog?.directoryId) return '';
  const dir = directories.find((d) => d.id === blog.directoryId);
  return dir?.name || '';
};

export const BlogEditorPage = view(({ pageId: pageIdProp, onBack: onBackProp }: BlogEditorPageProps) => {
  const params = useParams();
  const navigate = useNavigate();
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const tagService = useService(TagService);
  const toastService = useService(ToastService);

  // Use props if provided, otherwise fall back to URL params / navigate
  const pageId = pageIdProp || params.id;
  const onBack = onBackProp || (() => navigate('/blogs'));

  const blog = blogService.currentBlog;

  // State
  const [isPreview, setIsPreview] = useState(true);
  const [title, setTitle] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const [blogLoading, setBlogLoading] = useState(false);

  // Refs for debounce
  const titleRef = useRef(blog?.title || '');
  const contentJsonRef = useRef(blog?.content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preview editor (read-only)
  const previewEditor = useEditor({
    extensions: previewExtensions,
    content: blog?.content ? raw(blog.content) : '',
    editable: false,
    immediatelyRender: false,
  });

  // Edit editor (editable)
  const editEditor = useEditor({
    extensions: inlineEditableExtensions,
    content: blog?.content ? raw(blog.content) : '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-0 py-3',
      },
    },
    immediatelyRender: false,
  });

  // Load blog and tags on mount
  useEffect(() => {
    if (pageId) {
      setBlogLoading(true);
      blogService.loadBlog(pageId).finally(() => {
        setBlogLoading(false);
      });
    }
    tagService.loadTags();
  }, [pageId, blogService, tagService]);

  // Sync state when blog changes
  useEffect(() => {
    if (blog) {
      setTitle(blog.title);
      titleRef.current = blog.title;
      setSelectedTagIds(blog.tags.map((t) => t.id));
      contentJsonRef.current = blog.content;

      // Update preview editor content
      if (previewEditor && blog.content) {
        previewEditor.commands.setContent(raw(blog.content));
      }
      // Update edit editor content
      if (editEditor && blog.content) {
        editEditor.commands.setContent(raw(blog.content));
      }
      setContentLoaded(true);
    }
  }, [blog, previewEditor, editEditor]);

  // Also update when pageId changes (blog might not be loaded yet)
  useEffect(() => {
    if (pageId && blog && blog.id !== pageId) {
      // Blog doesn't match the pageId, need to reload
      setBlogLoading(true);
      blogService.loadBlog(pageId).finally(() => {
        setBlogLoading(false);
      });
    }
  }, [pageId, blog, blogService]);

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setLocalSaving(true);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await blogService.saveBlog(blog!.id, {
          title: titleRef.current,
          content: contentJsonRef.current,
          excerpt: editEditor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
          slug: slugify(titleRef.current, { lower: true, locale: 'zh', strict: false }),
        });
      } catch (error) {
        toastService.error('保存失败');
      } finally {
        setLocalSaving(false);
      }
    }, 1000);
  }, [blog?.id, blogService, editEditor, toastService]);

  // Handle title change
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      titleRef.current = newTitle;
      debouncedSave();
    },
    [debouncedSave]
  );

  // Handle content change in edit mode
  useEffect(() => {
    if (!editEditor) return;

    const handleUpdate = () => {
      contentJsonRef.current = editEditor.getJSON();
      debouncedSave();
    };

    editEditor.on('update', handleUpdate);
    return () => {
      editEditor.off('update', handleUpdate);
    };
  }, [editEditor, debouncedSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Toggle tag
  const toggleTag = useCallback(
    (tagId: string) => {
      const newTags = selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId];
      setSelectedTagIds(newTags);
      if (blog) {
        blogService.updateBlog(blog.id, { tagIds: newTags });
      }
    },
    [selectedTagIds, blog, blogService, toastService]
  );

  // Save as draft
  const handleSaveDraft = useCallback(async () => {
    if (!editEditor || !blog) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setLocalSaving(true);
    try {
      const content = editEditor.getJSON();
      await blogService.saveBlog(blog.id, {
        title,
        content,
        excerpt: editEditor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'draft',
      });
      toastService.success('草稿保存成功');
    } finally {
      setLocalSaving(false);
    }
  }, [blog, title, editEditor, blogService, toastService]);

  // Publish blog
  const handlePublish = useCallback(async () => {
    if (!editEditor || !blog) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setIsPublishing(true);
    try {
      const content = editEditor.getJSON();
      await blogService.saveBlog(blog.id, {
        title,
        content,
        excerpt: editEditor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'published',
      });
      const publishedBlog = await blogService.publishBlog(blog.id);
      if (publishedBlog) {
        toastService.success('博客发布成功');
        onBack();
      }
    } finally {
      setIsPublishing(false);
    }
  }, [blog, title, editEditor, blogService, toastService, onBack]);

  // Get current editor based on mode
  const currentEditor = isPreview ? previewEditor : editEditor;

  // Word count
  const wordCount = currentEditor?.getText().length || 0;

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!blog) return;
    if (window.confirm(`确定要删除博客 "${blog.title}" 吗？此操作不可撤销。`)) {
      blogService.deleteBlog(blog.id).then(() => {
        toastService.success('博客已删除');
        onBack();
      }).catch(() => {
        toastService.error('删除失败');
      });
    }
  }, [blog, blogService, toastService, onBack]);

  // Loading state
  if (blogLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">博客不存在</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-dark-700 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded transition-colors"
            title="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {getDirectoryPath(blog, directoryService.directories) && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getDirectoryPath(blog, directoryService.directories)} / {blog.title}
            </span>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span>创建于 {formatDate(blog.createdAt)}</span>
            <span>修改于 {formatDate(blog.updatedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-1 text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded transition-colors"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Button Group: Preview/Edit toggle */}
          <div className="flex items-center rounded overflow-hidden border border-gray-200 dark:border-dark-600">
            <button
              onClick={() => setIsPreview(true)}
              className={`px-2 py-1 text-xs font-medium transition-colors
                ${isPreview
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-50 dark:bg-dark-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-600'
                }`}
            >
              <Eye className="w-3.5 h-3.5 inline mr-0.5" />
              预览
            </button>
            <button
              onClick={() => setIsPreview(false)}
              className={`px-2 py-1 text-xs font-medium transition-colors border-l border-gray-200 dark:border-dark-600
                ${!isPreview
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-50 dark:bg-dark-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-600'
                }`}
            >
              <Edit2 className="w-3.5 h-3.5 inline mr-0.5" />
              编辑
            </button>
          </div>

          {/* Save draft button - only visible in edit mode */}
          {!isPreview && (
            <button
              onClick={handleSaveDraft}
              disabled={localSaving || isPublishing}
              className="p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded transition-colors disabled:opacity-50"
              title="保存草稿"
            >
              {localSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={localSaving || isPublishing}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            发布
          </button>
        </div>
      </div>

      {/* Editor Toolbar (only in edit mode) */}
      {!isPreview && (
        <div className="shrink-0">
          <EditorToolbar editor={editEditor} blogId={blog.id} />
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mt-6">
          {/* Title - edit mode uses input, preview mode uses h1 */}
          {isPreview ? (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
          ) : (
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="博客标题"
              className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
            />
          )}

          {/* Meta info row - shown in both modes */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {wordCount} 字
            </span>

            {/* Tags - edit mode supports toggle, preview mode is readonly */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">标签:</span>
              {tagService.tags.map((tag) => (
                isPreview ? (
                  <span
                    key={tag.id}
                    className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${selectedTagIds.includes(tag.id)
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-700'
                      }
                    `}
                    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    {tag.name}
                  </span>
                ) : (
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
                )
              ))}
              {!isPreview && tagService.tags.length > 0 && (
                <button
                  onClick={() => { /* TODO: Add tag creation */ }}
                  className="px-2 py-1 text-xs font-medium rounded-full border border-dashed border-gray-300 dark:border-dark-600 text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors"
                >
                  + 添加
                </button>
              )}
              {tagService.tags.length === 0 && (
                <span className="text-sm text-gray-400 dark:text-gray-600">暂无标签</span>
              )}
            </div>
          </div>

          {/* Editor Content */}
          <EditorContent
            editor={currentEditor}
            className={isPreview ? 'prose dark:prose-invert max-w-none' : 'min-h-[400px]'}
          />

          {/* Placeholder if editor is empty (only in edit mode) */}
          {!isPreview && !editEditor?.getText() && contentLoaded && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-600 pointer-events-none">
              开始写作...
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
