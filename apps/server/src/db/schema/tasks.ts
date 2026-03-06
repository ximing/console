import {
  mysqlTable,
  varchar,
  timestamp,
  index,
  boolean,
  json,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';

/**
 * Tasks table - stores task orchestration configurations
 */
export const tasks = mysqlTable(
  'tasks',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    triggerType: mysqlEnum('trigger_type', ['manual', 'scheduled']).notNull().default('manual'),
    cronExpression: varchar('cron_expression', { length: 100 }),
    enabled: boolean('enabled').notNull().default(true),
    actionId: varchar('action_id', { length: 100 }).notNull(),
    actionConfig: json('action_config'),
    createdBy: varchar('created_by', { length: 191 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    createdByIdx: index('tasks_created_by_idx').on(table.createdBy),
    enabledIdx: index('tasks_enabled_idx').on(table.enabled),
  })
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
