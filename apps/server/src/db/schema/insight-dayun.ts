import { mysqlTable, varchar, int, timestamp, index } from 'drizzle-orm/mysql-core';
import { insightProfiles } from './insight-profiles.js';

export const insightDayun = mysqlTable(
  'insight_dayun',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    profileId: varchar('profile_id', { length: 191 })
      .notNull()
      .references(() => insightProfiles.id, { onDelete: 'cascade' }),
    gan: varchar('gan', { length: 4 }).notNull(),
    zhi: varchar('zhi', { length: 4 }).notNull(),
    startYear: int('start_year').notNull(),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    profileIdIdx: index('insight_dayun_profile_id_idx').on(table.profileId),
  })
);

export type InsightDayun = typeof insightDayun.$inferSelect;
export type NewInsightDayun = typeof insightDayun.$inferInsert;
