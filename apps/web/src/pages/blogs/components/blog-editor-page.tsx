import { useEffect, useState, useCallback, useRef } from 'react';
import { view, useService, raw } from '@rabjs/react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Loader2, Save, Send, ArrowLeft, Eye, Edit2, Trash2 } from 'lucide-react';
import slugify from 'slugify';
import { BlogService } from '../../../../services/blog.service';
import { DirectoryService } from '../../../../services/directory.service';
import { TagService } from '../../../../services/tag.service';
import { ToastService } from '../../../../services/toast.service';
import { EditorToolbar } from '../editor-toolbar';
import { previewExtensions, inlineEditableExtensions, MAX_EXCERPT_LENGTH } from '../../editor/tiptap.config';
import type { BlogDto } from '@x-console/dto';

interface BlogEditorPageProps {
  pageId: string;
  onBack: () => void;
}

export const BlogEditorPage = view(({ pageId, onBack }: BlogEditorPageProps) => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const tagService = useService(TagService);
  const toastService = useService(ToastService);

  const blog = blogService.currentBlog;

  // State
  const [isPreview, setIsPreview] = useState(true);
  const [title, setTitle] = useState(blog?.title || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(blog?.tags.map((t) => t.id) || []);
  const [isPublishing, setIsPublishing] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);

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
    blogService.loadBlog(pageId);
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
      } finally {
        setLocalSaving(false);
      }
    }, 1000);
  }, [blog, blogService, editEditor]);

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
    [selectedTagIds, blog, blogService]
  );

  // Toggle preview/edit mode
  const togglePreview = useCallback(() => {
    setIsPreview((prev) => !prev);
  }, []);

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
        excerpt: editEditor.getText().slice(0, MAX_EXCERPT_LENGTH),
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
        excerpt: editEditor.getText().slice(0, MAX_EXCERPT_LENGTH),
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

  // Loading state
  if (blogService.loading && !contentLoaded) {
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
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-dark-700 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            title="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {localSaving ? '保存中...' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview/Edit toggle */}
          <button
            onClick={togglePreview}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors"
          >
            {isPreview ? (
              <>
                <Edit2 className="w-4 h-4" />
                编辑
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                预览
              </>
            )}
          </button>

          {/* Save draft button */}
          <button
            onClick={handleSaveDraft}
            disabled={localSaving || isPublishing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {localSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            保存草稿
          </button>

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={localSaving || isPublishing}
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

      {/* Editor Toolbar (only in edit mode) */}
      {!isPreview && (
        <div className="shrink-0">
          <EditorToolbar editor={editEditor} blogId={blog.id} />
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mt-6">
          {/* Title Input (only in edit mode) */}
          {!isPreview && (
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="博客标题"
              className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
            />
          )}

          {/* Tags (only in edit mode) */}
          {!isPreview && (
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
          )}

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
