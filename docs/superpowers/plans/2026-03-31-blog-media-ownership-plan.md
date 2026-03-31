# Blog Media Ownership Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `blog_media` table to track media ownership, enabling proper authorization for blog media URLs.

**Architecture:** Add a `blog_media` table linking S3 paths to blogs. Upload requires blogId and validates ownership. URL access checks blog status (published = public, draft = owner only).

**Tech Stack:** Drizzle ORM, MySQL, S3, TypeScript

---

## Chunk 1: Database Schema

### Task 1: Create blog-media schema

**Files:**
- Create: `apps/server/src/db/schema/blog-media.ts`
- Modify: `apps/server/src/db/schema/index.ts:1-17`

- [ ] **Step 1: Create blog-media.ts schema**

```typescript
// apps/server/src/db/schema/blog-media.ts
import { mysqlTable, varchar, int, timestamp, index } from 'drizzle-orm/mysql-core';
import { blogs } from './blog.js';

export const blogMedia = mysqlTable(
  'blog_media',
  {
    id: varchar('id', { length: 24 }).primaryKey().notNull(),
    blogId: varchar('blog_id', { length: 191 })
      .notNull()
      .references(() => blogs.id, { onDelete: 'cascade' }),
    path: varchar('path', { length: 500 }).notNull(),
    filename: varchar('filename', { length: 255 }).notNull(),
    size: int('size').notNull(),
    type: varchar('type', { length: 20 }).notNull(), // 'image' | 'audio' | 'video'
    width: int('width'),
    height: int('height'),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    blogIdIdx: index('blog_id_idx').on(table.blogId),
    pathIdx: index('path_idx').on(table.path),
  })
);

export type BlogMedia = typeof blogMedia.$inferSelect;
export type NewBlogMedia = typeof blogMedia.$inferInsert;
```

- [ ] **Step 2: Update schema/index.ts to export blog-media**

Add after line 13:
```typescript
export * from './blog-media.js';
```

- [ ] **Step 3: Generate migration**

Run: `pnpm build && pnpm --filter @x-console/server migrate:generate -- --name add_blog_media_table`
Expected: Migration file created in `apps/server/drizzle/` folder

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/db/schema/blog-media.ts apps/server/src/db/schema/index.ts apps/server/drizzle/
git commit -m "feat(server): add blog_media table for media ownership tracking"
```

---

## Chunk 2: Controller Changes

### Task 2: Update BlogMediaController

**Files:**
- Modify: `apps/server/src/controllers/v1/blog-media.controller.ts:1-179`

- [ ] **Step 1: Add imports for blog_media, BlogService, eq, and generateId**

Add after existing imports (line 22):
```typescript
import { blogMedia } from '../../db/schema/blog-media.js';
import { blogs } from '../../db/schema/blog.js';
import { BlogService } from '../../services/blog.service.js';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../../db/connection.js';
```

- [ ] **Step 2: Update controller constructor and add BlogService**

Change constructor (line 45):
```typescript
constructor(
  private storageService: StorageService,
  private blogService: BlogService
) {}
```

- [ ] **Step 3: Update uploadMedia to accept blogId and insert record**

Change uploadMedia method signature (after line 48):
```typescript
async uploadMedia(
  @CurrentUser() userDto: UserInfoDto,
  @UploadedFile('file', { options: upload }) file: Express.Multer.File,
  @QueryParams() params: { blogId: string }
)
```

Add blogId validation after line 55:
```typescript
// Validate blogId and check ownership
const blog = await this.blogService.getBlog(params.blogId, userDto.id);
if (!blog) {
  return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found or access denied');
}
```

Change S3 path to include blogId (replace lines 97-102):
```typescript
// Generate unique filename with original extension
const ext = path.extname(file.originalname);
const filename = `${nanoid()}${ext}`;
const objectName = `${userDto.id}/${params.blogId}/${filename}`;

// Upload to S3 using StorageService
const s3Path = await this.storageService.uploadFile(
  file.buffer,
  objectName,
  file.mimetype
);
```

Add database insertion after S3 upload (after line 116):
```typescript
// Insert media record
const db = getDatabase();
await db.insert(blogMedia).values({
  id: `m${nanoid(22)}`,
  blogId: params.blogId,
  path: s3Path,
  filename: file.originalname,
  size: file.size,
  type: mediaType,
  width: width,
  height: height,
});
```

- [ ] **Step 4: Update getMediaUrl authorization logic**

Replace lines 155-168 (the old path-based check) with:

```typescript
// Get blogId from path: {userId}/{blogId}/{filename}
const pathParts = params.path.split('/');
if (!pathParts || pathParts.length < 3) {
  return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Invalid path format');
}

// blogId is the second part of the path
const blogIdFromPath = pathParts[1];

// Query blog_media to get the blogId
const db = getDatabase();
const mediaResults = await db
  .select()
  .from(blogMedia)
  .where(eq(blogMedia.path, params.path))
  .limit(1);

if (mediaResults.length === 0) {
  return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Media not found');
}

const media = mediaResults[0];

// Query the blog to check status and ownership
const blogResults = await db
  .select()
  .from(blogs)
  .where(eq(blogs.id, media.blogId))
  .limit(1);

if (blogResults.length === 0) {
  return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
}

const blog = blogResults[0];

// If blog is published, allow access without auth check
if (blog.status === 'published') {
  // OK - public access
} else {
  // For drafts, check ownership
  if (blog.userId !== userDto.id) {
    return ResponseUtility.error(ErrorCode.FORBIDDEN, 'Access denied');
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/controllers/v1/blog-media.controller.ts
git commit -m "feat(server): add blog ownership tracking to media upload and URL access"
```

---

## Chunk 3: Verify and Test

- [ ] **Step 1: Build and check for errors**

Run: `pnpm build`
Expected: No TypeScript errors

- [ ] **Step 2: Apply migration**

Run: `pnpm --filter @x-console/server migrate`
Expected: Migration applied successfully

- [ ] **Step 3: Commit migration**

```bash
git add apps/server/drizzle/
git commit -m "chore(server): apply blog_media migration"
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-03-31-blog-media-ownership-plan.md`. Ready to execute?**
