import { useEffect, useState, useCallback, useRef } from 'react';
import { view, useService, raw } from '@rabjs/react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Loader2, Save, Send, ArrowLeft } from 'lucide-react';
import slugify from 'slugify';
import { BlogService } from '../../../../services/blog.service';
import { TagService } from '../../../../services/tag.service';
import { ToastService } from '../../../../services/toast.service';
import { EditorToolbar } from '../editor-toolbar';
import type { BlogDto } from '@x-console/dto';
import { inlineEditableExtensions, MAX_EXCERPT_LENGTH } from '../../editor/tiptap.config';

interface InlineBlogEditorProps {
  blog: BlogDto;
  onBack: () => void;
}

export const InlineBlogEditor = view(({ blog, onBack }: InlineBlogEditorProps) => {
  const blogService = useService(BlogService);
  const tagService = useService(TagService);
  const toastService = useService(ToastService);

  // Use ref to track current title/content for debounce
  const titleRef = useRef(blog.title);
  const contentJsonRef = useRef(blog.content);

  const [title, setTitle] = useState(blog.title);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(blog.tags.map((t) => t.id));
  const [isPublishing, setIsPublishing] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);

  // Debounce timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize editor with existing content
  const editor = useEditor({
    extensions: inlineEditableExtensions,
    content: blog.content ? raw(blog.content) : '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-0 py-3',
      },
    },
    immediatelyRender: false,
  });

  // Load tags
  useEffect(() => {
    tagService.loadTags();
  }, []);

  // Mark content as loaded when editor is ready
  useEffect(() => {
    if (editor && blog.content) {
      editor.commands.setContent(raw(blog.content));
      setContentLoaded(true);
    } else if (editor) {
      setContentLoaded(true);
    }
  }, [editor]);

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setLocalSaving(true);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await blogService.saveBlog(blog.id, {
          title: titleRef.current,
          content: contentJsonRef.current,
          excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
          slug: slugify(titleRef.current, { lower: true, locale: 'zh', strict: false }),
        });
      } finally {
        setLocalSaving(false);
      }
    }, 1000); // 1 second debounce
  }, [blog.id, blogService, editor]);

  // Handle title change
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      titleRef.current = newTitle;
      debouncedSave();
    },
    [debouncedSave]
  );

  // Handle content change
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      contentJsonRef.current = editor.getJSON();
      debouncedSave();
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, debouncedSave]);

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
      blogService.updateBlog(blog.id, { tagIds: newTags });
    },
    [selectedTagIds, blog.id, blogService]
  );

  // Save as draft
  const handleSaveDraft = useCallback(async () => {
    // Clear any pending debounced save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setLocalSaving(true);
    try {
      const content = editor?.getJSON();
      await blogService.saveBlog(blog.id, {
        title,
        content,
        excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH),
        status: 'draft',
      });
      toastService.success('草稿保存成功');
    } finally {
      setLocalSaving(false);
    }
  }, [blog.id, title, editor, blogService, toastService]);

  // Publish blog
  const handlePublish = useCallback(async () => {
    // Clear any pending debounced save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setIsPublishing(true);
    try {
      // Save with published status
      const content = editor?.getJSON();
      await blogService.saveBlog(blog.id, {
        title,
        content,
        excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH),
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
  }, [blog.id, title, editor, blogService, toastService, onBack]);

  // Determine if save button should be disabled
  const isSaving = localSaving || blogService.saving;

  if (blogService.loading && !contentLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-900">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-dark-700 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            title="返回预览"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {isSaving ? '保存中...' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            保存草稿
          </button>
          <button
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
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

      {/* Editor Toolbar - Fixed */}
      <div className="shrink-0">
        <EditorToolbar editor={editor} />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mt-6">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="博客标题"
            className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
          />

          {/* Tags */}
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

          {/* Editor Content */}
          <EditorContent editor={editor} className="min-h-[400px]" />

          {/* Placeholder if editor is empty */}
          {!editor?.getText() && contentLoaded && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-600 pointer-events-none">
              开始写作...
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
