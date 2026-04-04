import { Service } from '@rabjs/react';
import slugify from 'slugify';
import type { Editor } from '@tiptap/react';
import type { BlogDto } from '@x-console/dto';
import { BlogService } from '../../../../services/blog.service';
import { TagService } from '../../../../services/tag.service';
import { ToastService } from '../../../../services/toast.service';
import { MAX_EXCERPT_LENGTH } from './editor/tiptap.config';

/**
 * BlogEditorService encapsulates all blog editing state and business logic.
 *
 * Responsibilities:
 * - Blog/tag loading
 * - Title, preview mode, tag selection state
 * - 1s debounced auto-save
 * - Save draft / publish / delete actions
 * - Word count (from editor)
 *
 * Usage:
 *   1. Page component creates via `bindServices(BlogEditorPageContent, [BlogEditorService])`
 *   2. After `useEditor()` returns, call `blogEditorService.setEditor(editor)`
 *   3. Child components use `useService(BlogEditorService)` to access state/methods directly
 */
export class BlogEditorService extends Service {
  blog: BlogDto | null = null;
  title = '';
  selectedTagIds: string[] = [];
  isPreview = true;
  isPublishing = false;
  localSaving = false;
  loading = false;

  pageId: string | undefined;
  navigate: (path: string) => void = () => {};

  // Collaboration mode: when true, skip HTTP auto-save (server syncs via WebSocket)
  isCollaborationMode = false;

  private contentJsonRef: Record<string, unknown> | undefined = undefined;
  private saveTimerRef: ReturnType<typeof setTimeout> | null = null;
  private editorRef: Editor | null = null;
  private editorCleanupRef: (() => void) | null = null;

  get blogService(): BlogService {
    return this.resolve(BlogService) as BlogService;
  }

  get tagService(): TagService {
    return this.resolve(TagService) as TagService;
  }

  get toastService(): ToastService {
    return this.resolve(ToastService) as ToastService;
  }

  get wordCount(): number {
    return this.editorRef?.getText().length ?? 0;
  }

  setup(pageId: string | undefined, navigate: (path: string) => void) {
    this.pageId = pageId;
    this.navigate = navigate;
  }

  setEditor(editor: Editor | null) {
    this.editorCleanupRef?.();
    this.editorCleanupRef = null;
    this.editorRef = editor;

    if (editor) {
      this.setupEditorListener(editor);
    }
  }

  async load() {
    const pid = this.pageId;
    if (pid) {
      this.loading = true;
      try {
        await this.blogService.loadBlog(pid);
        const blog = this.blogService.currentBlog;
        if (blog) {
          this.blog = blog;
          this.title = blog.title;
          this.selectedTagIds = blog.tags.map((t) => t.id as string);
          this.contentJsonRef = blog.content as Record<string, unknown> | undefined;
        }
      } finally {
        this.loading = false;
      }
    }
    this.tagService.loadTags();
  }

  private setupEditorListener(editor: Editor) {
    const handleUpdate = () => {
      this.contentJsonRef = editor.getJSON();
      // Skip debounced save when in collaboration mode (server handles persistence)
      if (!this.isCollaborationMode) {
        this.debouncedSave();
      }
    };

    editor.on('update', handleUpdate);
    this.editorCleanupRef = () => editor.off('update', handleUpdate);
  }

  /**
   * Set collaboration mode.
   * When enabled, editor updates won't trigger HTTP auto-save
   * as the server handles persistence via WebSocket.
   */
  setCollaborationMode(enabled: boolean) {
    this.isCollaborationMode = enabled;
    console.log('[BlogEditorService] Collaboration mode:', enabled);
  }

  private debouncedSave() {
    if (this.saveTimerRef) {
      clearTimeout(this.saveTimerRef);
    }

    this.localSaving = true;
    this.saveTimerRef = setTimeout(async () => {
      try {
        if (!this.blog) return;
        await this.blogService.saveBlog(this.blog.id, {
          title: this.title,
          content: this.contentJsonRef,
          excerpt: this.editorRef?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
          slug: slugify(this.title, { lower: true, locale: 'zh', strict: false }),
        });
      } catch {
        this.toastService.error('保存失败');
      } finally {
        this.localSaving = false;
      }
    }, 1000);
  }

  handleTitleChange(newTitle: string) {
    this.title = newTitle;
    this.debouncedSave();
  }

  /**
   * Save title immediately on blur (no debounce)
   * Also refreshes sidebar to show updated title
   */
  async saveTitleImmediately() {
    if (!this.blog || this.saveTimerRef) return;

    // Clear any pending debounced save
    if (this.saveTimerRef) {
      clearTimeout(this.saveTimerRef);
      this.saveTimerRef = null;
    }

    this.localSaving = true;
    try {
      await this.blogService.saveBlog(this.blog.id, {
        title: this.title,
        slug: slugify(this.title, { lower: true, locale: 'zh', strict: false }),
      });
    } catch {
      this.toastService.error('标题保存失败');
    } finally {
      this.localSaving = false;
    }
  }

  toggleTag(tagId: string) {
    if (this.selectedTagIds.includes(tagId)) {
      this.selectedTagIds = this.selectedTagIds.filter((id) => id !== tagId);
    } else {
      this.selectedTagIds = [...this.selectedTagIds, tagId];
    }
    if (this.blog) {
      this.blogService.updateBlog(this.blog.id, { tagIds: this.selectedTagIds });
    }
  }

  togglePreview() {
    this.isPreview = !this.isPreview;
  }

  async saveDraft() {
    if (!this.editorRef || !this.blog) return;

    if (this.saveTimerRef) {
      clearTimeout(this.saveTimerRef);
      this.saveTimerRef = null;
    }

    this.localSaving = true;
    try {
      const content = this.editorRef.getJSON();
      await this.blogService.saveBlog(this.blog.id, {
        title: this.title,
        content,
        excerpt: this.editorRef?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'draft',
      });
      this.toastService.success('草稿保存成功');
    } finally {
      this.localSaving = false;
    }
  }

  async publish() {
    if (!this.editorRef || !this.blog) return;

    if (this.saveTimerRef) {
      clearTimeout(this.saveTimerRef);
      this.saveTimerRef = null;
    }

    this.isPublishing = true;
    try {
      const content = this.editorRef.getJSON();
      await this.blogService.saveBlog(this.blog.id, {
        title: this.title,
        content,
        excerpt: this.editorRef?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'published',
      });
      await this.blogService.publishBlog(this.blog.id);
      this.toastService.success('博客发布成功');
    } finally {
      this.isPublishing = false;
    }
  }

  deleteBlog() {
    if (!this.blog) return;
    if (window.confirm(`确定要删除博客 "${this.blog.title}" 吗？此操作不可撤销。`)) {
      this.blogService
        .deleteBlog(this.blog.id)
        .then(() => {
          this.toastService.success('博客已删除');
          this.navigate('/blogs');
        })
        .catch(() => {
          this.toastService.error('删除失败');
        });
    }
  }

  onDestroy() {
    if (this.saveTimerRef) {
      clearTimeout(this.saveTimerRef);
    }

    this.editorCleanupRef?.();
    this.editorCleanupRef = null;
  }
}
