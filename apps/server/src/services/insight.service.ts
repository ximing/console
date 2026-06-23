import { Service } from 'typedi';
import { eq, and, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getDatabase } from '../db/connection.js';
import { insightProfiles, insightDayun } from '../db/schema/index.js';
import type { InsightProfile, PillarDetail } from '../db/schema/insight-profiles.js';
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
    await this.db.delete(insightProfiles).where(eq(insightProfiles.id, id));
    return true;
  }

  async replaceDayun(profileId: string, userId: string, items: DayunInput[]): Promise<InsightDayun[]> {
    const [profile] = await this.db
      .select()
      .from(insightProfiles)
      .where(and(eq(insightProfiles.id, profileId), eq(insightProfiles.userId, userId)));
    if (!profile) return [];

    await this.db.delete(insightDayun).where(eq(insightDayun.profileId, profileId));

    if (items.length === 0) return [];

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
