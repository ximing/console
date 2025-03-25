import { mysqlTable, varchar, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * Blog visitors - GitHub OAuth users of the public blog (ximing.ren).
 * Independent from console `users` table.
 */
export const blogVisitors = mysqlTable(
  'blog_visitors',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    githubId: varchar('github_id', { length: 32 }).notNull().unique(),
    login: varchar('login', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    status: varchar('status', { length: 16 }).notNull().default('active'), // active | blocked
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    loginIdx: index('login_idx').on(table.login),
  })
);

export type BlogVisitor = typeof blogVisitors.$inferSelect;
export type NewBlogVisitor = typeof blogVisitors.$inferInsert;
