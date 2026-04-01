import { mysqlTable, varchar, text, timestamp, index, json } from 'drizzle-orm/mysql-core';
import { users } from './users.js';
import { directories } from './directory.js';

/**
 * Blog table - stores blog posts with Tiptap JSON content
 */
export const blogs = mysqlTable(
  'blogs',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: json('content').$type<Record<string, unknown>>(),
    excerpt: text('excerpt'),
    slug: varchar('slug', { length: 100 }).notNull(),
    directoryId: varchar('directory_id', { length: 191 }).references(() => directories.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft' | 'published'
    publishedAt: timestamp('published_at', { mode: 'date', fsp: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // NEW COLUMNS:
    contentSnapshot: text('content_snapshot'),
    lastSnapshotAt: timestamp('last_snapshot_at', { mode: 'date', fsp: 3 }),
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
