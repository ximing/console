import { mysqlTable, varchar, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * Directory table - hierarchical folder structure for organizing blogs
 */
export const directories = mysqlTable(
  'directories',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    parentId: varchar('parent_id', { length: 191 }).references(() => directories.id, { onDelete: 'cascade' }), // null for root directories
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    parentIdIdx: index('parent_id_idx').on(table.parentId),
  })
);

export type Directory = typeof directories.$inferSelect;
export type NewDirectory = typeof directories.$inferInsert;
