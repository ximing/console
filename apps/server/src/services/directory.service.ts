import { Service } from 'typedi';
import { eq, and, isNull, count } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { directories, type Directory, type NewDirectory } from '../db/schema/directory.js';
import { blogs } from '../db/schema/blog.js';
import { generateUid } from '../utils/id.js';

@Service()
export class DirectoryService {
  /**
   * Get directory tree for a user
   */
  async getDirectoryTree(userId: string): Promise<Directory[]> {
    const db = getDatabase();

    const results = await db
      .select()
      .from(directories)
      .where(eq(directories.userId, userId))
      .orderBy(directories.name);

    return results;
  }

  /**
   * Get a single directory
   */
  async getDirectory(id: string, userId: string): Promise<Directory | null> {
    const db = getDatabase();

    const results = await db
      .select()
      .from(directories)
      .where(and(eq(directories.id, id), eq(directories.userId, userId)))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new directory
   */
  async createDirectory(
    userId: string,
    data: { name: string; parentId?: string }
  ): Promise<Directory> {
    const db = getDatabase();
    const id = generateUid();

    const newDir: NewDirectory = {
      id,
      userId,
      name: data.name,
      parentId: data.parentId ?? null,
    };

    await db.insert(directories).values(newDir);

    const [created] = await db.select().from(directories).where(eq(directories.id, id));
    return created;
  }

  /**
   * Update a directory
   */
  async updateDirectory(
    id: string,
    userId: string,
    data: { name?: string; parentId?: string | null }
  ): Promise<Directory | null> {
    const db = getDatabase();

    const existing = await this.getDirectory(id, userId);
    if (!existing) {
      return null;
    }

    const updateData: Partial<Directory> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.parentId !== undefined) updateData.parentId = data.parentId ?? null;

    await db
      .update(directories)
      .set(updateData)
      .where(and(eq(directories.id, id), eq(directories.userId, userId)));

    const [updated] = await db.select().from(directories).where(eq(directories.id, id));
    return updated;
  }

  /**
   * Delete a directory
   * - Moves blogs to root (directoryId = null)
   * - Cascade deletes subdirectories
   */
  async deleteDirectory(id: string, userId: string): Promise<boolean> {
    const db = getDatabase();

    const existing = await this.getDirectory(id, userId);
    if (!existing) {
      return false;
    }

    // Move blogs to root
    await db
      .update(blogs)
      .set({ directoryId: null })
      .where(and(eq(blogs.directoryId, id), eq(blogs.userId, userId)));

    // Delete subdirectories recursively
    await this.deleteSubdirectories(id, userId);

    // Delete the directory itself
    await db.delete(directories).where(and(eq(directories.id, id), eq(directories.userId, userId)));

    return true;
  }

  /**
   * Helper: Recursively delete subdirectories
   */
  private async deleteSubdirectories(parentId: string, userId: string): Promise<void> {
    const db = getDatabase();

    // Get all child directories
    const children = await db
      .select()
      .from(directories)
      .where(and(eq(directories.parentId, parentId), eq(directories.userId, userId)));

    for (const child of children) {
      // Move blogs to root
      await db
        .update(blogs)
        .set({ directoryId: null })
        .where(and(eq(blogs.directoryId, child.id), eq(blogs.userId, userId)));

      // Recursively delete children
      await this.deleteSubdirectories(child.id, userId);

      // Delete child directory
      await db.delete(directories).where(eq(directories.id, child.id));
    }
  }
}
