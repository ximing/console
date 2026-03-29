import { Service } from '@rabjs/react';
import { directoryApi } from '../api/blog';
import type { DirectoryDto, CreateDirectoryDto, UpdateDirectoryDto } from '@x-console/dto';

type ToastService = {
  success(message: string): void;
  error(message: string): void;
};

export interface DirectoryTreeNode extends DirectoryDto {
  children: DirectoryTreeNode[];
}

/**
 * Directory Service
 * Manages blog directory/folder state and tree building
 */
export class DirectoryService extends Service {
  // State
  directories: DirectoryDto[] = [];
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
   * Load all directories
   */
  async loadDirectories(): Promise<void> {
    this.loading = true;

    try {
      const data = await directoryApi.getDirectories();
      this.directories = data.directories;
    } catch (err) {
      console.error('Load directories error:', err);
      const toast = await this.getToastService();
      toast.error('Failed to load directories');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a new directory
   */
  async createDirectory(data: CreateDirectoryDto): Promise<DirectoryDto | null> {
    try {
      const directory = await directoryApi.createDirectory(data);
      this.directories = [...this.directories, directory];
      return directory;
    } catch (err) {
      console.error('Create directory error:', err);
      const toast = await this.getToastService();
      toast.error('Failed to create directory');
      return null;
    }
  }

  /**
   * Update a directory
   */
  async updateDirectory(id: string, data: UpdateDirectoryDto): Promise<DirectoryDto | null> {
    try {
      const directory = await directoryApi.updateDirectory(id, data);
      this.directories = this.directories.map((d) => (d.id === id ? directory : d));
      return directory;
    } catch (err) {
      console.error('Update directory error:', err);
      const toast = await this.getToastService();
      toast.error('Failed to update directory');
      return null;
    }
  }

  /**
   * Delete a directory
   */
  async deleteDirectory(id: string): Promise<boolean> {
    try {
      await directoryApi.deleteDirectory(id);
      this.directories = this.directories.filter((d) => d.id !== id);
      return true;
    } catch (err) {
      console.error('Delete directory error:', err);
      const toast = await this.getToastService();
      toast.error('Failed to delete directory');
      return false;
    }
  }

  /**
   * Build a tree structure from flat directory list
   * @param dirs - Optional list of directories to build tree from. If not provided, uses local state.
   * @returns Array of root directory nodes with nested children
   */
  buildTree(dirs?: DirectoryDto[]): DirectoryTreeNode[] {
    const directoryList = dirs || this.directories;

    // Create a map for quick lookup
    const dirMap = new Map<string, DirectoryTreeNode>();
    directoryList.forEach((dir) => {
      dirMap.set(dir.id, { ...dir, children: [] });
    });

    // Build the tree
    const roots: DirectoryTreeNode[] = [];
    directoryList.forEach((dir) => {
      const node = dirMap.get(dir.id)!;
      if (dir.parentId && dirMap.has(dir.parentId)) {
        // Add as child to parent
        dirMap.get(dir.parentId)!.children.push(node);
      } else {
        // Add as root
        roots.push(node);
      }
    });

    return roots;
  }
}

// Export singleton instance
export const directoryService = new DirectoryService();
