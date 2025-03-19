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
  birthTime?: string | null;
  customAspects?: string[];
  macroAnalysis?: string | null;  // 新增
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
  birthTime: string | null;
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
      birthTime: input.birthTime ?? null,
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

    const systemPrompt = `你是一个专业的八字解析助手。用户会提供一段八字排盘文字（表格格式），请提取结构化数据并返回纯JSON，不要任何markdown或其他文字。

【表格格式说明】
每行格式为"字段名：年柱值, 月柱值, 日柱值, 时柱值"，逗号分隔四柱。

【关键解析规则】
1. 藏干：每个值是"天干+五行"组合，如"壬水"取"壬"，"甲木"取"甲"，多个用空格分隔
2. 副星：各藏干的十神，与藏干一一对应（按空格分隔的顺序匹配）
3. 神煞：逗号分隔四柱，每柱内空格分隔多个神煞名称（注意有时逗号后有多个空格）
4. 主星为"元女"/"日元"等时，原样保留在shishen_gan中
5. 纳音、星运、自坐、空亡都是逗号分隔四柱，直接取对应位置即可

【提取字段】
顶层：yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi（各单字天干地支）
birthYear（公历年份整数），birthDate（YYYY-MM-DD，找不到则null）
birthTime（HH:MM格式，从"阳历: YYYY年MM月DD日 HH:MM:SS"中提取，找不到则null）
yearDetail, monthDetail, dayDetail, hourDetail（每柱详情对象）
shenshas（全局神煞数组，神煞若都在各柱detail中则为[]）

【每柱detail结构】
{
  "shishen_gan": "主星",
  "shishen_gan_sub": "副星（空格分隔）",
  "canggan": [{"gan":"天干单字","shishen":"十神"}],
  "nayin": "纳音",
  "shenshas": ["神煞1","神煞2"],
  "xiyun": "星运",
  "zizuo": "自坐",
  "kongwang": "空亡"
}

【示例】
输入片段（年柱为例）：
  主星：偏财, ...
  天干：乙, ...
  地支：亥, ...
  藏干：壬水 甲木, ...
  副星：伤官 正财, ...
  星运：沐浴, ...
  自坐：死, ...
  空亡：申酉, ...
  纳音：山头火, ...
  神煞：国印贵人 太极贵人 德秀贵人 金舆, ...

年柱输出：
  yearGan:"乙", yearZhi:"亥"
  yearDetail:{shishen_gan:"偏财",shishen_gan_sub:"伤官 正财",canggan:[{gan:"壬",shishen:"伤官"},{gan:"甲",shishen:"正财"}],nayin:"山头火",xiyun:"沐浴",zizuo:"死",kongwang:"申酉",shenshas:["国印贵人","太极贵人","德秀贵人","金舆"]}

只返回JSON对象，不要代码块标记。`;

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
