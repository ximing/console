import { mysqlTable, varchar, text, timestamp, int, index } from 'drizzle-orm/mysql-core';

/**
 * Blog comments - one-level threading: replies hang on top-level comments via parentId.
 */
export const blogComments = mysqlTable(
  'blog_comments',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    postPath: varchar('post_path', { length: 191 }).notNull(),
    visitorId: varchar('visitor_id', { length: 32 }).notNull(),
    parentId: varchar('parent_id', { length: 32 }),
    content: text('content').notNull(),
    status: varchar('status', { length: 16 }).notNull().default('visible'), // visible | deleted
    likeCount: int('like_count').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    postPathIdx: index('post_path_idx').on(table.postPath),
    visitorIdx: index('visitor_id_idx').on(table.visitorId),
  })
);

export type BlogComment = typeof blogComments.$inferSelect;
export type NewBlogComment = typeof blogComments.$inferInsert;
