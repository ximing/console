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
