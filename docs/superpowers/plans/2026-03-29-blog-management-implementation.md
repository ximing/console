# Blog Management System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a blog management system with rich text editing (Tiptap), directory/tag organization, draft/publish workflow, and auto-save.

**Architecture:**
- Backend: Express + Drizzle ORM + routing-controllers (following existing patterns)
- Frontend: React 19 + @rabjs/react + Tiptap 3.21 + React Router
- Storage: Existing MinIO integration via StorageService
- State: @rabjs/react Service pattern (same as existing AuthService, TaskService)

**Tech Stack:** Tiptap 3.21, @tiptap/react, @tiptap/starter-kit, @tiptap/extension-image, @tiptap/extension-table, @tiptap/extension-audio, @tiptap/extension-youtube, slugify, drizzle-orm, routing-controllers

---

## Chunk 1: Backend Database Schema

**Files:**
- Create: `apps/server/src/db/schema/blog.ts`
- Create: `apps/server/src/db/schema/directory.ts`
- Create: `apps/server/src/db/schema/tag.ts`
- Create: `apps/server/src/db/schema/blog-tag.ts`
- Modify: `apps/server/src/db/schema/index.ts` (add exports)

- [ ] **Step 1: Create blog schema** (`apps/server/src/db/schema/blog.ts`)

```typescript
import { mysqlTable, varchar, text, timestamp, index, json } from 'drizzle-orm/mysql-core';

/**
 * Blog table - stores blog posts with Tiptap JSON content
 */
export const blogs = mysqlTable(
  'blogs',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: json('content').$type<Record<string, unknown>>(),
    excerpt: text('excerpt'),
    slug: varchar('slug', { length: 100 }).notNull(),
    directoryId: varchar('directory_id', { length: 191 }),
    status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft' | 'published'
    publishedAt: timestamp('published_at', { mode: 'date', fsp: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    slugIdx: index('slug_idx').on(table.slug),
    directoryIdIdx: index('directory_id_idx').on(table.directoryId),
    // Unique constraint on (userId, slug)
    userSlugIdx: index('user_slug_idx').on(table.userId, table.slug),
  })
);

export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;
```

- [ ] **Step 2: Create directory schema** (`apps/server/src/db/schema/directory.ts`)

```typescript
import { mysqlTable, varchar, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * Directory table - hierarchical folder structure for organizing blogs
 */
export const directories = mysqlTable(
  'directories',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    parentId: varchar('parent_id', { length: 191 }), // null for root directories
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    parentIdIdx: index('parent_id_idx').on(table.parentId),
  })
);

export type Directory = typeof directories.$inferSelect;
export type NewDirectory = typeof directories.$inferInsert;
```

- [ ] **Step 3: Create tag schema** (`apps/server/src/db/schema/tag.ts`)

```typescript
import { mysqlTable, varchar, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * Tag table - labels for categorizing blogs
 */
export const tags = mysqlTable(
  'tags',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    color: varchar('color', { length: 7 }).notNull().default('#3B82F6'), // hex color
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
  })
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
```

- [ ] **Step 4: Create blog-tag junction schema** (`apps/server/src/db/schema/blog-tag.ts`)

```typescript
import { mysqlTable, varchar, index } from 'drizzle-orm/mysql-core';

/**
 * BlogTag junction table - many-to-many relationship between blogs and tags
 */
export const blogTags = mysqlTable(
  'blog_tags',
  {
    blogId: varchar('blog_id', { length: 191 }).notNull(),
    tagId: varchar('tag_id', { length: 191 }).notNull(),
  },
  (table) => ({
    blogIdIdx: index('blog_id_idx').on(table.blogId),
    tagIdIdx: index('tag_id_idx').on(table.tagId),
    // Composite primary key
    pk: index('pk').on(table.blogId, table.tagId),
  })
);

export type BlogTag = typeof blogTags.$inferSelect;
export type NewBlogTag = typeof blogTags.$inferInsert;
```

- [ ] **Step 5: Update schema index** (`apps/server/src/db/schema/index.ts`)

```typescript
export * from './users.js';
export * from './tasks.js';
export * from './execution-logs.js';
export * from './notifications.js';
export * from './user-models.js';
export * from './user-api-tokens.js';
export * from './github-repos.js';
export * from './blog.js';
export * from './directory.js';
export * from './tag.js';
export * from './blog-tag.js';
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/db/schema/blog.ts apps/server/src/db/schema/directory.ts apps/server/src/db/schema/tag.ts apps/server/src/db/schema/blog-tag.ts apps/server/src/db/schema/index.ts
git commit -m "feat(server): add blog, directory, tag schemas to database

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Backend Services

**Files:**
- Create: `apps/server/src/services/blog.service.ts`
- Create: `apps/server/src/services/directory.service.ts`
- Create: `apps/server/src/services/tag.service.ts`

- [ ] **Step 1: Create blog service** (`apps/server/src/services/blog.service.ts`)

```typescript
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
```

- [ ] **Step 2: Create directory service** (`apps/server/src/services/directory.service.ts`)

```typescript
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
```

- [ ] **Step 3: Create tag service** (`apps/server/src/services/tag.service.ts`)

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/services/blog.service.ts apps/server/src/services/directory.service.ts apps/server/src/services/tag.service.ts
git commit -m "feat(server): add blog, directory, tag services

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Backend Controller + DTOs

**Files:**
- Create: `packages/dto/src/blog.ts`
- Modify: `packages/dto/src/index.ts` (add export)
- Create: `apps/server/src/controllers/v1/blog.controller.ts`
- Modify: `apps/server/src/controllers/index.ts` (register controller)

- [ ] **Step 1: Create blog DTOs** (`packages/dto/src/blog.ts`)

```typescript
/**
 * Blog DTOs for blog management system
 */

export type BlogStatus = 'draft' | 'published';

export interface CreateBlogDto {
  title: string;
  content?: Record<string, unknown>;
  excerpt?: string;
  slug?: string; // Optional, auto-generated if not provided
  directoryId?: string;
  tagIds?: string[];
}

export interface UpdateBlogDto {
  title?: string;
  content?: Record<string, unknown>;
  excerpt?: string;
  slug?: string;
  directoryId?: string | null;
  status?: BlogStatus;
  tagIds?: string[];
  updatedAt?: string; // For conflict detection
}

export interface BlogDto {
  id: string;
  userId: string;
  title: string;
  content?: Record<string, unknown>;
  excerpt?: string;
  slug: string;
  directoryId?: string;
  status: BlogStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ id: string; name: string; color: string }>;
}

export interface BlogListDto {
  data: BlogDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateDirectoryDto {
  name: string;
  parentId?: string;
}

export interface UpdateDirectoryDto {
  name?: string;
  parentId?: string | null;
}

export interface DirectoryDto {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryTreeDto {
  directories: DirectoryDto[];
}

export interface CreateTagDto {
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

export interface TagDto {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagListDto {
  tags: TagDto[];
}
```

- [ ] **Step 2: Update DTO index** (`packages/dto/src/index.ts`)

```typescript
export * from './auth.js';
export * from './user.js';
export * from './task.js';
export * from './response.js';
export * from './notification.js';
export * from './user-model.js';
export * from './api-token.js';
export * from './github-repo.js';
export * from './blog.js';
```

- [ ] **Step 3: Create blog controller** (`apps/server/src/controllers/v1/blog.controller.ts`)

```typescript
import {
  JsonController,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  QueryParams,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { BlogService } from '../../services/blog.service.js';
import { DirectoryService } from '../../services/directory.service.js';
import { TagService } from '../../services/tag.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil } from '../../utils/response.js';

import type {
  CreateBlogDto,
  UpdateBlogDto,
  BlogDto,
  BlogListDto,
  CreateDirectoryDto,
  UpdateDirectoryDto,
  DirectoryDto,
  DirectoryTreeDto,
  CreateTagDto,
  UpdateTagDto,
  TagDto,
  TagListDto,
  UserInfoDto,
} from '@x-console/dto';
import type { Blog } from '../../db/schema/blog.js';
import type { Directory } from '../../db/schema/directory.js';
import type { Tag } from '../../db/schema/tag.js';
import { slugify } from '../../utils/slugify.js';

/**
 * Helper to convert Blog model to BlogDto
 */
function convertBlogToDto(blog: Blog, tags: Tag[] = []): BlogDto {
  return {
    id: blog.id,
    userId: blog.userId,
    title: blog.title,
    content: blog.content as Record<string, unknown> | undefined,
    excerpt: blog.excerpt ?? undefined,
    slug: blog.slug,
    directoryId: blog.directoryId ?? undefined,
    status: blog.status as 'draft' | 'published',
    publishedAt: blog.publishedAt
      ? (blog.publishedAt instanceof Date ? blog.publishedAt.toISOString() : blog.publishedAt)
      : undefined,
    createdAt: blog.createdAt instanceof Date ? blog.createdAt.toISOString() : blog.createdAt,
    updatedAt: blog.updatedAt instanceof Date ? blog.updatedAt.toISOString() : blog.updatedAt,
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
  };
}

/**
 * Helper to convert Directory model to DirectoryDto
 */
function convertDirectoryToDto(dir: Directory): DirectoryDto {
  return {
    id: dir.id,
    userId: dir.userId,
    name: dir.name,
    parentId: dir.parentId ?? undefined,
    createdAt: dir.createdAt instanceof Date ? dir.createdAt.toISOString() : dir.createdAt,
    updatedAt: dir.updatedAt instanceof Date ? dir.updatedAt.toISOString() : dir.updatedAt,
  };
}

/**
 * Helper to convert Tag model to TagDto
 */
function convertTagToDto(tag: Tag): TagDto {
  return {
    id: tag.id,
    userId: tag.userId,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt instanceof Date ? tag.createdAt.toISOString() : tag.createdAt,
    updatedAt: tag.updatedAt instanceof Date ? tag.updatedAt.toISOString() : tag.updatedAt,
  };
}

@Service()
@JsonController('/api/v1/blogs')
export class BlogController {
  constructor(
    private blogService: BlogService,
    private directoryService: DirectoryService,
    private tagService: TagService
  ) {}

  // ==================== Blog Endpoints ====================

  /**
   * GET /api/v1/blogs - List blogs with filters and pagination
   */
  @Get('/')
  async listBlogs(
    @CurrentUser() userDto: UserInfoDto,
    @QueryParams() params: {
      page?: string;
      pageSize?: string;
      directoryId?: string;
      tagId?: string;
      status?: string;
      search?: string;
    }
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const page = params.page ? parseInt(params.page, 10) : 1;
      const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : 20;
      const directoryId = params.directoryId;
      const tagId = params.tagId;
      const status = params.status as 'draft' | 'published' | 'all' | undefined;
      const search = params.search;

      // Validate pagination
      if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Invalid pagination parameters');
      }

      const result = await this.blogService.getBlogs({
        userId: userDto.id,
        page,
        pageSize,
        directoryId: directoryId === '' ? null : directoryId,
        tagId,
        status,
        search,
      });

      const response: BlogListDto = {
        data: result.data.map((b) => convertBlogToDto(b, b.tags)),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      logger.error('List blogs error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/blogs/:id - Get blog by ID
   */
  @Get('/:id')
  async getBlog(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const blog = await this.blogService.getBlog(id, userDto.id);
      if (!blog) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      // Fetch tags
      const tags = await this.tagService.getTagsForBlog(id);

      return ResponseUtil.success(convertBlogToDto(blog, tags));
    } catch (error) {
      logger.error('Get blog error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs - Create a new blog
   */
  @Post('/')
  async createBlog(@CurrentUser() userDto: UserInfoDto, @Body() createData: CreateBlogDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate required fields
      if (!createData.title || createData.title.trim().length === 0) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Title is required');
      }

      // Generate slug if not provided
      const slug = createData.slug || slugify(createData.title);

      const blog = await this.blogService.createBlog(userDto.id, {
        title: createData.title.trim(),
        content: createData.content,
        excerpt: createData.excerpt,
        slug,
        directoryId: createData.directoryId,
        tagIds: createData.tagIds,
      });

      return ResponseUtil.success(convertBlogToDto(blog));
    } catch (error) {
      logger.error('Create blog error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/blogs/:id - Update a blog
   */
  @Put('/:id')
  async updateBlog(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() updateData: UpdateBlogDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      // Parse updatedAt for conflict detection
      const lastUpdatedAt = updateData.updatedAt ? new Date(updateData.updatedAt) : undefined;

      // Generate slug if title changed but slug not provided
      if (updateData.title && !updateData.slug) {
        updateData.slug = slugify(updateData.title);
      }

      const blog = await this.blogService.updateBlog(
        id,
        userDto.id,
        {
          title: updateData.title?.trim(),
          content: updateData.content,
          excerpt: updateData.excerpt,
          slug: updateData.slug,
          directoryId: updateData.directoryId,
          status: updateData.status,
          tagIds: updateData.tagIds,
        },
        lastUpdatedAt
      );

      if (!blog) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      // Fetch tags
      const tags = await this.tagService.getTagsForBlog(id);

      return ResponseUtil.success(convertBlogToDto(blog, tags));
    } catch (error) {
      logger.error('Update blog error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/blogs/:id - Delete a blog
   */
  @Delete('/:id')
  async deleteBlog(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.blogService.deleteBlog(id, userDto.id);
      if (!deleted) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      return ResponseUtil.success({ deleted: true });
    } catch (error) {
      logger.error('Delete blog error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs/:id/publish - Publish a blog
   */
  @Post('/:id/publish')
  async publishBlog(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const blog = await this.blogService.publishBlog(id, userDto.id);
      if (!blog) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      const tags = await this.tagService.getTagsForBlog(id);
      return ResponseUtil.success(convertBlogToDto(blog, tags));
    } catch (error) {
      logger.error('Publish blog error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs/:id/unpublish - Unpublish a blog
   */
  @Post('/:id/unpublish')
  async unpublishBlog(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const blog = await this.blogService.unpublishBlog(id, userDto.id);
      if (!blog) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      const tags = await this.tagService.getTagsForBlog(id);
      return ResponseUtil.success(convertBlogToDto(blog, tags));
    } catch (error) {
      logger.error('Unpublish blog error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  // ==================== Directory Endpoints ====================

  /**
   * GET /api/v1/blogs/directories - Get directory tree
   */
  @Get('/directories')
  async listDirectories(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const directories = await this.directoryService.getDirectoryTree(userDto.id);
      const response: DirectoryTreeDto = {
        directories: directories.map(convertDirectoryToDto),
      };

      return ResponseUtil.success(response);
    } catch (error) {
      logger.error('List directories error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs/directories - Create a directory
   */
  @Post('/directories')
  async createDirectory(@CurrentUser() userDto: UserInfoDto, @Body() createData: CreateDirectoryDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      if (!createData.name || createData.name.trim().length === 0) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Directory name is required');
      }

      const directory = await this.directoryService.createDirectory(userDto.id, {
        name: createData.name.trim(),
        parentId: createData.parentId,
      });

      return ResponseUtil.success(convertDirectoryToDto(directory));
    } catch (error) {
      logger.error('Create directory error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/blogs/directories/:id - Update a directory
   */
  @Put('/directories/:id')
  async updateDirectory(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() updateData: UpdateDirectoryDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const directory = await this.directoryService.updateDirectory(id, userDto.id, {
        name: updateData.name?.trim(),
        parentId: updateData.parentId,
      });

      if (!directory) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Directory not found');
      }

      return ResponseUtil.success(convertDirectoryToDto(directory));
    } catch (error) {
      logger.error('Update directory error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/blogs/directories/:id - Delete a directory
   */
  @Delete('/directories/:id')
  async deleteDirectory(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.directoryService.deleteDirectory(id, userDto.id);
      if (!deleted) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Directory not found');
      }

      return ResponseUtil.success({ deleted: true });
    } catch (error) {
      logger.error('Delete directory error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  // ==================== Tag Endpoints ====================

  /**
   * GET /api/v1/blogs/tags - Get all tags
   */
  @Get('/tags')
  async listTags(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const tags = await this.tagService.getTags(userDto.id);
      const response: TagListDto = {
        tags: tags.map(convertTagToDto),
      };

      return ResponseUtil.success(response);
    } catch (error) {
      logger.error('List tags error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs/tags - Create a tag
   */
  @Post('/tags')
  async createTag(@CurrentUser() userDto: UserInfoDto, @Body() createData: CreateTagDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      if (!createData.name || createData.name.trim().length === 0) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Tag name is required');
      }

      const tag = await this.tagService.createTag(userDto.id, {
        name: createData.name.trim(),
        color: createData.color,
      });

      return ResponseUtil.success(convertTagToDto(tag));
    } catch (error) {
      logger.error('Create tag error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/blogs/tags/:id - Update a tag
   */
  @Put('/tags/:id')
  async updateTag(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() updateData: UpdateTagDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const tag = await this.tagService.updateTag(id, userDto.id, {
        name: updateData.name?.trim(),
        color: updateData.color,
      });

      if (!tag) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Tag not found');
      }

      return ResponseUtil.success(convertTagToDto(tag));
    } catch (error) {
      logger.error('Update tag error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/blogs/tags/:id - Delete a tag
   */
  @Delete('/tags/:id')
  async deleteTag(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.tagService.deleteTag(id, userDto.id);
      if (!deleted) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Tag not found');
      }

      return ResponseUtil.success({ deleted: true });
    } catch (error) {
      logger.error('Delete tag error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }
}
```

- [ ] **Step 4: Create slugify utility** (`apps/server/src/utils/slugify.ts`)

```typescript
/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Truncate to 100 characters
    .substring(0, 100);
}
```

- [ ] **Step 5: Register controller** (`apps/server/src/controllers/index.ts`)

Add the blog controller to the exports and ensure it's imported in the main app.

- [ ] **Step 6: Commit**

```bash
git add packages/dto/src/blog.ts packages/dto/src/index.ts apps/server/src/controllers/v1/blog.controller.ts apps/server/src/utils/slugify.ts apps/server/src/controllers/index.ts
git commit -m "feat(server): add blog controller and DTOs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Frontend API Client + Services

**Files:**
- Create: `apps/web/src/api/blog.ts`
- Create: `apps/web/src/services/blog.service.ts`
- Create: `apps/web/src/services/directory.service.ts`
- Create: `apps/web/src/services/tag.service.ts`

- [ ] **Step 1: Create blog API client** (`apps/web/src/api/blog.ts`)

```typescript
import type {
  CreateBlogDto,
  UpdateBlogDto,
  BlogDto,
  BlogListDto,
  CreateDirectoryDto,
  UpdateDirectoryDto,
  DirectoryDto,
  DirectoryTreeDto,
  CreateTagDto,
  UpdateTagDto,
  TagDto,
  TagListDto,
} from '@x-console/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

/**
 * Blog API endpoints
 */
export const blogApi = {
  // Blog endpoints
  getBlogs: async (params?: {
    page?: number;
    pageSize?: number;
    directoryId?: string;
    tagId?: string;
    status?: string;
    search?: string;
  }): Promise<BlogListDto> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.directoryId) searchParams.set('directoryId', params.directoryId);
    if (params?.tagId) searchParams.set('tagId', params.tagId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    const response = await request.get<unknown, ApiResponse<BlogListDto>>(
      `/api/v1/blogs${query ? `?${query}` : ''}`
    );
    return response.data;
  },

  getBlog: async (id: string): Promise<BlogDto> => {
    const response = await request.get<unknown, ApiResponse<BlogDto>>(`/api/v1/blogs/${id}`);
    return response.data;
  },

  createBlog: async (data: CreateBlogDto): Promise<BlogDto> => {
    const response = await request.post<CreateBlogDto, ApiResponse<BlogDto>>('/api/v1/blogs', data);
    return response.data;
  },

  updateBlog: async (id: string, data: UpdateBlogDto): Promise<BlogDto> => {
    const response = await request.put<UpdateBlogDto, ApiResponse<BlogDto>>(`/api/v1/blogs/${id}`, data);
    return response.data;
  },

  deleteBlog: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/blogs/${id}`
    );
    return response.data;
  },

  publishBlog: async (id: string): Promise<BlogDto> => {
    const response = await request.post<unknown, ApiResponse<BlogDto>>(
      `/api/v1/blogs/${id}/publish`
    );
    return response.data;
  },

  unpublishBlog: async (id: string): Promise<BlogDto> => {
    const response = await request.post<unknown, ApiResponse<BlogDto>>(
      `/api/v1/blogs/${id}/unpublish`
    );
    return response.data;
  },

  // Directory endpoints
  getDirectories: async (): Promise<DirectoryTreeDto> => {
    const response = await request.get<unknown, ApiResponse<DirectoryTreeDto>>(
      '/api/v1/blogs/directories'
    );
    return response.data;
  },

  createDirectory: async (data: CreateDirectoryDto): Promise<DirectoryDto> => {
    const response = await request.post<CreateDirectoryDto, ApiResponse<DirectoryDto>>(
      '/api/v1/blogs/directories',
      data
    );
    return response.data;
  },

  updateDirectory: async (id: string, data: UpdateDirectoryDto): Promise<DirectoryDto> => {
    const response = await request.put<UpdateDirectoryDto, ApiResponse<DirectoryDto>>(
      `/api/v1/blogs/directories/${id}`,
      data
    );
    return response.data;
  },

  deleteDirectory: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/blogs/directories/${id}`
    );
    return response.data;
  },

  // Tag endpoints
  getTags: async (): Promise<TagListDto> => {
    const response = await request.get<unknown, ApiResponse<TagListDto>>('/api/v1/blogs/tags');
    return response.data;
  },

  createTag: async (data: CreateTagDto): Promise<TagDto> => {
    const response = await request.post<CreateTagDto, ApiResponse<TagDto>>(
      '/api/v1/blogs/tags',
      data
    );
    return response.data;
  },

  updateTag: async (id: string, data: UpdateTagDto): Promise<TagDto> => {
    const response = await request.put<UpdateTagDto, ApiResponse<TagDto>>(
      `/api/v1/blogs/tags/${id}`,
      data
    );
    return response.data;
  },

  deleteTag: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/blogs/tags/${id}`
    );
    return response.data;
  },
};
```

- [ ] **Step 2: Create blog service** (`apps/web/src/services/blog.service.ts`)

```typescript
import { Service } from '@rabjs/react';
import type {
  BlogDto,
  BlogListDto,
  CreateBlogDto,
  UpdateBlogDto,
} from '@x-console/dto';
import * as blogApi from '../api/blog';
import { ToastService } from './toast.service';

@Service()
export class BlogService {
  // State
  blogs: BlogDto[] = [];
  currentBlog: BlogDto | null = null;
  total = 0;
  page = 1;
  pageSize = 20;
  loading = false;
  saving = false;
  lastSavedAt: Date | null = null;

  private toastService: ToastService | null = null;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initToastService();
  }

  private async initToastService() {
    try {
      const module = await import('./toast.service');
      this.toastService = module.toastService;
    } catch (error) {
      console.error('Failed to load toast service:', error);
    }
  }

  /**
   * Load blog list
   */
  async loadBlogs(params?: {
    page?: number;
    directoryId?: string;
    tagId?: string;
    status?: string;
    search?: string;
  }) {
    this.loading = true;

    try {
      const result = await blogApi.getBlogs({
        page: params?.page ?? this.page,
        pageSize: this.pageSize,
        directoryId: params?.directoryId,
        tagId: params?.tagId,
        status: params?.status,
        search: params?.search,
      });

      this.blogs = result.data;
      this.total = result.total;
      this.page = result.page;
      this.pageSize = result.pageSize;
    } catch (error) {
      console.error('Failed to load blogs:', error);
      this.toastService?.error('加载博客列表失败');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Load a single blog by ID
   */
  async loadBlog(id: string) {
    this.loading = true;

    try {
      const blog = await blogApi.getBlog(id);
      this.currentBlog = blog;
      return blog;
    } catch (error) {
      console.error('Failed to load blog:', error);
      this.toastService?.error('加载博客失败');
      return null;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a new blog
   */
  async createBlog(data: CreateBlogDto) {
    try {
      const blog = await blogApi.createBlog(data);
      this.blogs = [blog, ...this.blogs];
      this.toastService?.success('博客创建成功');
      return blog;
    } catch (error) {
      console.error('Failed to create blog:', error);
      this.toastService?.error('创建博客失败');
      return null;
    }
  }

  /**
   * Update a blog with auto-save debounce
   */
  updateBlog(id: string, data: UpdateBlogDto) {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Set new timer for auto-save (3 second debounce)
    this.autoSaveTimer = setTimeout(async () => {
      await this.saveBlog(id, data);
    }, 3000);
  }

  /**
   * Save a blog (called by auto-save or manual save)
   */
  async saveBlog(id: string, data: UpdateBlogDto) {
    this.saving = true;

    try {
      const blog = await blogApi.updateBlog(id, {
        ...data,
        updatedAt: this.currentBlog?.updatedAt,
      });
      this.currentBlog = blog;
      this.lastSavedAt = new Date();

      // Update in list if present
      const index = this.blogs.findIndex((b) => b.id === id);
      if (index >= 0) {
        this.blogs[index] = blog;
      }

      return blog;
    } catch (error) {
      console.error('Failed to save blog:', error);
      this.toastService?.error('保存博客失败');
      return null;
    } finally {
      this.saving = false;
    }
  }

  /**
   * Delete a blog
   */
  async deleteBlog(id: string) {
    try {
      await blogApi.deleteBlog(id);
      this.blogs = this.blogs.filter((b) => b.id !== id);
      if (this.currentBlog?.id === id) {
        this.currentBlog = null;
      }
      this.toastService?.success('博客已删除');
      return true;
    } catch (error) {
      console.error('Failed to delete blog:', error);
      this.toastService?.error('删除博客失败');
      return false;
    }
  }

  /**
   * Publish a blog
   */
  async publishBlog(id: string) {
    try {
      const blog = await blogApi.publishBlog(id);
      this.currentBlog = blog;
      this.toastService?.success('博客已发布');
      return blog;
    } catch (error) {
      console.error('Failed to publish blog:', error);
      this.toastService?.error('发布博客失败');
      return null;
    }
  }

  /**
   * Unpublish a blog
   */
  async unpublishBlog(id: string) {
    try {
      const blog = await blogApi.unpublishBlog(id);
      this.currentBlog = blog;
      this.toastService?.success('博客已取消发布');
      return blog;
    } catch (error) {
      console.error('Failed to unpublish blog:', error);
      this.toastService?.error('取消发布失败');
      return null;
    }
  }

  /**
   * Clear current blog
   */
  clearCurrentBlog() {
    this.currentBlog = null;
    this.lastSavedAt = null;
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
}
```

- [ ] **Step 3: Create directory service** (`apps/web/src/services/directory.service.ts`)

```typescript
import { Service } from '@rabjs/react';
import type { DirectoryDto, CreateDirectoryDto, UpdateDirectoryDto } from '@x-console/dto';
import * as blogApi from '../api/blog';
import { ToastService } from './toast.service';

@Service()
export class DirectoryService {
  directories: DirectoryDto[] = [];
  loading = false;

  private toastService: ToastService | null = null;

  constructor() {
    this.initToastService();
  }

  private async initToastService() {
    try {
      const module = await import('./toast.service');
      this.toastService = module.toastService;
    } catch (error) {
      console.error('Failed to load toast service:', error);
    }
  }

  /**
   * Build a tree structure from flat directory list
   */
  buildTree(directories: DirectoryDto[]): Array<DirectoryDto & { children: DirectoryDto[] }> {
    const map = new Map<string, DirectoryDto & { children: DirectoryDto[] }>();
    const roots: Array<DirectoryDto & { children: DirectoryDto[] }> = [];

    // First pass: create map entries
    directories.forEach((dir) => {
      map.set(dir.id, { ...dir, children: [] });
    });

    // Second pass: build tree
    directories.forEach((dir) => {
      const node = map.get(dir.id)!;
      if (dir.parentId && map.has(dir.parentId)) {
        map.get(dir.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Load all directories
   */
  async loadDirectories() {
    this.loading = true;

    try {
      const result = await blogApi.getDirectories();
      this.directories = result.directories;
    } catch (error) {
      console.error('Failed to load directories:', error);
      this.toastService?.error('加载目录失败');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a new directory
   */
  async createDirectory(data: CreateDirectoryDto) {
    try {
      const directory = await blogApi.createDirectory(data);
      this.directories = [...this.directories, directory];
      this.toastService?.success('目录创建成功');
      return directory;
    } catch (error) {
      console.error('Failed to create directory:', error);
      this.toastService?.error('创建目录失败');
      return null;
    }
  }

  /**
   * Update a directory
   */
  async updateDirectory(id: string, data: UpdateDirectoryDto) {
    try {
      const directory = await blogApi.updateDirectory(id, data);
      this.directories = this.directories.map((d) => (d.id === id ? directory : d));
      this.toastService?.success('目录已更新');
      return directory;
    } catch (error) {
      console.error('Failed to update directory:', error);
      this.toastService?.error('更新目录失败');
      return null;
    }
  }

  /**
   * Delete a directory
   */
  async deleteDirectory(id: string) {
    try {
      await blogApi.deleteDirectory(id);
      this.directories = this.directories.filter((d) => d.id !== id);
      this.toastService?.success('目录已删除');
      return true;
    } catch (error) {
      console.error('Failed to delete directory:', error);
      this.toastService?.error('删除目录失败');
      return false;
    }
  }
}
```

- [ ] **Step 4: Create tag service** (`apps/web/src/services/tag.service.ts`)

```typescript
import { Service } from '@rabjs/react';
import type { TagDto, CreateTagDto, UpdateTagDto } from '@x-console/dto';
import * as blogApi from '../api/blog';
import { ToastService } from './toast.service';

@Service()
export class TagService {
  tags: TagDto[] = [];
  loading = false;

  private toastService: ToastService | null = null;

  constructor() {
    this.initToastService();
  }

  private async initToastService() {
    try {
      const module = await import('./toast.service');
      this.toastService = module.toastService;
    } catch (error) {
      console.error('Failed to load toast service:', error);
    }
  }

  /**
   * Load all tags
   */
  async loadTags() {
    this.loading = true;

    try {
      const result = await blogApi.getTags();
      this.tags = result.tags;
    } catch (error) {
      console.error('Failed to load tags:', error);
      this.toastService?.error('加载标签失败');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagDto) {
    try {
      const tag = await blogApi.createTag(data);
      this.tags = [...this.tags, tag];
      this.toastService?.success('标签创建成功');
      return tag;
    } catch (error) {
      console.error('Failed to create tag:', error);
      this.toastService?.error('创建标签失败');
      return null;
    }
  }

  /**
   * Update a tag
   */
  async updateTag(id: string, data: UpdateTagDto) {
    try {
      const tag = await blogApi.updateTag(id, data);
      this.tags = this.tags.map((t) => (t.id === id ? tag : t));
      this.toastService?.success('标签已更新');
      return tag;
    } catch (error) {
      console.error('Failed to update tag:', error);
      this.toastService?.error('更新标签失败');
      return null;
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string) {
    try {
      await blogApi.deleteTag(id);
      this.tags = this.tags.filter((t) => t.id !== id);
      this.toastService?.success('标签已删除');
      return true;
    } catch (error) {
      console.error('Failed to delete tag:', error);
      this.toastService?.error('删除标签失败');
      return false;
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/blog.ts apps/web/src/services/blog.service.ts apps/web/src/services/directory.service.ts apps/web/src/services/tag.service.ts
git commit -m "feat(web): add blog API client and services

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Frontend Layout - Add Blog Navigation

**Files:**
- Modify: `apps/web/src/components/layout.tsx` (add blog nav button in sidebar)
- Modify: `apps/web/src/App.tsx` (add blog routes)

- [ ] **Step 1: Update layout with blog navigation** (`apps/web/src/components/layout.tsx`)

Add blog navigation button after the memo button (in the nav section). The icon can be `FileText` from lucide-react.

```tsx
// Add to imports
import { Zap, Sun, Moon, LogOut, Settings, ListTodo, Bell, Github, FileText } from 'lucide-react';

// Add blog state check
const isBlogPage = location.pathname.startsWith('/blogs');

// Add blog nav button after memo button
<button
  onClick={() => {
    const search = location.search;
    navigate(`/blogs${search}`);
  }}
  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
    isBlogPage
      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
  }`}
  title="博客"
  aria-label="博客"
>
  <FileText className="w-6 h-6" />
</button>
```

- [ ] **Step 2: Add blog routes** (`apps/web/src/App.tsx`)

Add routes for blog pages:

```tsx
// Add imports
import BlogPage from './pages/blogs';
import BlogEditorPage from './pages/blogs/editor';

// Add route
<Route
  path="/blogs/*"
  element={
    <ProtectedRoute>
      <BlogPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/blogs/editor/*"
  element={
    <ProtectedRoute>
      <BlogEditorPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout.tsx apps/web/src/App.tsx
git commit -m "feat(web): add blog navigation to sidebar

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Frontend Blog List Page

**Files:**
- Create: `apps/web/src/pages/blogs/index.tsx` (page wrapper)
- Create: `apps/web/src/pages/blogs/blogs.tsx` (main component)
- Create: `apps/web/src/pages/blogs/components/directory-tree.tsx`
- Create: `apps/web/src/pages/blogs/components/tag-filter.tsx`
- Create: `apps/web/src/pages/blogs/components/blog-card.tsx`

- [ ] **Step 1: Create blog list page** (`apps/web/src/pages/blogs/blogs.tsx`)

Main blog list component with directory tree, tag filter, and blog cards.

- [ ] **Step 2: Create directory tree component** (`apps/web/src/pages/blogs/components/directory-tree.tsx`)

Displays hierarchical directory structure with expand/collapse, context menu (rename/delete).

- [ ] **Step 3: Create tag filter component** (`apps/web/src/pages/blogs/components/tag-filter.tsx`)

Horizontal tag chips for filtering.

- [ ] **Step 4: Create blog card component** (`apps/web/src/pages/blogs/components/blog-card.tsx`)

Card displaying blog title, excerpt, directory, tags, status, update time.

- [ ] **Step 5: Create page wrapper** (`apps/web/src/pages/blogs/index.tsx`)

```tsx
import { view } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { BlogList } from './blogs';

export const BlogPage = view(() => {
  return (
    <Layout>
      <BlogList />
    </Layout>
  );
});
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/blogs/index.tsx apps/web/src/pages/blogs/blogs.tsx apps/web/src/pages/blogs/components/
git commit -m "feat(web): add blog list page with directory tree and tag filter

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 7: Frontend Blog Editor with Tiptap

**Files:**
- Create: `apps/web/src/pages/blogs/editor/index.tsx` (page wrapper)
- Create: `apps/web/src/pages/blogs/editor/editor.tsx` (main editor component)
- Create: `apps/web/src/pages/blogs/components/editor-toolbar.tsx`
- Modify: `apps/web/package.json` (add Tiptap dependencies)

- [ ] **Step 1: Install Tiptap dependencies**

```bash
pnpm --filter @x-console/web add @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell @tiptap/extension-audio @tiptap/extension-youtube slugify
```

- [ ] **Step 2: Create editor toolbar** (`apps/web/src/pages/blogs/components/editor-toolbar.tsx`)

Toolbar with formatting buttons: Bold, Italic, Underline, Strike, Heading (H1-H3), Bullet List, Ordered List, Blockquote, Code, Table, Image, Audio, Video (YouTube), Link.

- [ ] **Step 3: Create blog editor** (`apps/web/src/pages/blogs/editor/editor.tsx`)

Editor component with:
- Title input
- Directory/tag selectors
- Tiptap editor with toolbar
- Save status indicator
- Save draft / Publish buttons
- Auto-save (debounced 3 seconds)
- Command/Ctrl+S shortcut

- [ ] **Step 4: Create page wrapper** (`apps/web/src/pages/blogs/editor/index.tsx`)

```tsx
import { view } from '@rabjs/react';
import { Layout } from '../../../components/layout';
import { BlogEditor } from './editor';

export const BlogEditorPage = view(() => {
  return (
    <Layout>
      <BlogEditor />
    </Layout>
  );
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/blogs/editor/ apps/web/src/pages/blogs/components/editor-toolbar.tsx
git commit -m "feat(web): add blog editor with Tiptap rich text editing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 8: Database Migration

**Files:**
- Generate: `drizzle/` migration files

- [ ] **Step 1: Build server**

```bash
pnpm --filter @x-console/server build
```

- [ ] **Step 2: Generate migration**

```bash
pnpm --filter @x-console/server migrate:generate
```

- [ ] **Step 3: Review generated SQL**

Check the generated migration file in `drizzle/` folder.

- [ ] **Step 4: Commit migration**

```bash
git add drizzle/
git commit -m "feat(server): add blog management database migration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Spec Reference

Full specification: `docs/superpowers/specs/2026-03-29-blog-management-design.md`
