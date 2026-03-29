import { Service } from 'typedi';
import { eq, and, inArray } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { tags, type Tag, type NewTag } from '../db/schema/tag.js';
import { blogTags } from '../db/schema/blog-tag.js';
import { generateUid } from '../utils/id.js';

@Service()
export class TagService {
  /**
   * Get all tags for a user
   */
  async getTags(userId: string): Promise<Tag[]> {
    const db = getDatabase();

    const results = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(tags.name);

    return results;
  }

  /**
   * Get a single tag
   */
  async getTag(id: string, userId: string): Promise<Tag | null> {
    const db = getDatabase();

    const results = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new tag
   */
  async createTag(userId: string, data: { name: string; color?: string }): Promise<Tag> {
    const db = getDatabase();
    const id = generateUid();

    const newTag: NewTag = {
      id,
      userId,
      name: data.name,
      color: data.color ?? '#3B82F6',
    };

    await db.insert(tags).values(newTag);

    const [created] = await db.select().from(tags).where(eq(tags.id, id));
    return created;
  }

  /**
   * Update a tag
   */
  async updateTag(
    id: string,
    userId: string,
    data: { name?: string; color?: string }
  ): Promise<Tag | null> {
    const db = getDatabase();

    const existing = await this.getTag(id, userId);
    if (!existing) {
      return null;
    }

    const updateData: Partial<Tag> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;

    await db
      .update(tags)
      .set(updateData)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)));

    const [updated] = await db.select().from(tags).where(eq(tags.id, id));
    return updated;
  }

  /**
   * Delete a tag
   * - Removes all blog_tag associations (handled by FK cascade, but explicit here)
   */
  async deleteTag(id: string, userId: string): Promise<boolean> {
    const db = getDatabase();

    const existing = await this.getTag(id, userId);
    if (!existing) {
      return false;
    }

    // Delete blog_tag associations
    await db.delete(blogTags).where(eq(blogTags.tagId, id));

    // Delete the tag
    await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));

    return true;
  }

  /**
   * Get tags for a specific blog
   */
  async getTagsForBlog(blogId: string): Promise<Tag[]> {
    const db = getDatabase();

    const results = await db
      .select({
        id: tags.id,
        userId: tags.userId,
        name: tags.name,
        color: tags.color,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      })
      .from(tags)
      .innerJoin(blogTags, eq(tags.id, blogTags.tagId))
      .where(eq(blogTags.blogId, blogId));

    return results;
  }
}
