import { mysqlTable, varchar, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * User API tokens table - stores user's API tokens for external access
 */
export const userApiTokens = mysqlTable(
  'user_api_tokens',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(), // SHA-256 hash
    prefix: varchar('prefix', { length: 20 }).notNull(), // Display prefix (e.g., "aik_xxx")
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date', fsp: 3 }), // Optional expiration
    lastUsedAt: timestamp('last_used_at', { mode: 'date', fsp: 3 }), // Last time token was used
  },
  (table) => ({
    userIdIdx: index('user_api_tokens_user_id_idx').on(table.userId),
  })
);

export type UserApiToken = typeof userApiTokens.$inferSelect;
export type NewUserApiToken = typeof userApiTokens.$inferInsert;
