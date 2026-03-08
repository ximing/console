import {
  mysqlTable,
  varchar,
  timestamp,
  index,
  foreignKey,
} from 'drizzle-orm/mysql-core';

import { users } from './users.js';

/**
 * GitHub repositories table - stores user's GitHub repository configurations
 */
export const githubRepos = mysqlTable(
  'github_repos',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    pat: varchar('pat', { length: 500 }).notNull(), // AES-256-GCM encrypted
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('github_repos_user_id_idx').on(table.userId),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'github_repos_user_id_fk',
    }).onDelete('cascade'),
  })
);

export type GithubRepo = typeof githubRepos.$inferSelect;
export type NewGithubRepo = typeof githubRepos.$inferInsert;
