import { mysqlTable, varchar, text, timestamp, index, boolean } from 'drizzle-orm/mysql-core';
import { apps } from './app.js';

/**
 * AppVersion table - stores version entries belonging to apps
 */
export const appVersions = mysqlTable(
  'app_versions',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    appId: varchar('app_id', { length: 191 })
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    version: varchar('version', { length: 50 }).notNull(), // e.g., "1.0.0"
    buildNumber: varchar('build_number', { length: 50 }),
    changelog: text('changelog'),
    androidUrl: varchar('android_url', { length: 500 }),
    iosUrl: varchar('ios_url', { length: 500 }),
    isLatest: boolean('is_latest').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    appIdIdx: index('app_id_idx').on(table.appId),
  })
);

export type AppVersion = typeof appVersions.$inferSelect;
export type NewAppVersion = typeof appVersions.$inferInsert;
