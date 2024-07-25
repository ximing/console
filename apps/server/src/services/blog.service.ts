import { Service } from 'typedi';
import { eq, and, or, like, inArray, count, isNull, sql } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { blogs, type Blog, type NewBlog } from '../db/schema/blog.js';
import { blogTags } from '../db/schema/blog-tag.js';
import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';

export interface BlogWithTags extends Blog {
  tags: Array<{ id: string; name: string; color: string }>;
}

export interface BlogListOptions {
  userId: string;
  page?: number;
  pageSize?: number;
  directoryId?: string | null;
  tagId?: string;
  status?: 'draft' | 'published' | 'all';
  search?: string;
}

export interface BlogListResult {
  data: BlogWithTags[];
  total: number;
  page: number;
  pageSize: number;
}

@Service()
export class BlogService {
  /**
   * Get paginated blog list with filters
   */
  async getBlogs(options: BlogListOptions): Promise<BlogListResult> {
    const db = getDatabase();
    const { userId, page = 1, pageSize = 20, directoryId, tagId, status, search } = options;

    // Build where conditions
    const conditions = [eq(blogs.userId, userId)];

    if (directoryId === null) {
      conditions.push(isNull(blogs.directoryId));
    } else if (directoryId) {
      conditions.push(eq(blogs.directoryId, directoryId));
    }

    if (status && status !== 'all') {
      conditions.push(eq(blogs.status, status));
    }

    if (search) {
      conditions.push(
        or(
          like(blogs.title, `%${search}%`),
          like(blogs.excerpt, `%${search}%`)
        )!
      );
    }

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(blogs)
      .where(and(...conditions));
    const total = countResult[0]?.count ?? 0;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const results = await db
      .select()
      .from(blogs)
      .where(and(...conditions))
      .orderBy(sql`${blogs.updatedAt} DESC`)
      .limit(pageSize)
      .offset(offset);

    // Fetch tags for each blog
    const blogIds = results.map((b) => b.id);
    let tagsMap: Map<string, Array<{ id: string; name: string; color: string }>> = new Map();

    if (blogIds.length > 0) {
      // This would require a join - simplified for now
      // In production, you'd want a more efficient query
    }

    return {
      data: results.map((b) => ({ ...b, tags: tagsMap.get(b.id) ?? [] })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single blog by ID
   */
  async getBlog(id: string, userId: string): Promise<BlogWithTags | null> {
    const db = getDatabase();

    const results = await db
      .select()
      .from(blogs)
      .where(and(eq(blogs.id, id), eq(blogs.userId, userId)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const blog = results[0];

    // Fetch tags
    const tagResults = await db
      .select({ id: blogTags.tagId })
      .from(blogTags)
      .where(eq(blogTags.blogId, id));

    // Note: In a real implementation, you'd join with tags table here
    // For now, return blog with empty tags - will be enhanced in controller

    return { ...blog, tags: [] };
  }

  /**
   * Create a new blog
   */
  async createBlog(
    userId: string,
    data: {
      title: string;
      content?: Record<string, unknown>;
      excerpt?: string;
      slug: string;
      directoryId?: string;
      tagIds?: string[];
    }
  ): Promise<Blog> {
    const db = getDatabase();
    const id = generateUid();

    const newBlog: NewBlog = {
      id,
      userId,
      title: data.title,
      content: data.content ?? {},
      excerpt: data.excerpt ?? null,
      slug: data.slug,
      directoryId: data.directoryId ?? null,
      status: 'draft',
    };

    await db.insert(blogs).values(newBlog);

    // Add tags if provided
    if (data.tagIds && data.tagIds.length > 0) {
      await db.insert(blogTags).values(
        data.tagIds.map((tagId) => ({ blogId: id, tagId }))
      );
    }

    const [created] = await db.select().from(blogs).where(eq(blogs.id, id));
    return created;
  }

  /**
   * Update a blog
   */
  async updateBlog(
    id: string,
    userId: string,
    data: {
      title?: string;
      content?: Record<string, unknown>;
      excerpt?: string;
      slug?: string;
      directoryId?: string | null;
      status?: 'draft' | 'published';
      publishedAt?: Date | null;
      tagIds?: string[];
    },
    lastUpdatedAt?: Date
  ): Promise<Blog | null> {
    const db = getDatabase();

    // Check ownership and optionally check updatedAt for conflict
    const existing = await this.getBlog(id, userId);
    if (!existing) {
      return null;
    }

    // Conflict detection (last-write-wins)
    if (lastUpdatedAt && existing.updatedAt > lastUpdatedAt) {
      logger.warn('Blog update conflict detected', { id, existing: existing.updatedAt, client: lastUpdatedAt });
      // For now, proceed with update - could return conflict error in future
    }

    const updateData: Partial<Blog> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt ?? null;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.directoryId !== undefined) updateData.directoryId = data.directoryId ?? null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt ?? null;

    await db
      .update(blogs)
      .set(updateData)
      .where(and(eq(blogs.id, id), eq(blogs.userId, userId)));

    // Update tags if provided
    if (data.tagIds !== undefined) {
      await db.delete(blogTags).where(eq(blogTags.blogId, id));
      if (data.tagIds.length > 0) {
        await db.insert(blogTags).values(
          data.tagIds.map((tagId) => ({ blogId: id, tagId }))
        );
      }
    }

    const [updated] = await db.select().from(blogs).where(eq(blogs.id, id));
    return updated;
  }

  /**
   * Delete a blog
   */
  async deleteBlog(id: string, userId: string): Promise<boolean> {
    const db = getDatabase();

    const existing = await this.getBlog(id, userId);
    if (!existing) {
      return false;
    }

    // Cascade delete blog_tags (should be handled by FK, but being explicit)
    await db.delete(blogTags).where(eq(blogTags.blogId, id));

    await db.delete(blogs).where(and(eq(blogs.id, id), eq(blogs.userId, userId)));
    return true;
  }

  /**
   * Publish a blog
   */
  async publishBlog(id: string, userId: string): Promise<Blog | null> {
    return this.updateBlog(id, userId, {
      status: 'published',
      publishedAt: new Date(),
    });
  }

  /**
   * Unpublish a blog
   */
  async unpublishBlog(id: string, userId: string): Promise<Blog | null> {
    return this.updateBlog(id, userId, {
      status: 'draft',
      publishedAt: null,
    });
  }

  /**
   * Get blog by slug (for public access)
   */
  async getBlogBySlug(slug: string): Promise<Blog | null> {
    const db = getDatabase();

    const results = await db
      .select()
      .from(blogs)
      .where(and(eq(blogs.slug, slug), eq(blogs.status, 'published')))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }
}
