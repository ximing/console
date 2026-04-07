import { Service } from 'typedi';
import { eq, and, desc } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { apps, type App, type NewApp } from '../db/schema/app.js';
import { generateUid } from '../utils/id.js';
import type { AppDto, CreateAppDto, UpdateAppDto, AppListDto } from '@x-console/dto';

@Service()
export class AppService {
  /**
   * Get paginated list of apps for a user
   */
  async getApps(userId: string, page = 1, pageSize = 20): Promise<AppListDto> {
    const db = getDatabase();

    const offset = (page - 1) * pageSize;

    const results = await db
      .select()
      .from(apps)
      .where(eq(apps.userId, userId))
      .orderBy(desc(apps.updatedAt))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db
      .select({ count: apps.id })
      .from(apps)
      .where(eq(apps.userId, userId));

    return {
      apps: results.map((app) => this.toDto(app)),
      total: totalResult.length,
    };
  }

  /**
   * Get a single app by ID
   */
  async getAppById(id: string, userId: string): Promise<AppDto | null> {
    const db = getDatabase();

    const results = await db
      .select()
      .from(apps)
      .where(and(eq(apps.id, id), eq(apps.userId, userId)))
      .limit(1);

    return results.length > 0 ? this.toDto(results[0]) : null;
  }

  /**
   * Create a new app
   */
  async createApp(userId: string, data: CreateAppDto): Promise<AppDto> {
    const db = getDatabase();
    const id = generateUid();

    const newApp: NewApp = {
      id,
      userId,
      name: data.name,
      description: data.description ?? null,
    };

    await db.insert(apps).values(newApp);

    const [created] = await db.select().from(apps).where(eq(apps.id, id));
    return this.toDto(created);
  }

  /**
   * Update an existing app
   */
  async updateApp(id: string, userId: string, data: UpdateAppDto): Promise<AppDto | null> {
    const db = getDatabase();

    const existing = await db
      .select()
      .from(apps)
      .where(and(eq(apps.id, id), eq(apps.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return null;
    }

    const updateData: Partial<App> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description ?? null;

    await db
      .update(apps)
      .set(updateData)
      .where(and(eq(apps.id, id), eq(apps.userId, userId)));

    const [updated] = await db.select().from(apps).where(eq(apps.id, id));
    return this.toDto(updated);
  }

  /**
   * Delete an app
   */
  async deleteApp(id: string, userId: string): Promise<boolean> {
    const db = getDatabase();

    const existing = await db
      .select()
      .from(apps)
      .where(and(eq(apps.id, id), eq(apps.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await db.delete(apps).where(and(eq(apps.id, id), eq(apps.userId, userId)));
    return true;
  }

  /**
   * Convert database model to DTO
   */
  private toDto(app: App): AppDto {
    return {
      id: app.id,
      userId: app.userId,
      name: app.name,
      description: app.description,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    };
  }
}
