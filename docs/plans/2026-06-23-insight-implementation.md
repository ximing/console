# 不惑（Insight）Tab 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增「不惑/Insight」侧边栏 Tab，支持多命主档案（八字+大运）持久化，自动计算流年/流月/流日，生成格式化 Prompt 供用户复制到 ChatGPT。

**Architecture:** 纯前端计算 + 后端 CRUD。`lunar-javascript` 库做干支计算，Prompt 在前端组装，后端只提供档案/大运的增删改查 REST API。

**Tech Stack:** 后端：Drizzle ORM (MySQL) + TypeDI + routing-controllers；前端：@rabjs/react Service + lunar-javascript + React + Tailwind CSS v4

---

## Task 1：安装 lunar-javascript 前端依赖

**Files:**
- Modify: `apps/web/package.json`

**Step 1: 安装依赖**

```bash
cd apps/web && pnpm add lunar-javascript
```

**Step 2: 验证安装**

```bash
cd apps/web && node -e "const { Lunar } = require('lunar-javascript'); const d = Lunar.fromDate(new Date()); console.log(d.getYearInGanZhi());"
```

Expected: 打印当前年份干支，如 `丙午`

**Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add lunar-javascript dependency"
```

---

## Task 2：DB Schema — insight_profiles 表

**Files:**
- Create: `apps/server/src/db/schema/insight-profiles.ts`
- Modify: `apps/server/src/db/schema/index.ts`

**Step 1: 创建 schema 文件**

```typescript
// apps/server/src/db/schema/insight-profiles.ts
import { mysqlTable, varchar, int, json, timestamp, index } from 'drizzle-orm/mysql-core';

export interface PillarDetail {
  shishen_gan?: string;
  shishen_gan_sub?: string;
  canggan?: { gan: string; shishen: string }[];
  nayin?: string;
  shenshas?: string[];
}

export const insightProfiles = mysqlTable(
  'insight_profiles',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    // 八字天干地支独立字段（用于后续五行流通计算）
    yearGan: varchar('year_gan', { length: 4 }).notNull().default(''),
    yearZhi: varchar('year_zhi', { length: 4 }).notNull().default(''),
    monthGan: varchar('month_gan', { length: 4 }).notNull().default(''),
    monthZhi: varchar('month_zhi', { length: 4 }).notNull().default(''),
    dayGan: varchar('day_gan', { length: 4 }).notNull().default(''),
    dayZhi: varchar('day_zhi', { length: 4 }).notNull().default(''),
    hourGan: varchar('hour_gan', { length: 4 }).notNull().default(''),
    hourZhi: varchar('hour_zhi', { length: 4 }).notNull().default(''),
    // 每柱复合数据（十神/藏干/纳音/神煞）
    yearDetail: json('year_detail').$type<PillarDetail>(),
    monthDetail: json('month_detail').$type<PillarDetail>(),
    dayDetail: json('day_detail').$type<PillarDetail>(),
    hourDetail: json('hour_detail').$type<PillarDetail>(),
    // 全局神煞（跨柱）
    shenshas: json('shenshas').$type<string[]>(),
    // 出生公历年份（用于大运归属判断）
    birthYear: int('birth_year').notNull().default(1990),
    // 用户自定义分析方向
    customAspects: json('custom_aspects').$type<string[]>(),
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
```

**Step 2: 在 index.ts 中导出**

在 `apps/server/src/db/schema/index.ts` 末尾追加：

```typescript
export * from './insight-profiles.js';
export * from './insight-dayun.js';
```

**Step 3: Commit（暂不 build，等 Task 3 完成后一起）**

---

## Task 3：DB Schema — insight_dayun 表

**Files:**
- Create: `apps/server/src/db/schema/insight-dayun.ts`

**Step 1: 创建 schema 文件**

```typescript
// apps/server/src/db/schema/insight-dayun.ts
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
```

**Step 2: Build 并生成 migration**

```bash
cd /path/to/repo
pnpm --filter @x-console/server build
pnpm --filter @x-console/server migrate:generate
```

Expected: 在 `apps/server/drizzle/` 下生成包含 CREATE TABLE 的 SQL 文件

**Step 3: 检查生成的 SQL**

```bash
ls apps/server/drizzle/ | tail -3
cat apps/server/drizzle/<latest-migration-file>.sql
```

确认包含 `insight_profiles` 和 `insight_dayun` 两张表的 CREATE TABLE 语句。

**Step 4: Commit**

```bash
git add apps/server/src/db/schema/insight-profiles.ts \
        apps/server/src/db/schema/insight-dayun.ts \
        apps/server/src/db/schema/index.ts \
        apps/server/drizzle/
git commit -m "feat(server): add insight_profiles and insight_dayun db schemas"
```

---

## Task 4：Server — InsightService

**Files:**
- Create: `apps/server/src/services/insight.service.ts`

**Step 1: 创建 service**

```typescript
// apps/server/src/services/insight.service.ts
import { Service } from 'typedi';
import { eq, and, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getDatabase } from '../db/connection.js';
import { insightProfiles, insightDayun } from '../db/schema/index.js';
import type { InsightProfile, NewInsightProfile, PillarDetail } from '../db/schema/insight-profiles.js';
import type { InsightDayun } from '../db/schema/insight-dayun.js';

export interface CreateProfileInput {
  name: string;
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
  hourGan: string;
  hourZhi: string;
  yearDetail?: PillarDetail;
  monthDetail?: PillarDetail;
  dayDetail?: PillarDetail;
  hourDetail?: PillarDetail;
  shenshas?: string[];
  birthYear: number;
  customAspects?: string[];
  sortOrder?: number;
}

export interface DayunInput {
  gan: string;
  zhi: string;
  startYear: number;
  sortOrder: number;
}

export interface ProfileWithDayun extends InsightProfile {
  dayunList: InsightDayun[];
}

@Service()
export class InsightService {
  private get db() {
    return getDatabase();
  }

  async getProfilesByUser(userId: string): Promise<ProfileWithDayun[]> {
    const profiles = await this.db
      .select()
      .from(insightProfiles)
      .where(eq(insightProfiles.userId, userId))
      .orderBy(asc(insightProfiles.sortOrder), asc(insightProfiles.createdAt));

    const result: ProfileWithDayun[] = [];
    for (const profile of profiles) {
      const dayunList = await this.db
        .select()
        .from(insightDayun)
        .where(eq(insightDayun.profileId, profile.id))
        .orderBy(asc(insightDayun.sortOrder));
      result.push({ ...profile, dayunList });
    }
    return result;
  }

  async createProfile(userId: string, input: CreateProfileInput): Promise<ProfileWithDayun> {
    const id = randomUUID();
    const now = new Date();
    await this.db.insert(insightProfiles).values({
      id,
      userId,
      name: input.name,
      yearGan: input.yearGan,
      yearZhi: input.yearZhi,
      monthGan: input.monthGan,
      monthZhi: input.monthZhi,
      dayGan: input.dayGan,
      dayZhi: input.dayZhi,
      hourGan: input.hourGan,
      hourZhi: input.hourZhi,
      yearDetail: input.yearDetail ?? null,
      monthDetail: input.monthDetail ?? null,
      dayDetail: input.dayDetail ?? null,
      hourDetail: input.hourDetail ?? null,
      shenshas: input.shenshas ?? null,
      birthYear: input.birthYear,
      customAspects: input.customAspects ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
    const [created] = await this.db
      .select()
      .from(insightProfiles)
      .where(eq(insightProfiles.id, id));
    return { ...created, dayunList: [] };
  }

  async updateProfile(
    id: string,
    userId: string,
    input: Partial<CreateProfileInput>
  ): Promise<ProfileWithDayun | null> {
    const [existing] = await this.db
      .select()
      .from(insightProfiles)
      .where(and(eq(insightProfiles.id, id), eq(insightProfiles.userId, userId)));
    if (!existing) return null;

    await this.db
      .update(insightProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(insightProfiles.id, id), eq(insightProfiles.userId, userId)));

    const [updated] = await this.db
      .select()
      .from(insightProfiles)
      .where(eq(insightProfiles.id, id));
    const dayunList = await this.db
      .select()
      .from(insightDayun)
      .where(eq(insightDayun.profileId, id))
      .orderBy(asc(insightDayun.sortOrder));
    return { ...updated, dayunList };
  }

  async deleteProfile(id: string, userId: string): Promise<boolean> {
    const [existing] = await this.db
      .select()
      .from(insightProfiles)
      .where(and(eq(insightProfiles.id, id), eq(insightProfiles.userId, userId)));
    if (!existing) return false;
    // cascade delete handles dayun rows
    await this.db.delete(insightProfiles).where(eq(insightProfiles.id, id));
    return true;
  }

  async replaceDayun(profileId: string, userId: string, items: DayunInput[]): Promise<InsightDayun[]> {
    // Verify ownership
    const [profile] = await this.db
      .select()
      .from(insightProfiles)
      .where(and(eq(insightProfiles.id, profileId), eq(insightProfiles.userId, userId)));
    if (!profile) return [];

    // Delete existing
    await this.db.delete(insightDayun).where(eq(insightDayun.profileId, profileId));

    if (items.length === 0) return [];

    // Insert new
    const now = new Date();
    await this.db.insert(insightDayun).values(
      items.map((item) => ({
        id: randomUUID(),
        profileId,
        gan: item.gan,
        zhi: item.zhi,
        startYear: item.startYear,
        sortOrder: item.sortOrder,
        createdAt: now,
      }))
    );

    return this.db
      .select()
      .from(insightDayun)
      .where(eq(insightDayun.profileId, profileId))
      .orderBy(asc(insightDayun.sortOrder));
  }
}
```

**Step 2: Commit**

```bash
git add apps/server/src/services/insight.service.ts
git commit -m "feat(server): add InsightService for profile and dayun CRUD"
```

---

## Task 5：Server — InsightController

**Files:**
- Create: `apps/server/src/controllers/v1/insight.controller.ts`

**Step 1: 创建 controller**

```typescript
// apps/server/src/controllers/v1/insight.controller.ts
import {
  JsonController, Get, Post, Put, Delete,
  Body, Param, CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';
import { ErrorCode } from '../../constants/error-codes.js';
import { InsightService } from '../../services/insight.service.js';
import type { CreateProfileInput, DayunInput } from '../../services/insight.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import type { UserInfoDto } from '@x-console/dto';

@Service()
@JsonController('/api/v1/insight')
export class InsightController {
  constructor(private insightService: InsightService) {}

  @Get('/profiles')
  async listProfiles(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.id) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const profiles = await this.insightService.getProfilesByUser(user.id);
      return ResponseUtil.success({ profiles });
    } catch (err) {
      logger.error('insight listProfiles error:', err);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/profiles')
  async createProfile(@CurrentUser() user: UserInfoDto, @Body() body: CreateProfileInput) {
    try {
      if (!user?.id) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      if (!body.name?.trim()) return ResponseUtil.error(ErrorCode.PARAMS_ERROR, '命主名称不能为空');
      const profile = await this.insightService.createProfile(user.id, body);
      return ResponseUtil.success(profile);
    } catch (err) {
      logger.error('insight createProfile error:', err);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Put('/profiles/:id')
  async updateProfile(
    @CurrentUser() user: UserInfoDto,
    @Param('id') id: string,
    @Body() body: Partial<CreateProfileInput>
  ) {
    try {
      if (!user?.id) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const profile = await this.insightService.updateProfile(id, user.id, body);
      if (!profile) return ResponseUtil.error(ErrorCode.NOT_FOUND, '档案不存在');
      return ResponseUtil.success(profile);
    } catch (err) {
      logger.error('insight updateProfile error:', err);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Delete('/profiles/:id')
  async deleteProfile(@CurrentUser() user: UserInfoDto, @Param('id') id: string) {
    try {
      if (!user?.id) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const deleted = await this.insightService.deleteProfile(id, user.id);
      if (!deleted) return ResponseUtil.error(ErrorCode.NOT_FOUND, '档案不存在');
      return ResponseUtil.success({ deleted: true });
    } catch (err) {
      logger.error('insight deleteProfile error:', err);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/profiles/:profileId/dayun')
  async replaceDayun(
    @CurrentUser() user: UserInfoDto,
    @Param('profileId') profileId: string,
    @Body() body: { dayunList: DayunInput[] }
  ) {
    try {
      if (!user?.id) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const dayunList = await this.insightService.replaceDayun(
        profileId,
        user.id,
        body.dayunList ?? []
      );
      return ResponseUtil.success({ dayunList });
    } catch (err) {
      logger.error('insight replaceDayun error:', err);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }
}
```

**Step 2: Build server 验证无编译错误**

```bash
pnpm --filter @x-console/server build
```

Expected: 无 TypeScript 错误，build 成功

**Step 3: Commit**

```bash
git add apps/server/src/controllers/v1/insight.controller.ts
git commit -m "feat(server): add InsightController with profile and dayun endpoints"
```

---

## Task 6：Frontend API — insight.ts

**Files:**
- Create: `apps/web/src/api/insight.ts`

**Step 1: 创建 API 文件**

```typescript
// apps/web/src/api/insight.ts
import request from '../utils/request';

export interface PillarDetail {
  shishen_gan?: string;
  shishen_gan_sub?: string;
  canggan?: { gan: string; shishen: string }[];
  nayin?: string;
  shenshas?: string[];
}

export interface DayunDto {
  id: string;
  profileId: string;
  gan: string;
  zhi: string;
  startYear: number;
  sortOrder: number;
}

export interface InsightProfileDto {
  id: string;
  userId: string;
  name: string;
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
  hourGan: string;
  hourZhi: string;
  yearDetail: PillarDetail | null;
  monthDetail: PillarDetail | null;
  dayDetail: PillarDetail | null;
  hourDetail: PillarDetail | null;
  shenshas: string[] | null;
  birthYear: number;
  customAspects: string[] | null;
  sortOrder: number;
  dayunList: DayunDto[];
  createdAt: string;
  updatedAt: string;
}

export type CreateProfileInput = Omit<InsightProfileDto, 'id' | 'userId' | 'dayunList' | 'createdAt' | 'updatedAt'>;

export interface DayunInput {
  gan: string;
  zhi: string;
  startYear: number;
  sortOrder: number;
}

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

export const insightApi = {
  getProfiles: async (): Promise<InsightProfileDto[]> => {
    const res = await request.get<unknown, ApiResponse<{ profiles: InsightProfileDto[] }>>(
      '/api/v1/insight/profiles'
    );
    return res.data.profiles;
  },

  createProfile: async (data: CreateProfileInput): Promise<InsightProfileDto> => {
    const res = await request.post<CreateProfileInput, ApiResponse<InsightProfileDto>>(
      '/api/v1/insight/profiles',
      data
    );
    return res.data;
  },

  updateProfile: async (id: string, data: Partial<CreateProfileInput>): Promise<InsightProfileDto> => {
    const res = await request.put<Partial<CreateProfileInput>, ApiResponse<InsightProfileDto>>(
      `/api/v1/insight/profiles/${id}`,
      data
    );
    return res.data;
  },

  deleteProfile: async (id: string): Promise<void> => {
    await request.delete(`/api/v1/insight/profiles/${id}`);
  },

  replaceDayun: async (profileId: string, dayunList: DayunInput[]): Promise<DayunDto[]> => {
    const res = await request.post<{ dayunList: DayunInput[] }, ApiResponse<{ dayunList: DayunDto[] }>>(
      `/api/v1/insight/profiles/${profileId}/dayun`,
      { dayunList }
    );
    return res.data.dayunList;
  },
};
```

**Step 2: Commit**

```bash
git add apps/web/src/api/insight.ts
git commit -m "feat(web): add insight API client"
```

---

## Task 7：Frontend Utils — ganzhi.ts

流年/流月/流日干支计算工具。

**Files:**
- Create: `apps/web/src/pages/insight/utils/ganzhi.ts`

**Step 1: 创建工具文件**

```typescript
// apps/web/src/pages/insight/utils/ganzhi.ts
// @ts-expect-error - lunar-javascript has no type declarations
import { Lunar } from 'lunar-javascript';

export type TimePeriod =
  | 'today'
  | 'tomorrow'
  | 'day-after-tomorrow'
  | 'next-week'
  | 'next-month'
  | 'next-3-months'
  | 'next-6-months'
  | 'next-year';

export interface DayGanzhi {
  date: string;       // YYYY-MM-DD
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
}

function getDateGanzhi(date: Date): DayGanzhi {
  const lunar = Lunar.fromDate(date);
  const yearGanZhi = lunar.getYearInGanZhi() as string;
  const monthGanZhi = lunar.getMonthInGanZhi() as string;
  const dayGanZhi = lunar.getDayInGanZhi() as string;

  const fmt = (s: string) => ({ gan: s[0], zhi: s.slice(1) });
  const y = fmt(yearGanZhi);
  const m = fmt(monthGanZhi);
  const d = fmt(dayGanZhi);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return {
    date: dateStr,
    yearGan: y.gan,
    yearZhi: y.zhi,
    monthGan: m.gan,
    monthZhi: m.zhi,
    dayGan: d.gan,
    dayZhi: d.zhi,
  };
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

// Returns unique months (by yearGan+yearZhi+monthGan+monthZhi) in the range
function getMonthsInRange(start: Date, end: Date): DayGanzhi[] {
  const seen = new Set<string>();
  const result: DayGanzhi[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const g = getDateGanzhi(cur);
    const key = `${g.yearGan}${g.yearZhi}-${g.monthGan}${g.monthZhi}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(g);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export function getGanzhiForPeriod(period: TimePeriod): DayGanzhi[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      return [getDateGanzhi(today)];
    case 'tomorrow':
      return [getDateGanzhi(addDays(today, 1))];
    case 'day-after-tomorrow':
      return [getDateGanzhi(addDays(today, 2))];
    case 'next-week': {
      const days: DayGanzhi[] = [];
      for (let i = 0; i < 7; i++) days.push(getDateGanzhi(addDays(today, i)));
      return days;
    }
    case 'next-month':
      return getMonthsInRange(today, addMonths(today, 1));
    case 'next-3-months':
      return getMonthsInRange(today, addMonths(today, 3));
    case 'next-6-months':
      return getMonthsInRange(today, addMonths(today, 6));
    case 'next-year':
      return getMonthsInRange(today, addMonths(today, 12));
    default:
      return [getDateGanzhi(today)];
  }
}

export function getCurrentDayun(
  dayunList: { gan: string; zhi: string; startYear: number; sortOrder: number }[]
): { gan: string; zhi: string; startYear: number } | null {
  if (!dayunList.length) return null;
  const sorted = [...dayunList].sort((a, b) => a.startYear - b.startYear);
  const currentYear = new Date().getFullYear();
  let current = sorted[0];
  for (const d of sorted) {
    if (d.startYear <= currentYear) current = d;
    else break;
  }
  return current;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/pages/insight/utils/ganzhi.ts
git commit -m "feat(web): add ganzhi calculation utility for insight"
```

---

## Task 8：Frontend Utils — prompt-builder.ts

Prompt 组装逻辑。

**Files:**
- Create: `apps/web/src/pages/insight/utils/prompt-builder.ts`

**Step 1: 创建工具文件**

```typescript
// apps/web/src/pages/insight/utils/prompt-builder.ts
import type { InsightProfileDto } from '../../../api/insight';
import type { TimePeriod, DayGanzhi } from './ganzhi';
import { getGanzhiForPeriod, getCurrentDayun } from './ganzhi';

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  'today': '今天',
  'tomorrow': '明天',
  'day-after-tomorrow': '后天',
  'next-week': '未来一周',
  'next-month': '未来一个月',
  'next-3-months': '未来三个月',
  'next-6-months': '未来半年',
  'next-year': '未来一年',
};

export const PRESET_ASPECTS = [
  '事业', '财富', '感情婚姻', '健康', '学业',
  '家庭', '子女', '父母', '出行', '贵人',
  '官非诉讼', '住宅置业', '名誉声望',
];

const SHORT_PERIODS: TimePeriod[] = ['today', 'tomorrow', 'day-after-tomorrow'];
const WEEK_PERIOD: TimePeriod = 'next-week';

function formatDay(g: DayGanzhi): string {
  return `流年：天干 ${g.yearGan}，地支 ${g.yearZhi}\n流月：天干 ${g.monthGan}，地支 ${g.monthZhi}\n流日：天干 ${g.dayGan}，地支 ${g.dayZhi}`;
}

function formatWeek(days: DayGanzhi[]): string {
  const header = `流年：天干 ${days[0].yearGan}，地支 ${days[0].yearZhi}\n流月：天干 ${days[0].monthGan}，地支 ${days[0].monthZhi}`;
  const dayLines = days
    .map((d) => `  ${d.date}  流日：天干 ${d.dayGan}，地支 ${d.dayZhi}`)
    .join('\n');
  return `${header}\n未来七日流日：\n${dayLines}`;
}

function formatMonths(months: DayGanzhi[]): string {
  const lines = months.map(
    (m) => `  ${m.date.slice(0, 7)}  流年：天干 ${m.yearGan}，地支 ${m.yearZhi}  流月：天干 ${m.monthGan}，地支 ${m.monthZhi}`
  );
  return lines.join('\n');
}

export function buildPrompt(
  profile: InsightProfileDto,
  period: TimePeriod,
  aspects: string[]
): string {
  const dayun = getCurrentDayun(profile.dayunList);
  const ganzhiList = getGanzhiForPeriod(period);
  const periodLabel = TIME_PERIOD_LABELS[period];

  // 时间背景部分
  let timeSection: string;
  if (SHORT_PERIODS.includes(period)) {
    timeSection = formatDay(ganzhiList[0]);
  } else if (period === WEEK_PERIOD) {
    timeSection = formatWeek(ganzhiList);
  } else {
    timeSection = formatMonths(ganzhiList);
  }

  const dayunLine = dayun
    ? `当前大运：天干 ${dayun.gan}，地支 ${dayun.zhi}（${dayun.startYear}年起）`
    : '当前大运：未录入';

  const aspectLine = aspects.length > 0 ? aspects.join('、') : '综合运势';

  return `【命主信息】
八字：
  天干：${profile.yearGan}  ${profile.monthGan}  ${profile.dayGan}  ${profile.hourGan}
  地支：${profile.yearZhi}  ${profile.monthZhi}  ${profile.dayZhi}  ${profile.hourZhi}
${dayunLine}

【时间背景 - ${periodLabel}】
${timeSection}

【分析请求】
请结合八字原局、当前大运、流年流月流日，重点从以下方面进行详细分析和建议：
${aspectLine}

时间范围：${periodLabel}
请给出具体、有操作性的分析和行动建议。`;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/pages/insight/utils/prompt-builder.ts
git commit -m "feat(web): add prompt builder utility for insight"
```

---

## Task 9：Frontend Service — InsightService

**Files:**
- Create: `apps/web/src/pages/insight/insight.service.ts`

**Step 1: 创建 service**

```typescript
// apps/web/src/pages/insight/insight.service.ts
import { Service } from '@rabjs/react';
import { insightApi } from '../../api/insight';
import type { InsightProfileDto, CreateProfileInput, DayunInput } from '../../api/insight';

export class InsightService extends Service {
  profiles: InsightProfileDto[] = [];
  selectedProfileId: string | null = null;
  isLoading = false;
  error: string | null = null;

  get selectedProfile(): InsightProfileDto | null {
    return this.profiles.find((p) => p.id === this.selectedProfileId) ?? null;
  }

  async loadProfiles(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      this.profiles = await insightApi.getProfiles();
      if (this.profiles.length > 0 && !this.selectedProfileId) {
        this.selectedProfileId = this.profiles[0].id;
      }
    } catch {
      this.error = '加载档案失败';
    } finally {
      this.isLoading = false;
    }
  }

  selectProfile(id: string): void {
    this.selectedProfileId = id;
  }

  async createProfile(data: CreateProfileInput): Promise<InsightProfileDto | null> {
    try {
      const profile = await insightApi.createProfile(data);
      this.profiles = [...this.profiles, profile];
      this.selectedProfileId = profile.id;
      return profile;
    } catch {
      this.error = '创建档案失败';
      return null;
    }
  }

  async updateProfile(id: string, data: Partial<CreateProfileInput>): Promise<boolean> {
    try {
      const updated = await insightApi.updateProfile(id, data);
      this.profiles = this.profiles.map((p) => (p.id === id ? updated : p));
      return true;
    } catch {
      this.error = '更新档案失败';
      return false;
    }
  }

  async deleteProfile(id: string): Promise<boolean> {
    try {
      await insightApi.deleteProfile(id);
      this.profiles = this.profiles.filter((p) => p.id !== id);
      if (this.selectedProfileId === id) {
        this.selectedProfileId = this.profiles[0]?.id ?? null;
      }
      return true;
    } catch {
      this.error = '删除档案失败';
      return false;
    }
  }

  async saveDayun(profileId: string, dayunList: DayunInput[]): Promise<boolean> {
    try {
      const updated = await insightApi.replaceDayun(profileId, dayunList);
      this.profiles = this.profiles.map((p) =>
        p.id === profileId ? { ...p, dayunList: updated } : p
      );
      return true;
    } catch {
      this.error = '保存大运失败';
      return false;
    }
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/src/pages/insight/insight.service.ts
git commit -m "feat(web): add InsightService"
```

---

## Task 10：Frontend Components — BaziDisplay

八字 2×4 格展示组件（天干行 + 地支行）。

**Files:**
- Create: `apps/web/src/pages/insight/components/bazi-display/bazi-display.tsx`
- Create: `apps/web/src/pages/insight/components/bazi-display/index.ts`

**Step 1: 创建组件**

```tsx
// apps/web/src/pages/insight/components/bazi-display/bazi-display.tsx
interface BaziDisplayProps {
  yearGan: string; yearZhi: string;
  monthGan: string; monthZhi: string;
  dayGan: string; dayZhi: string;
  hourGan: string; hourZhi: string;
}

const LABELS = ['年', '月', '日', '时'];

export function BaziDisplay({
  yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi,
}: BaziDisplayProps) {
  const gans = [yearGan, monthGan, dayGan, hourGan];
  const zhis = [yearZhi, monthZhi, dayZhi, hourZhi];

  return (
    <div className="rounded-xl bg-gray-50 dark:bg-zinc-800/50 p-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        {LABELS.map((label, i) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-xs text-gray-400 dark:text-zinc-500">{label}</span>
            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
              {gans[i] || '—'}
            </span>
            <span className="text-lg font-semibold text-gray-700 dark:text-zinc-300">
              {zhis[i] || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```typescript
// apps/web/src/pages/insight/components/bazi-display/index.ts
export { BaziDisplay } from './bazi-display';
```

**Step 2: Commit**

```bash
git add apps/web/src/pages/insight/components/bazi-display/
git commit -m "feat(web): add BaziDisplay component"
```

---

## Task 11：Frontend Components — ProfileList

左栏命主档案列表。

**Files:**
- Create: `apps/web/src/pages/insight/components/profile-list/profile-card.tsx`
- Create: `apps/web/src/pages/insight/components/profile-list/profile-list.tsx`
- Create: `apps/web/src/pages/insight/components/profile-list/index.ts`

**Step 1: profile-card.tsx**

```tsx
// apps/web/src/pages/insight/components/profile-list/profile-card.tsx
import type { InsightProfileDto } from '../../../../api/insight';

interface ProfileCardProps {
  profile: InsightProfileDto;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProfileCard({ profile, selected, onClick, onEdit, onDelete }: ProfileCardProps) {
  const preview = `${profile.yearGan}${profile.yearZhi} ${profile.monthGan}${profile.monthZhi} ${profile.dayGan}${profile.dayZhi} ${profile.hourGan}${profile.hourZhi}`;

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-150 ${
        selected
          ? 'bg-green-50/60 dark:bg-green-900/15 text-green-600 dark:text-green-400'
          : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${selected ? 'text-green-600 dark:text-green-400' : ''}`}>
          {profile.name}
        </span>
        <div className="hidden group-hover:flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 px-1"
          >
            编辑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs text-red-400 hover:text-red-600 px-1"
          >
            删除
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 font-mono">{preview}</p>
    </div>
  );
}
```

**Step 2: profile-list.tsx**

```tsx
// apps/web/src/pages/insight/components/profile-list/profile-list.tsx
import { Plus } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import { InsightService } from '../../insight.service';
import { ProfileCard } from './profile-card';
import type { InsightProfileDto } from '../../../../api/insight';

interface ProfileListProps {
  onAdd: () => void;
  onEdit: (profile: InsightProfileDto) => void;
}

export const ProfileList = view(({ onAdd, onEdit }: ProfileListProps) => {
  const service = useService(InsightService);

  const handleDelete = async (id: string) => {
    if (window.confirm('确认删除该命主档案？')) {
      await service.deleteProfile(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">命主档案</h2>
        <button
          onClick={onAdd}
          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-150"
          title="新建档案"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {service.isLoading && (
          <p className="text-xs text-gray-400 px-2 py-4 text-center">加载中…</p>
        )}
        {!service.isLoading && service.profiles.length === 0 && (
          <p className="text-xs text-gray-400 px-2 py-8 text-center">
            暂无档案，点击 + 新建
          </p>
        )}
        {service.profiles.map((p) => (
          <ProfileCard
            key={p.id}
            profile={p}
            selected={p.id === service.selectedProfileId}
            onClick={() => service.selectProfile(p.id)}
            onEdit={() => onEdit(p)}
            onDelete={() => handleDelete(p.id)}
          />
        ))}
      </div>
    </div>
  );
});
```

```typescript
// apps/web/src/pages/insight/components/profile-list/index.ts
export { ProfileList } from './profile-list';
```

**Step 3: Commit**

```bash
git add apps/web/src/pages/insight/components/profile-list/
git commit -m "feat(web): add ProfileList component"
```

---

## Task 12：Frontend Components — ProfileForm（档案编辑弹窗含大运编辑器）

**Files:**
- Create: `apps/web/src/pages/insight/components/profile-form/dayun-editor.tsx`
- Create: `apps/web/src/pages/insight/components/profile-form/profile-form.tsx`
- Create: `apps/web/src/pages/insight/components/profile-form/index.ts`

**Step 1: dayun-editor.tsx**

```tsx
// apps/web/src/pages/insight/components/profile-form/dayun-editor.tsx
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DayunInput } from '../../../../api/insight';

interface DayunEditorProps {
  value: DayunInput[];
  onChange: (list: DayunInput[]) => void;
}

const emptyEntry = (): DayunInput => ({ gan: '', zhi: '', startYear: new Date().getFullYear(), sortOrder: 0 });

export function DayunEditor({ value, onChange }: DayunEditorProps) {
  const update = (index: number, field: keyof DayunInput, val: string | number) => {
    const next = value.map((item, i) =>
      i === index ? { ...item, [field]: val } : item
    );
    onChange(next.map((item, i) => ({ ...item, sortOrder: i })));
  };

  const add = () => onChange([...value, { ...emptyEntry(), sortOrder: value.length }]);
  const remove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(next.map((item, i) => ({ ...item, sortOrder: i })));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">大运列表（按顺序录入）</span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:opacity-80"
        >
          <Plus className="w-3 h-3" /> 添加
        </button>
      </div>
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
          <input
            className="w-10 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm px-2 py-1 text-center"
            placeholder="干"
            value={item.gan}
            onChange={(e) => update(i, 'gan', e.target.value)}
            maxLength={2}
          />
          <input
            className="w-10 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm px-2 py-1 text-center"
            placeholder="支"
            value={item.zhi}
            onChange={(e) => update(i, 'zhi', e.target.value)}
            maxLength={2}
          />
          <input
            type="number"
            className="w-20 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm px-2 py-1"
            placeholder="起运年"
            value={item.startYear}
            onChange={(e) => update(i, 'startYear', parseInt(e.target.value) || 0)}
          />
          <span className="text-xs text-gray-400">年起</span>
          <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {value.length === 0 && (
        <p className="text-xs text-gray-400">暂无大运，点击「添加」录入</p>
      )}
    </div>
  );
}
```

**Step 2: profile-form.tsx**

每个天干地支用单独的小 input，方便逐字录入。

```tsx
// apps/web/src/pages/insight/components/profile-form/profile-form.tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { useService } from '@rabjs/react';
import { InsightService } from '../../insight.service';
import { DayunEditor } from './dayun-editor';
import type { InsightProfileDto, DayunInput } from '../../../../api/insight';

interface ProfileFormProps {
  profile?: InsightProfileDto;
  onClose: () => void;
}

const GAN_ZHI_LABELS = [
  { label: '年柱', ganKey: 'yearGan', zhiKey: 'yearZhi' },
  { label: '月柱', ganKey: 'monthGan', zhiKey: 'monthZhi' },
  { label: '日柱', ganKey: 'dayGan', zhiKey: 'dayZhi' },
  { label: '时柱', ganKey: 'hourGan', zhiKey: 'hourZhi' },
] as const;

type FieldKey = 'yearGan' | 'yearZhi' | 'monthGan' | 'monthZhi' | 'dayGan' | 'dayZhi' | 'hourGan' | 'hourZhi';

export function ProfileForm({ profile, onClose }: ProfileFormProps) {
  const service = useService(InsightService);
  const isEdit = !!profile;

  const [name, setName] = useState(profile?.name ?? '');
  const [birthYear, setBirthYear] = useState(profile?.birthYear ?? new Date().getFullYear() - 30);
  const [fields, setFields] = useState<Record<FieldKey, string>>({
    yearGan: profile?.yearGan ?? '',
    yearZhi: profile?.yearZhi ?? '',
    monthGan: profile?.monthGan ?? '',
    monthZhi: profile?.monthZhi ?? '',
    dayGan: profile?.dayGan ?? '',
    dayZhi: profile?.dayZhi ?? '',
    hourGan: profile?.hourGan ?? '',
    hourZhi: profile?.hourZhi ?? '',
  });
  const [dayunList, setDayunList] = useState<DayunInput[]>(
    profile?.dayunList?.map((d) => ({ gan: d.gan, zhi: d.zhi, startYear: d.startYear, sortOrder: d.sortOrder })) ?? []
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const data = { name: name.trim(), birthYear, ...fields, sortOrder: 0 };
    if (isEdit) {
      const ok = await service.updateProfile(profile.id, data);
      if (ok) await service.saveDayun(profile.id, dayunList);
    } else {
      const created = await service.createProfile(data);
      if (created) await service.saveDayun(created.id, dayunList);
    }
    setSaving(false);
    onClose();
  };

  const inputCls = 'w-12 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm px-2 py-1.5 text-center focus:outline-none focus:border-green-500 dark:focus:border-green-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5 overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? '编辑命主档案' : '新建命主档案'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 名称 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">命主名称</label>
          <input
            className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            placeholder="如：自己、妈妈、老公"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* 出生年份 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">出生公历年份</label>
          <input
            type="number"
            className="w-32 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            value={birthYear}
            onChange={(e) => setBirthYear(parseInt(e.target.value) || 1990)}
          />
        </div>

        {/* 八字输入 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">八字（天干 / 地支）</label>
          <div className="grid grid-cols-4 gap-3">
            {GAN_ZHI_LABELS.map(({ label, ganKey, zhiKey }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-gray-400">{label}</span>
                <input
                  className={inputCls}
                  placeholder="干"
                  value={fields[ganKey]}
                  onChange={(e) => setFields((f) => ({ ...f, [ganKey]: e.target.value }))}
                  maxLength={2}
                />
                <input
                  className={inputCls}
                  placeholder="支"
                  value={fields[zhiKey]}
                  onChange={(e) => setFields((f) => ({ ...f, [zhiKey]: e.target.value }))}
                  maxLength={2}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 大运编辑器 */}
        <div className="space-y-2 border-t border-gray-100 dark:border-zinc-800 pt-4">
          <DayunEditor value={dayunList} onChange={setDayunList} />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white text-sm font-medium hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)] disabled:opacity-60"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

```typescript
// apps/web/src/pages/insight/components/profile-form/index.ts
export { ProfileForm } from './profile-form';
```

**Step 3: Commit**

```bash
git add apps/web/src/pages/insight/components/profile-form/
git commit -m "feat(web): add ProfileForm with DayunEditor"
```

---

## Task 13：Frontend Components — PromptGenerator

右栏核心组件：时间段选择 + 方向多选 + Prompt 输出。

**Files:**
- Create: `apps/web/src/pages/insight/components/prompt-generator/prompt-generator.tsx`
- Create: `apps/web/src/pages/insight/components/prompt-generator/index.ts`

**Step 1: prompt-generator.tsx**

```tsx
// apps/web/src/pages/insight/components/prompt-generator/prompt-generator.tsx
import { useState } from 'react';
import { Copy, Check, Wand2 } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import { InsightService } from '../../insight.service';
import { BaziDisplay } from '../bazi-display';
import { buildPrompt, TIME_PERIOD_LABELS, PRESET_ASPECTS } from '../../utils/prompt-builder';
import { getCurrentDayun } from '../../utils/ganzhi';
import type { TimePeriod } from '../../utils/ganzhi';

const TIME_PERIODS = Object.keys(TIME_PERIOD_LABELS) as TimePeriod[];

export const PromptGenerator = view(() => {
  const service = useService(InsightService);
  const profile = service.selectedProfile;

  const [period, setPeriod] = useState<TimePeriod>('today');
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [customAspect, setCustomAspect] = useState('');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const allAspects = [...PRESET_ASPECTS, ...(profile?.customAspects ?? [])];

  const toggleAspect = (aspect: string) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  };

  const handleGenerate = () => {
    if (!profile) return;
    setPrompt(buildPrompt(profile, period, selectedAspects));
  };

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCustomAspect = () => {
    const val = customAspect.trim();
    if (!val || !profile) return;
    const next = [...(profile.customAspects ?? []), val];
    service.updateProfile(profile.id, { customAspects: next });
    setCustomAspect('');
  };

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-zinc-600 text-sm">
        请先在左栏选择或新建命主档案
      </div>
    );
  }

  const dayun = getCurrentDayun(profile.dayunList);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      {/* 命主基本信息 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800 dark:text-zinc-200">{profile.name}</h2>
        <BaziDisplay
          yearGan={profile.yearGan} yearZhi={profile.yearZhi}
          monthGan={profile.monthGan} monthZhi={profile.monthZhi}
          dayGan={profile.dayGan} dayZhi={profile.dayZhi}
          hourGan={profile.hourGan} hourZhi={profile.hourZhi}
        />
        {dayun ? (
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            当前大运：<span className="text-green-600 dark:text-green-400 font-medium">{dayun.gan}{dayun.zhi}</span>
            （{dayun.startYear}年起）
          </p>
        ) : (
          <p className="text-xs text-gray-400">尚未录入大运</p>
        )}
      </div>

      {/* 时间段选择 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">分析时间范围</label>
        <div className="flex flex-wrap gap-2">
          {TIME_PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                period === p
                  ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)]'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400'
              }`}
            >
              {TIME_PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 分析方向多选 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
          分析方向（可多选，不选则综合运势）
        </label>
        <div className="flex flex-wrap gap-2">
          {allAspects.map((a) => (
            <button
              key={a}
              onClick={() => toggleAspect(a)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                selectedAspects.includes(a)
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        {/* 自定义方向 */}
        <div className="flex gap-2 mt-1">
          <input
            className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs focus:outline-none focus:border-green-500"
            placeholder="添加自定义方向（如：移民、创业）"
            value={customAspect}
            onChange={(e) => setCustomAspect(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAspect()}
          />
          <button
            onClick={handleAddCustomAspect}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs text-gray-600 dark:text-zinc-400 hover:text-green-600 transition-colors"
          >
            添加
          </button>
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-medium text-sm hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
      >
        <Wand2 className="w-4 h-4" />
        生成 Prompt
      </button>

      {/* Prompt 输出 */}
      {prompt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
              生成的 Prompt（复制后粘贴到 ChatGPT）
            </label>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs text-gray-600 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre className="w-full rounded-xl bg-gray-50 dark:bg-zinc-800/50 p-4 text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed border border-gray-100 dark:border-zinc-700/50">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
});
```

```typescript
// apps/web/src/pages/insight/components/prompt-generator/index.ts
export { PromptGenerator } from './prompt-generator';
```

**Step 2: Commit**

```bash
git add apps/web/src/pages/insight/components/prompt-generator/
git commit -m "feat(web): add PromptGenerator component"
```

---

## Task 14：Frontend Page — InsightPage + 路由注册

**Files:**
- Create: `apps/web/src/pages/insight/insight.tsx`
- Create: `apps/web/src/pages/insight/index.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/layout.tsx`
- Modify: `apps/web/src/main.tsx`（注册 InsightService）

**Step 1: insight.tsx**

```tsx
// apps/web/src/pages/insight/insight.tsx
import { useState, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { InsightService } from './insight.service';
import { ProfileList } from './components/profile-list';
import { ProfileForm } from './components/profile-form';
import { PromptGenerator } from './components/prompt-generator';
import type { InsightProfileDto } from '../../api/insight';

export const InsightPage = view(() => {
  const service = useService(InsightService);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<InsightProfileDto | undefined>(undefined);

  useEffect(() => {
    service.loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => { setEditingProfile(undefined); setShowForm(true); };
  const openEdit = (p: InsightProfileDto) => { setEditingProfile(p); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingProfile(undefined); };

  return (
    <Layout>
      <div className="flex h-full">
        {/* 左栏：240px 固定宽 */}
        <aside
          className="w-[240px] flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-zinc-800"
          style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.04)' }}
        >
          <ProfileList onAdd={openAdd} onEdit={openEdit} />
        </aside>

        {/* 右栏：Prompt 生成区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl">
            <h1 className="text-base font-semibold text-gray-800 dark:text-zinc-200">不惑 · Insight</h1>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
              根据八字大运生成分析 Prompt，复制后粘贴至 ChatGPT
            </p>
          </div>
          <PromptGenerator />
        </div>
      </div>

      {showForm && (
        <ProfileForm profile={editingProfile} onClose={closeForm} />
      )}
    </Layout>
  );
});
```

**Step 2: index.tsx**

```typescript
// apps/web/src/pages/insight/index.tsx
export { InsightPage } from './insight';
```

**Step 3: 在 App.tsx 新增路由**

在 `apps/web/src/App.tsx` 中：
1. 顶部导入：`import { InsightPage } from './pages/insight';`
2. 在 `</Routes>` 前添加：
```tsx
<Route
  path="/insight/*"
  element={
    <ProtectedRoute>
      <InsightPage />
    </ProtectedRoute>
  }
/>
```

**Step 4: 在 layout.tsx 新增侧边栏图标**

在 `apps/web/src/components/layout.tsx` 中：
1. 导入：将 `Compass` 加入 lucide-react imports
2. 添加 `isInsightPage` 检查：`const isInsightPage = location.pathname.startsWith('/insight');`
3. 在 Apps 按钮前后插入 Insight 导航按钮：

```tsx
{/* Insight Navigation */}
<button
  onClick={() => { const search = location.search; navigate(`/insight${search}`); }}
  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
    isInsightPage
      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
      : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-dark-800'
  }`}
  title="不惑"
  aria-label="不惑"
>
  <Compass className="w-6 h-6" />
</button>
```

**Step 5: 在 main.tsx 注册 InsightService**

在 `apps/web/src/main.tsx` 中找到 `register()` 调用列表，添加：
```typescript
import { InsightService } from './pages/insight/insight.service';
// 在 register() 列表中加入：
new InsightService().register();
```

**Step 6: Commit**

```bash
git add apps/web/src/pages/insight/insight.tsx \
        apps/web/src/pages/insight/index.tsx \
        apps/web/src/App.tsx \
        apps/web/src/components/layout.tsx \
        apps/web/src/main.tsx
git commit -m "feat(web): add Insight page, routing, and sidebar navigation"
```

---

## Task 15：集成验证

**Step 1: 启动开发环境**

```bash
# 确保 MySQL 在运行
pnpm dev:env

# 启动服务端（自动跑 migration）
pnpm dev:server

# 启动前端
pnpm dev:web
```

**Step 2: 验证 Migration**

```bash
pnpm --filter @x-console/server migrate:studio
```

确认 `insight_profiles` 和 `insight_dayun` 两张表已创建。

**Step 3: 功能验收清单**

- [ ] 侧边栏出现「不惑」图标（Compass），点击跳转 `/insight`
- [ ] 左栏显示「命主档案」，初始状态显示"暂无档案"
- [ ] 点击 `+` 弹出新建档案弹窗
- [ ] 填写名称、出生年份、八字各柱天干地支，保存成功
- [ ] 大运编辑器可添加多步大运（天干/地支/起运年份）
- [ ] 左栏显示已创建档案，八字预览正确
- [ ] 点击档案切换，右栏显示对应八字格（2×4 天干/地支）
- [ ] 当前大运自动计算显示正确（基于今年判断）
- [ ] 时间段按钮单选正常
- [ ] 分析方向多选正常，支持自定义添加
- [ ] 点击「生成 Prompt」输出格式化文字
- [ ] Prompt 包含正确的流年/流月/流日干支
- [ ] 「复制」按钮复制成功，显示「已复制」反馈
- [ ] 编辑档案可修改信息和大运
- [ ] 删除档案后列表更新

**Step 4: 最终 Commit**

```bash
git add .
git commit -m "feat: complete insight tab - bazi profile manager and prompt generator"
```
