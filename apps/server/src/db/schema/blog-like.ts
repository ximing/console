import { mysqlTable, varchar, timestamp, uniqueIndex } from 'drizzle-orm/mysql-core';

/**
 * Blog likes - logged-in visitors dedupe by visitorId, anonymous by anonKey (sha256 of ip+ua+salt).
 * MySQL unique indexes allow multiple NULLs, so the two partial actors don't collide.
 */
export const blogLikes = mysqlTable(
  'blog_likes',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    targetType: varchar('target_type', { length: 16 }).notNull(), // post | comment
    targetId: varchar('target_id', { length: 191 }).notNull(), // postPath or commentId
    visitorId: varchar('visitor_id', { length: 32 }),
    anonKey: varchar('anon_key', { length: 64 }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    visitorLikeIdx: uniqueIndex('visitor_like_idx').on(table.targetType, table.targetId, table.visitorId),
    anonLikeIdx: uniqueIndex('anon_like_idx').on(table.targetType, table.targetId, table.anonKey),
  })
);

export type BlogLike = typeof blogLikes.$inferSelect;
export type NewBlogLike = typeof blogLikes.$inferInsert;
