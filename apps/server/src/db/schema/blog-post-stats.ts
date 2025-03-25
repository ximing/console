import { mysqlTable, varchar, timestamp, int } from 'drizzle-orm/mysql-core';

/**
 * Blog post stats - denormalized counters, lazily created on first access.
 */
export const blogPostStats = mysqlTable('blog_post_stats', {
  postPath: varchar('post_path', { length: 191 }).primaryKey(),
  viewCount: int('view_count').notNull().default(0),
  likeCount: int('like_count').notNull().default(0),
  commentCount: int('comment_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type BlogPostStats = typeof blogPostStats.$inferSelect;
export type NewBlogPostStats = typeof blogPostStats.$inferInsert;
