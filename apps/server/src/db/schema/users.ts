import { mysqlTable, varchar, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * Users table - minimal auth boilerplate
 * Essential fields only: id, email, password, username, avatar, timestamps
 */
export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    username: varchar('username', { length: 100 }).notNull(),
    avatar: varchar('avatar', { length: 500 }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: index('email_idx').on(table.email),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
