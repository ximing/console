import { mysqlTable, varchar, text, timestamp, index } from 'drizzle-orm/mysql-core';
import { users } from './users.js';

/**
 * App table - stores app entities owned by users
 */
export const apps = mysqlTable(
  'apps',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
  })
);

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
