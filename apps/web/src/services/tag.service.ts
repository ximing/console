import { Service } from '@rabjs/react';
import { tagApi } from '../api/blog';
import type { TagDto, CreateTagDto, UpdateTagDto } from '@x-console/dto';
import type { ToastService } from './types';

/**
 * Tag Service
 * Manages blog tag state and operations
 */
export class TagService extends Service {
  // State
  tags: TagDto[] = [];
  loading = false;

  // Toast service reference (lazy loaded to avoid circular dependency)
  private toastService: ToastService | null = null;

  private async getToastService(): Promise<ToastService> {
    if (!this.toastService) {
      const module = await import('./toast.service');
      this.toastService = module.toastService;
    }
    return this.toastService;
  }

  /**
   * Load all tags
   */
  async loadTags(): Promise<void> {
    this.loading = true;

    try {
      const data = await tagApi.getTags();
      this.tags = data.tags;
    } catch (err) {
      console.error('Load tags error:', err);
      const toast = await this.getToastService();
      toast.error('Failed to load tags');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagDto): Promise<TagDto | null> {
    try {
      const tag = await tagApi.createTag(data);
      this.tags = [...this.tags, tag];
      const toast = await this.getToastService();
      toast.success('Tag created successfully');
      return tag;
    } catch (err) {
      console.error('Create tag error:', err);
      const toast = await this.getToastService();
      toast.error('Failed to create tag');
      return null;
    }
  }

  /**
   * Update a tag
   */
  async updateTag(id: string, data: UpdateTagDto): Promise<TagDto | null> {
    try {
      const tag = await tagApi.updateTag(id, data);
      this.tags = this.tags.map((t) => (t.id === id ? tag : t));
      const toast = await this.getToastService();
      toast.success('Tag updated successfully');
      return tag;
    } catch (err) {
      console.error('Update tag error:', err);
      const toast = await this.getToastService();
      toast.error('Failed to update tag');
      return null;
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<boolean> {
    try {
      await tagApi.deleteTag(id);
      this.tags = this.tags.filter((t) => t.id !== id);
      const toast = await this.getToastService();
      toast.success('Tag deleted successfully');
      return true;
    } catch (err) {
      console.error('Delete tag error:', err);
      const toast = await this.getToastService();
      toast.error('Failed to delete tag');
      return false;
    }
  }
}

// Export singleton instance
export const tagService = new TagService();
