import { Service } from '@rabjs/react';
import { blogApi } from '../api/blog';
import type { BlogDto, CreateBlogDto, UpdateBlogDto } from '@x-console/dto';
import { toast } from './toast.service';
import slugify from 'slugify';

// Constants
const DEFAULT_PAGE_SIZE = 10;
const AUTO_SAVE_DELAY_MS = 3000;
const MAX_EXCERPT_LENGTH = 200;

/**
 * Blog Service
 * Manages blog post state and operations with auto-save functionality
 */
export class BlogService extends Service {
  // State
  blogs: BlogDto[] = [];
  currentBlog: BlogDto | null = null;
  total = 0;
  page = 1;
  pageSize = DEFAULT_PAGE_SIZE;
  loading = false;
  saving = false;
  lastSavedAt: Date | null = null;

  // Auto-save timer
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  // Previous blog state for rollback on failed saves
  private previousBlog: BlogDto | null = null;

  /**
   * Search blogs by query string
   * Returns matching blogs directly without modifying state
   */
  async searchBlogs(query: string, pageSize = 20): Promise<BlogDto[]> {
    try {
      const data = await blogApi.getBlogs({ search: query, pageSize });
      return data.blogs;
    } catch (err) {
      console.error('Search blogs error:', err);
      toast.error('Search failed');
      return [];
    }
  }

  /**
   * Load blogs with pagination
   * When directoryId is specified, appends to existing blogs to preserve data
   * When directoryId is not specified, replaces with all blogs
   */
  async loadBlogs(params?: {
    page?: number;
    pageSize?: number;
    directoryId?: string;
    status?: 'draft' | 'published';
    tagId?: string;
    search?: string;
  }): Promise<void> {
    this.loading = true;

    try {
      if (params?.page) this.page = params.page;
      if (params?.pageSize) this.pageSize = params.pageSize;

      const data = await blogApi.getBlogs({
        page: this.page,
        pageSize: this.pageSize,
        directoryId: params?.directoryId,
        status: params?.status,
        tagId: params?.tagId,
        search: params?.search,
      });

      if (params?.directoryId) {
        // Append new blogs, avoiding duplicates by id
        const existingIds = new Set(this.blogs.map((b) => b.id));
        const newUniqueBlogs = data.blogs.filter((b) => !existingIds.has(b.id));
        this.blogs = [...this.blogs, ...newUniqueBlogs];
      } else {
        // Replace with all blogs when no directoryId
        this.blogs = data.blogs;
      }
      this.total = data.total;
    } catch (err) {
      console.error('Load blogs error:', err);
      toast.error('Failed to load blogs');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Load a single blog by ID
   */
  async loadBlog(id: string): Promise<void> {
    this.loading = true;

    try {
      const blog = await blogApi.getBlog(id);
      this.currentBlog = blog;
    } catch (err) {
      console.error('Load blog error:', err);
      toast.error('Failed to load blog');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a new blog
   */
  async createBlog(data: CreateBlogDto, directoryId?: string): Promise<BlogDto | null> {
    try {
      const blog = await blogApi.createBlog(data);
      // If directoryId provided, update the blog to belong to that directory
      if (directoryId) {
        const updatedBlog = await blogApi.updateBlog(blog.id, { directoryId });
        this.blogs = [updatedBlog, ...this.blogs];
        this.currentBlog = updatedBlog;
        return updatedBlog;
      }
      this.blogs = [blog, ...this.blogs];
      this.currentBlog = blog;
      return blog;
    } catch (err) {
      console.error('Create blog error:', err);
      toast.error('Failed to create blog');
      return null;
    }
  }

  /**
   * Update a blog with debounced auto-save (3 seconds)
   * This method debounces the save to avoid excessive API calls
   */
  updateBlog(id: string, data: UpdateBlogDto): void {
    // Clear any existing auto-save timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Store previous state for rollback on failure
    if (this.currentBlog && this.currentBlog.id === id) {
      this.previousBlog = { ...this.currentBlog };
    }

    // Update local state immediately for responsive UI
    if (this.currentBlog && this.currentBlog.id === id) {
      this.currentBlog = {
        ...this.currentBlog,
        ...data,
        directoryId: data.directoryId ?? undefined,
        updatedAt: new Date().toISOString(),
      };
    }

    // Set new auto-save timer (3 seconds debounce)
    this.autoSaveTimer = setTimeout(() => {
      this.saveBlog(id, data);
    }, AUTO_SAVE_DELAY_MS);
  }

  /**
   * Save blog immediately (called by auto-save or Ctrl/Cmd+S)
   */
  async saveBlog(id: string, data: UpdateBlogDto): Promise<void> {
    // Clear any pending auto-save timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    this.saving = true;

    try {
      const blog = await blogApi.updateBlog(id, {
        ...data,
        updatedAt: this.currentBlog?.updatedAt,
      });
      this.currentBlog = blog;

      // Update in blogs list if present
      const index = this.blogs.findIndex((b) => b.id === id);
      if (index !== -1) {
        this.blogs[index] = blog;
      }

      this.lastSavedAt = new Date();
    } catch (err) {
      console.error('Save blog error:', err);
      toast.error('Failed to save blog');

      // Rollback to previous state on failure
      if (this.previousBlog) {
        this.currentBlog = this.previousBlog;
        this.previousBlog = null;
      }
    } finally {
      this.saving = false;
    }
  }

  /**
   * Delete a blog
   */
  async deleteBlog(id: string): Promise<boolean> {
    try {
      await blogApi.deleteBlog(id);
      this.blogs = this.blogs.filter((b) => b.id !== id);
      if (this.currentBlog?.id === id) {
        this.currentBlog = null;
      }
      return true;
    } catch (err) {
      console.error('Delete blog error:', err);
      toast.error('Failed to delete blog');
      return false;
    }
  }

  /**
   * Publish a blog
   */
  async publishBlog(id: string): Promise<BlogDto | null> {
    try {
      const blog = await blogApi.publishBlog(id);
      this.currentBlog = blog;

      // Update in blogs list if present
      const index = this.blogs.findIndex((b) => b.id === id);
      if (index !== -1) {
        this.blogs[index] = blog;
      }

      return blog;
    } catch (err) {
      console.error('Publish blog error:', err);
      toast.error('Failed to publish blog');
      return null;
    }
  }

  /**
   * Unpublish a blog
   */
  async unpublishBlog(id: string): Promise<BlogDto | null> {
    try {
      const blog = await blogApi.unpublishBlog(id);
      this.currentBlog = blog;

      // Update in blogs list if present
      const index = this.blogs.findIndex((b) => b.id === id);
      if (index !== -1) {
        this.blogs[index] = blog;
      }

      return blog;
    } catch (err) {
      console.error('Unpublish blog error:', err);
      toast.error('Failed to unpublish blog');
      return null;
    }
  }

  /**
   * Move a blog to a different directory
   */
  async moveBlog(blogId: string, targetDirectoryId: string | null): Promise<boolean> {
    try {
      const blog = await blogApi.updateBlog(blogId, { directoryId: targetDirectoryId ?? undefined });
      // Update in local state
      this.blogs = this.blogs.map((b) => (b.id === blogId ? blog : b));
      if (this.currentBlog?.id === blogId) {
        this.currentBlog = blog;
      }
      return true;
    } catch (err) {
      console.error('Move blog error:', err);
      toast.error('Failed to move blog');
      return false;
    }
  }

  /**
   * Clear current blog state
   */
  clearCurrentBlog(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.currentBlog = null;
    this.lastSavedAt = null;
  }

  /**
   * Generate URL-friendly slug from title
   */
  generateSlug(title: string): string {
    return slugify(title, { lower: true, locale: 'zh', strict: false });
  }

  /**
   * Generate excerpt from editor content
   */
  generateExcerpt(editor: { getText: () => string }): string {
    return editor.getText().slice(0, MAX_EXCERPT_LENGTH);
  }

  /**
   * Update blog title (triggers auto-save)
   */
  updateTitle(title: string): void {
    if (!this.currentBlog) return;
    this.updateBlog(this.currentBlog.id, {
      title,
      slug: this.generateSlug(title),
    });
  }

  /**
   * Update blog directory (triggers auto-save)
   */
  updateDirectory(directoryId: string | null): void {
    if (!this.currentBlog) return;
    this.updateBlog(this.currentBlog.id, {
      directoryId: directoryId || null,
    });
  }

  /**
   * Update blog tags (triggers auto-save)
   */
  updateTags(tagIds: string[]): void {
    if (!this.currentBlog) return;
    this.updateBlog(this.currentBlog.id, {
      tagIds,
    });
  }
}

// Export singleton instance
export const blogService = new BlogService();
