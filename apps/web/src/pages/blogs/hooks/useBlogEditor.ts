import { useState, useCallback, useRef, useEffect } from 'react';
import { useService } from '@rabjs/react';
import { useNavigate } from 'react-router';
import slugify from 'slugify';
import { MAX_EXCERPT_LENGTH } from '../../editor/tiptap.config';
import type { Editor } from '@tiptap/react';
import type { BlogDto } from '@x-console/dto';
import { BlogService } from '../../../services/blog.service';
import { TagService } from '../../../services/tag.service';
import { ToastService } from '../../../services/toast.service';

export interface UseBlogEditorOptions {
  pageId: string | undefined;
  editor: Editor | null | undefined;
}

export interface UseBlogEditorReturn {
  blog: BlogDto | null;
  loading: boolean;
  title: string;
  selectedTagIds: string[];
  isPreview: boolean;
  isPublishing: boolean;
  localSaving: boolean;
  wordCount: number;
  handleTitleChange: (title: string) => void;
  toggleTag: (tagId: string) => void;
  handleSaveDraft: () => Promise<void>;
  handlePublish: () => Promise<void>;
  handleDelete: () => void;
  setIsPreview: (v: boolean) => void;
}

export function useBlogEditor({
  pageId,
  editor,
}: UseBlogEditorOptions): UseBlogEditorReturn {
  const blogService = useService(BlogService);
  const tagService = useService(TagService);
  const toastService = useService(ToastService);
  const navigate = useNavigate();

  const blog = blogService.currentBlog;

  // State
  const [title, setTitle] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs for debounce
  const titleRef = useRef(blog?.title || '');
  const contentJsonRef = useRef(blog?.content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load blog on mount / pageId change
  useEffect(() => {
    if (pageId) {
      setLoading(true);
      blogService.loadBlog(pageId).finally(() => {
        setLoading(false);
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
    }
  }, [blog]);

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
          excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
          slug: slugify(titleRef.current, { lower: true, locale: 'zh', strict: false }),
        });
      } catch {
        toastService.error('保存失败');
      } finally {
        setLocalSaving(false);
      }
    }, 1000);
  }, [blog, blogService, editor, toastService]);

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
      if (blog) {
        blogService.updateBlog(blog.id, { tagIds: newTags });
      }
    },
    [selectedTagIds, blog, blogService]
  );

  // Save as draft
  const handleSaveDraft = useCallback(async () => {
    if (!editor || !blog) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setLocalSaving(true);
    try {
      const content = editor.getJSON();
      await blogService.saveBlog(blog.id, {
        title,
        content,
        excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'draft',
      });
      toastService.success('草稿保存成功');
    } finally {
      setLocalSaving(false);
    }
  }, [blog, title, editor, blogService, toastService]);

  // Publish blog
  const handlePublish = useCallback(async () => {
    if (!editor || !blog) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setIsPublishing(true);
    try {
      const content = editor.getJSON();
      await blogService.saveBlog(blog.id, {
        title,
        content,
        excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'published',
      });
      const publishedBlog = await blogService.publishBlog(blog.id);
      if (publishedBlog) {
        toastService.success('博客发布成功');
      }
    } finally {
      setIsPublishing(false);
    }
  }, [blog, title, editor, blogService, toastService]);

  // Word count
  const wordCount = editor?.getText().length || 0;

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!blog) return;
    if (window.confirm(`确定要删除博客 "${blog.title}" 吗？此操作不可撤销。`)) {
      blogService
        .deleteBlog(blog.id)
        .then(() => {
          toastService.success('博客已删除');
          navigate('/blogs');
        })
        .catch(() => {
          toastService.error('删除失败');
        });
    }
  }, [blog, blogService, toastService, navigate]);

  return {
    blog: blog || null,
    loading,
    title,
    selectedTagIds,
    isPreview,
    isPublishing,
    localSaving,
    wordCount,
    handleTitleChange,
    toggleTag,
    handleSaveDraft,
    handlePublish,
    handleDelete,
    setIsPreview,
  };
}
