import { Service } from 'typedi';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ChatOpenAI } from '@langchain/openai';
import { getDatabase } from '../db/connection.js';
import { withTransaction } from '../db/transaction.js';
import { insightProfiles, insightDayun } from '../db/schema/index.js';
import type { InsightProfile, PillarDetail } from '../db/schema/insight-profiles.js';
import type { InsightDayun } from '../db/schema/insight-dayun.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

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
  birthDate?: string | null;
  customAspects?: string[];
  sortOrder?: number;
}

export interface ParsedBaziResult {
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
  hourGan: string;
  hourZhi: string;
  birthYear: number | null;
  birthDate: string | null;
  yearDetail: Record<string, unknown> | null;
  monthDetail: Record<string, unknown> | null;
  dayDetail: Record<string, unknown> | null;
  hourDetail: Record<string, unknown> | null;
  shenshas: string[];
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

    if (profiles.length === 0) return [];

    const profileIds = profiles.map((p) => p.id);
    const allDayun = await this.db
      .select()
      .from(insightDayun)
      .where(inArray(insightDayun.profileId, profileIds))
      .orderBy(asc(insightDayun.sortOrder));

    const dayunByProfile = new Map<string, InsightDayun[]>();
    for (const d of allDayun) {
      const list = dayunByProfile.get(d.profileId) ?? [];
      list.push(d);
      dayunByProfile.set(d.profileId, list);
    }

    return profiles.map((p) => ({ ...p, dayunList: dayunByProfile.get(p.id) ?? [] }));
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
      birthDate: input.birthDate ?? null,
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
    await this.db.delete(insightProfiles).where(eq(insightProfiles.id, id));
    return true;
  }

  async replaceDayun(profileId: string, userId: string, items: DayunInput[]): Promise<InsightDayun[] | null> {
    const [profile] = await this.db
      .select()
      .from(insightProfiles)
      .where(and(eq(insightProfiles.id, profileId), eq(insightProfiles.userId, userId)));
    if (!profile) return null;

    await withTransaction(async (tx) => {
      await tx.delete(insightDayun).where(eq(insightDayun.profileId, profileId));

      if (items.length > 0) {
        const now = new Date();
        await tx.insert(insightDayun).values(
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
      }
    });

    return this.db
      .select()
      .from(insightDayun)
      .where(eq(insightDayun.profileId, profileId))
      .orderBy(asc(insightDayun.sortOrder));
  }

  async parseBazi(text: string): Promise<ParsedBaziResult> {
    const model = new ChatOpenAI({
      modelName: config.openai.model || 'gpt-4o-mini',
      apiKey: config.openai.apiKey,
      configuration: {
        baseURL: config.openai.baseURL,
      },
      temperature: 0,
    });

    const systemPrompt = `你是一个专业的八字解析助手。用户会提供一段八字排盘文字，请从中提取结构化数据并以JSON格式返回。

提取以下字段：
- yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi (天干地支，单个汉字或两字)
- birthYear (出生公历年份，整数)
- birthDate (出生公历日期，格式 YYYY-MM-DD，如无则null)
- yearDetail, monthDetail, dayDetail, hourDetail (每柱详细信息，结构见下)
- shenshas (全局神煞字符串数组，如文中没有单独的全局神煞行则为空数组)

每柱 detail 结构：
{
  "shishen_gan": "主星（十神）",
  "shishen_gan_sub": "副星（可多个用空格分隔）",
  "canggan": [{"gan": "天干", "shishen": "该藏干十神（如无则空字符串）"}],
  "nayin": "纳音",
  "shenshas": ["神煞1", "神煞2"]
}

只返回JSON，不要任何其他文字。`;

    const response = await model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ]);

    const responseContent = typeof response.content === 'string' ? response.content : '';

    // Strip markdown code fences if present
    const jsonStr = responseContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    try {
      return JSON.parse(jsonStr) as ParsedBaziResult;
    } catch (err) {
      logger.error('parseBazi: failed to parse LLM response as JSON:', responseContent);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }
}
