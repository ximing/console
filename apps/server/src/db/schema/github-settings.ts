import { mysqlTable, varchar, text, timestamp } from 'drizzle-orm/mysql-core';

/**
 * GitHub settings table - stores user's global GitHub PAT
 */
export const githubSettings = mysqlTable('github_settings', {
  id: varchar('id', { length: 32 }).primaryKey(),
  userId: varchar('user_id', { length: 32 }).notNull(),
  encryptedPat: text('encrypted_pat').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type GithubSettings = typeof githubSettings.$inferSelect;
export type NewGithubSettings = typeof githubSettings.$inferInsert;
