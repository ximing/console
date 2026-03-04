import {
  mysqlTable,
  varchar,
  timestamp,
  index,
  mysqlEnum,
  json,
  foreignKey,
} from 'drizzle-orm/mysql-core';

import { tasks } from './tasks.js';

/**
 * Execution logs table - stores task execution history
 */
export const executionLogs = mysqlTable(
  'execution_logs',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    taskId: varchar('task_id', { length: 191 }).notNull(),
    status: mysqlEnum('status', ['success', 'failed']).notNull().default('failed'),
    startedAt: timestamp('started_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { mode: 'date', fsp: 3 }),
    errorMessage: varchar('error_message', { length: 2000 }),
    errorType: varchar('error_type', { length: 100 }),
    result: json('result'),
  },
  (table) => ({
    taskIdIdx: index('execution_logs_task_id_idx').on(table.taskId),
    taskIdFk: foreignKey({
      columns: [table.taskId],
      foreignColumns: [tasks.id],
      name: 'execution_logs_task_id_fk',
    }).onDelete('cascade'),
    startedAtIdx: index('execution_logs_started_at_idx').on(table.startedAt),
  })
);

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;
