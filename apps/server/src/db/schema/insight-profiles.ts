import { mysqlTable, varchar, int, json, timestamp, index, text } from 'drizzle-orm/mysql-core';

export interface PillarDetail {
  shishen_gan?: string;
  shishen_gan_sub?: string;
  canggan?: { gan: string; shishen: string }[];
  nayin?: string;
  shenshas?: string[];
  xiyun?: string;
  zizuo?: string;
  kongwang?: string;
}

export const insightProfiles = mysqlTable(
  'insight_profiles',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    yearGan: varchar('year_gan', { length: 4 }).notNull().default(''),
    yearZhi: varchar('year_zhi', { length: 4 }).notNull().default(''),
    monthGan: varchar('month_gan', { length: 4 }).notNull().default(''),
    monthZhi: varchar('month_zhi', { length: 4 }).notNull().default(''),
    dayGan: varchar('day_gan', { length: 4 }).notNull().default(''),
    dayZhi: varchar('day_zhi', { length: 4 }).notNull().default(''),
    hourGan: varchar('hour_gan', { length: 4 }).notNull().default(''),
    hourZhi: varchar('hour_zhi', { length: 4 }).notNull().default(''),
    yearDetail: json('year_detail').$type<PillarDetail>(),
    monthDetail: json('month_detail').$type<PillarDetail>(),
    dayDetail: json('day_detail').$type<PillarDetail>(),
    hourDetail: json('hour_detail').$type<PillarDetail>(),
    shenshas: json('shenshas').$type<string[]>(),
    birthYear: int('birth_year').notNull().default(1990),
    birthDate: varchar('birth_date', { length: 10 }),
    birthTime: varchar('birth_time', { length: 8 }),
    customAspects: json('custom_aspects').$type<string[]>(),
    macroAnalysis: text('macro_analysis'),  // 新增
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('insight_profiles_user_id_idx').on(table.userId),
  })
);

export type InsightProfile = typeof insightProfiles.$inferSelect;
export type NewInsightProfile = typeof insightProfiles.$inferInsert;
