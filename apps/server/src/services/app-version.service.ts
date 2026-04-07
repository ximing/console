import { Service } from 'typedi';
import { eq, and } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { appVersions, type AppVersion, type NewAppVersion } from '../db/schema/app-version.js';
import { generateUid } from '../utils/id.js';
import type { AppVersionDto, CreateVersionDto, UpdateVersionDto, VersionListDto } from '@x-console/dto';

@Service()
export class AppVersionService {
  /**
   * Get paginated list of versions for an app
   */
  async getVersionsByAppId(
    appId: string,
    page = 1,
    pageSize = 20
  ): Promise<VersionListDto> {
    const db = getDatabase();

    const offset = (page - 1) * pageSize;

    const results = await db
      .select()
      .from(appVersions)
      .where(eq(appVersions.appId, appId))
      .orderBy(appVersions.createdAt)
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db
      .select({ count: appVersions.id })
      .from(appVersions)
      .where(eq(appVersions.appId, appId));

    return {
      versions: results.map((v) => this.toDto(v)),
      total: totalResult.length,
    };
  }

  /**
   * Get a single version by ID
   */
  async getVersionById(id: string): Promise<AppVersionDto | null> {
    const db = getDatabase();

    const results = await db
      .select()
      .from(appVersions)
      .where(eq(appVersions.id, id))
      .limit(1);

    return results.length > 0 ? this.toDto(results[0]) : null;
  }

  /**
   * Create a new app version
   * If isLatest is true, unsets other latest versions for the same app
   */
  async createVersion(appId: string, data: CreateVersionDto): Promise<AppVersionDto> {
    const db = getDatabase();
    const id = generateUid();

    // If this version should be latest, unset other latest versions for this app
    if (data.isLatest) {
      await db
        .update(appVersions)
        .set({ isLatest: false })
        .where(and(eq(appVersions.appId, appId), eq(appVersions.isLatest, true)));
    }

    const newVersion: NewAppVersion = {
      id,
      appId,
      version: data.version,
      buildNumber: data.buildNumber ?? null,
      changelog: data.changelog ?? null,
      androidUrl: data.androidUrl ?? null,
      iosUrl: data.iosUrl ?? null,
      isLatest: data.isLatest ?? false,
    };

    await db.insert(appVersions).values(newVersion);

    const [created] = await db.select().from(appVersions).where(eq(appVersions.id, id));
    return this.toDto(created);
  }

  /**
   * Update an existing app version
   * If isLatest is set to true, unsets other latest versions for the same app
   */
  async updateVersion(id: string, data: UpdateVersionDto): Promise<AppVersionDto | null> {
    const db = getDatabase();

    const existing = await db
      .select()
      .from(appVersions)
      .where(eq(appVersions.id, id))
      .limit(1);

    if (existing.length === 0) {
      return null;
    }

    // If setting isLatest to true, unset other latest versions for this app
    if (data.isLatest === true) {
      await db
        .update(appVersions)
        .set({ isLatest: false })
        .where(
          and(
            eq(appVersions.appId, existing[0].appId),
            eq(appVersions.isLatest, true)
          )
        );
    }

    const updateData: Partial<AppVersion> = {};
    if (data.version !== undefined) updateData.version = data.version;
    if (data.buildNumber !== undefined) updateData.buildNumber = data.buildNumber ?? null;
    if (data.changelog !== undefined) updateData.changelog = data.changelog ?? null;
    if (data.androidUrl !== undefined) updateData.androidUrl = data.androidUrl ?? null;
    if (data.iosUrl !== undefined) updateData.iosUrl = data.iosUrl ?? null;
    if (data.isLatest !== undefined) updateData.isLatest = data.isLatest;

    await db.update(appVersions).set(updateData).where(eq(appVersions.id, id));

    const [updated] = await db.select().from(appVersions).where(eq(appVersions.id, id));
    return this.toDto(updated);
  }

  /**
   * Delete an app version
   */
  async deleteVersion(id: string): Promise<boolean> {
    const db = getDatabase();

    const existing = await db
      .select()
      .from(appVersions)
      .where(eq(appVersions.id, id))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await db.delete(appVersions).where(eq(appVersions.id, id));
    return true;
  }

  /**
   * Convert database model to DTO
   */
  private toDto(version: AppVersion): AppVersionDto {
    return {
      id: version.id,
      appId: version.appId,
      version: version.version,
      buildNumber: version.buildNumber ?? '',
      changelog: version.changelog,
      androidUrl: version.androidUrl,
      iosUrl: version.iosUrl,
      isLatest: version.isLatest,
      createdAt: version.createdAt.toISOString(),
    };
  }
}
