# App Version Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 App 版本管理功能，支持创建 App、创建版本（版本号、构建号、变更日志、双平台下载链接），界面展示二维码扫描下载。

**Architecture:** 采用现有的分层架构模式 — Drizzle ORM (DB) → typedi Service → routing-controllers (Controller) → @rabjs/react Service → React Components。前端遵循 feature-based 组件组织。

**Tech Stack:** Drizzle ORM, typedi, routing-controllers, @rabjs/react, qrcode.react, React Router

---

## Chunk 1: Database Schema

### Files

- Create: `apps/server/src/db/schema/app.ts`
- Create: `apps/server/src/db/schema/app-version.ts`
- Modify: `apps/server/src/db/schema/index.ts` (export new schemas)

### Steps

- [ ] **Step 1: Create app schema**

```typescript
// apps/server/src/db/schema/app.ts
import { mysqlTable, varchar, text, timestamp, index } from 'drizzle-orm/mysql-core';
import { users } from './user';

export const apps = mysqlTable('apps', {
  id: varchar('id', { length: 191 }).primaryKey().notNull(),
  userId: varchar('user_id', { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 }).notNull().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));
```

- [ ] **Step 2: Create app-version schema**

```typescript
// apps/server/src/db/schema/app-version.ts
import { mysqlTable, varchar, text, boolean, timestamp, index } from 'drizzle-orm/mysql-core';
import { apps } from './app';

export const appVersions = mysqlTable('app_versions', {
  id: varchar('id', { length: 191 }).primaryKey().notNull(),
  appId: varchar('app_id', { length: 191 })
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  version: varchar('version', { length: 50 }).notNull(),
  buildNumber: varchar('build_number', { length: 50 }).notNull(),
  changelog: text('changelog'),
  androidUrl: varchar('android_url', { length: 500 }),
  iosUrl: varchar('ios_url', { length: 500 }),
  isLatest: boolean('is_latest').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
}, (table) => ({
  appIdIdx: index('app_id_idx').on(table.appId),
  versionIdx: index('version_idx').on(table.appId, table.version),
}));
```

- [ ] **Step 3: Export schemas in index.ts**

Add to `apps/server/src/db/schema/index.ts`:
```typescript
export * from './app';
export * from './app-version';
```

- [ ] **Step 4: Generate migration**

Run: `pnpm --filter @x-console/server migrate:generate -- apps_and_versions`
Expected: Migration file created in `apps/server/src/db/migrations/`

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/db/schema/app.ts apps/server/src/db/schema/app-version.ts apps/server/src/db/schema/index.ts
git commit -m "feat(server): add app and app-version schema"
```

---

## Chunk 2: DTOs

### Files

- Create: `packages/dto/src/app.ts`
- Modify: `packages/dto/src/index.ts` (export new DTOs)

### Steps

- [ ] **Step 1: Create app DTOs**

```typescript
// packages/dto/src/app.ts

// App DTO
export interface AppDto {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// AppVersion DTO
export interface AppVersionDto {
  id: string;
  appId: string;
  version: string;
  buildNumber: string;
  changelog: string | null;
  androidUrl: string | null;
  iosUrl: string | null;
  isLatest: boolean;
  createdAt: string;
}

// Create App DTO
export interface CreateAppDto {
  name: string;
  description?: string;
}

// Update App DTO
export interface UpdateAppDto {
  name?: string;
  description?: string;
}

// Create AppVersion DTO
export interface CreateVersionDto {
  version: string;
  buildNumber: string;
  changelog?: string;
  androidUrl?: string;
  iosUrl?: string;
  isLatest?: boolean;
}

// Update AppVersion DTO
export interface UpdateVersionDto {
  version?: string;
  buildNumber?: string;
  changelog?: string;
  androidUrl?: string;
  iosUrl?: string;
  isLatest?: boolean;
}

// App list result
export interface AppListResult {
  apps: AppDto[];
  total: number;
}

// AppVersion list result
export interface VersionListResult {
  versions: AppVersionDto[];
  total: number;
}
```

- [ ] **Step 2: Export in index.ts**

Add to `packages/dto/src/index.ts`:
```typescript
export * from './app';
```

- [ ] **Step 3: Commit**

```bash
git add packages/dto/src/app.ts packages/dto/src/index.ts
git commit -m "feat(dto): add app and app-version DTOs"
```

---

## Chunk 3: Server Services

### Files

- Create: `apps/server/src/services/app.service.ts`
- Create: `apps/server/src/services/app-version.service.ts`
- Modify: `apps/server/src/services/index.ts` (export new services)

### Steps

- [ ] **Step 1: Create app service**

```typescript
// apps/server/src/services/app.service.ts
import { Service } from 'typedi';
import { eq, and, desc } from 'drizzle-orm';
import { getDatabase } from '../db';
import { apps } from '../db/schema/app';
import { AppDto, CreateAppDto, UpdateAppDto, AppListResult } from '@x-console/dto';

@Service()
export class AppService {
  async getApps(userId: string): Promise<AppListResult> {
    const db = getDatabase();
    const result = await db
      .select()
      .from(apps)
      .where(eq(apps.userId, userId))
      .orderBy(desc(apps.createdAt));

    return {
      apps: result.map(this.toDto),
      total: result.length,
    };
  }

  async getAppById(id: string, userId: string): Promise<AppDto | null> {
    const db = getDatabase();
    const result = await db
      .select()
      .from(apps)
      .where(and(eq(apps.id, id), eq(apps.userId, userId)))
      .limit(1);

    return result[0] ? this.toDto(result[0]) : null;
  }

  async createApp(userId: string, data: CreateAppDto): Promise<AppDto> {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(apps).values({
      id,
      userId,
      name: data.name,
      description: data.description || null,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      name: data.name,
      description: data.description || null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  async updateApp(id: string, userId: string, data: UpdateAppDto): Promise<AppDto | null> {
    const db = getDatabase();
    const existing = await this.getAppById(id, userId);
    if (!existing) return null;

    const updates: Partial<typeof existing> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    updates.updatedAt = new Date().toISOString();

    await db
      .update(apps)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(apps.id, id), eq(apps.userId, userId)));

    return this.getAppById(id, userId);
  }

  async deleteApp(id: string, userId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .delete(apps)
      .where(and(eq(apps.id, id), eq(apps.userId, userId)));
    return result.rowCount > 0;
  }

  private toDto(row: typeof apps.$inferSelect): AppDto {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 2: Create app-version service**

```typescript
// apps/server/src/services/app-version.service.ts
import { Service } from 'typedi';
import { eq, and, desc } from 'drizzle-orm';
import { getDatabase } from '../db';
import { appVersions } from '../db/schema/app-version';
import { AppVersionDto, CreateVersionDto, UpdateVersionDto, VersionListResult } from '@x-console/dto';

@Service()
export class AppVersionService {
  async getVersionsByAppId(appId: string): Promise<VersionListResult> {
    const db = getDatabase();
    const result = await db
      .select()
      .from(appVersions)
      .where(eq(appVersions.appId, appId))
      .orderBy(desc(appVersions.createdAt));

    return {
      versions: result.map(this.toDto),
      total: result.length,
    };
  }

  async getVersionById(id: string): Promise<AppVersionDto | null> {
    const db = getDatabase();
    const result = await db
      .select()
      .from(appVersions)
      .where(eq(appVersions.id, id))
      .limit(1);

    return result[0] ? this.toDto(result[0]) : null;
  }

  async createVersion(data: CreateVersionDto): Promise<AppVersionDto> {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date();

    // If isLatest, unset other latest versions for this app
    if (data.isLatest) {
      await db
        .update(appVersions)
        .set({ isLatest: false })
        .where(eq(appVersions.appId, data.appId!));
    }

    await db.insert(appVersions).values({
      id,
      appId: data.appId!,
      version: data.version,
      buildNumber: data.buildNumber,
      changelog: data.changelog || null,
      androidUrl: data.androidUrl || null,
      iosUrl: data.iosUrl || null,
      isLatest: data.isLatest || false,
      createdAt: now,
    });

    return {
      id,
      appId: data.appId!,
      version: data.version,
      buildNumber: data.buildNumber,
      changelog: data.changelog || null,
      androidUrl: data.androidUrl || null,
      iosUrl: data.iosUrl || null,
      isLatest: data.isLatest || false,
      createdAt: now.toISOString(),
    };
  }

  async updateVersion(id: string, data: UpdateVersionDto): Promise<AppVersionDto | null> {
    const db = getDatabase();
    const existing = await this.getVersionById(id);
    if (!existing) return null;

    // If isLatest, unset other latest versions for this app
    if (data.isLatest) {
      await db
        .update(appVersions)
        .set({ isLatest: false })
        .where(eq(appVersions.appId, existing.appId));
    }

    const updates: Record<string, unknown> = {};
    if (data.version !== undefined) updates.version = data.version;
    if (data.buildNumber !== undefined) updates.buildNumber = data.buildNumber;
    if (data.changelog !== undefined) updates.changelog = data.changelog;
    if (data.androidUrl !== undefined) updates.androidUrl = data.androidUrl;
    if (data.iosUrl !== undefined) updates.iosUrl = data.iosUrl;
    if (data.isLatest !== undefined) updates.isLatest = data.isLatest;

    await db.update(appVersions).set(updates).where(eq(appVersions.id, id));

    return this.getVersionById(id);
  }

  async deleteVersion(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(appVersions).where(eq(appVersions.id, id));
    return result.rowCount > 0;
  }

  private toDto(row: typeof appVersions.$inferSelect): AppVersionDto {
    return {
      id: row.id,
      appId: row.appId,
      version: row.version,
      buildNumber: row.buildNumber,
      changelog: row.changelog,
      androidUrl: row.androidUrl,
      iosUrl: row.iosUrl,
      isLatest: row.isLatest,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 3: Export in index.ts**

Add to `apps/server/src/services/index.ts`:
```typescript
export * from './app.service';
export * from './app-version.service';
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/services/app.service.ts apps/server/src/services/app-version.service.ts apps/server/src/services/index.ts
git commit -m "feat(server): add app and app-version services"
```

---

## Chunk 4: Server Controller

### Files

- Create: `apps/server/src/controllers/v1/app.controller.ts`
- Modify: `apps/server/src/controllers/index.ts` (register controller)

### Steps

- [ ] **Step 1: Create app controller**

```typescript
// apps/server/src/controllers/v1/app.controller.ts
import { JsonController, Get, Post, Put, Delete, Body, Param, CurrentUser } from 'routing-controllers';
import { AppService } from '../../services/app.service';
import { AppVersionService } from '../../services/app-version.service';
import { ResponseUtility } from '../../common/response';
import { ErrorCode } from '../../common/error';
import {
  AppDto,
  AppVersionDto,
  CreateAppDto,
  UpdateAppDto,
  CreateVersionDto,
  UpdateVersionDto,
} from '@x-console/dto';

@JsonController('/api/v1/apps')
export class AppController {
  constructor(
    private appService: AppService,
    private appVersionService: AppVersionService
  ) {}

  @Get('/')
  async listApps(@CurrentUser() user: { id: string }) {
    const result = await this.appService.getApps(user.id);
    return ResponseUtility.success(result);
  }

  @Get('/:id')
  async getApp(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const app = await this.appService.getAppById(id, user.id);
    if (!app) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'App not found');
    }
    return ResponseUtility.success(app);
  }

  @Post('/')
  async createApp(@CurrentUser() user: { id: string }, @Body() data: CreateAppDto) {
    if (!data.name || data.name.trim().length === 0) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'App name is required');
    }
    const app = await this.appService.createApp(user.id, data);
    return ResponseUtility.success(app);
  }

  @Put('/:id')
  async updateApp(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() data: UpdateAppDto
  ) {
    const app = await this.appService.updateApp(id, user.id, data);
    if (!app) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'App not found');
    }
    return ResponseUtility.success(app);
  }

  @Delete('/:id')
  async deleteApp(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const success = await this.appService.deleteApp(id, user.id);
    if (!success) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'App not found');
    }
    return ResponseUtility.success({ success: true });
  }

  // Version endpoints
  @Get('/:appId/versions')
  async listVersions(@Param('appId') appId: string) {
    const result = await this.appVersionService.getVersionsByAppId(appId);
    return ResponseUtility.success(result);
  }

  @Get('/:appId/versions/:id')
  async getVersion(@Param('id') id: string) {
    const version = await this.appVersionService.getVersionById(id);
    if (!version) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Version not found');
    }
    return ResponseUtility.success(version);
  }

  @Post('/:appId/versions')
  async createVersion(@Param('appId') appId: string, @Body() data: CreateVersionDto) {
    if (!data.version || data.version.trim().length === 0) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Version is required');
    }
    if (!data.buildNumber || data.buildNumber.trim().length === 0) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Build number is required');
    }
    const version = await this.appVersionService.createVersion({ ...data, appId });
    return ResponseUtility.success(version);
  }

  @Put('/:appId/versions/:id')
  async updateVersion(
    @Param('id') id: string,
    @Body() data: UpdateVersionDto
  ) {
    const version = await this.appVersionService.updateVersion(id, data);
    if (!version) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Version not found');
    }
    return ResponseUtility.success(version);
  }

  @Delete('/:appId/versions/:id')
  async deleteVersion(@Param('id') id: string) {
    const success = await this.appVersionService.deleteVersion(id);
    if (!success) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Version not found');
    }
    return ResponseUtility.success({ success: true });
  }
}
```

- [ ] **Step 2: Register controller**

Add to `apps/server/src/controllers/index.ts`:
```typescript
import { AppController } from './v1/app.controller';
// Add to decorators array
AppController,
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/controllers/v1/app.controller.ts apps/server/src/controllers/index.ts
git commit -m "feat(server): add app controller with version endpoints"
```

---

## Chunk 5: Frontend API Clients

### Files

- Create: `apps/web/src/api/app.ts`
- Modify: `apps/web/src/api/index.ts` (export new API)

### Steps

- [ ] **Step 1: Create app API client**

```typescript
// apps/web/src/api/app.ts
import { request } from '../lib/request';
import {
  ApiResponse,
  AppDto,
  AppListResult,
  CreateAppDto,
  UpdateAppDto,
  AppVersionDto,
  VersionListResult,
  CreateVersionDto,
  UpdateVersionDto,
} from '@x-console/dto';

export const appApi = {
  getApps: async (): Promise<AppListResult> => {
    const response = await request.get<unknown, ApiResponse<AppListResult>>('/api/v1/apps');
    return response.data;
  },

  getApp: async (id: string): Promise<AppDto> => {
    const response = await request.get<unknown, ApiResponse<AppDto>>(`/api/v1/apps/${id}`);
    return response.data;
  },

  createApp: async (data: CreateAppDto): Promise<AppDto> => {
    const response = await request.post<CreateAppDto, ApiResponse<AppDto>>('/api/v1/apps', data);
    return response.data;
  },

  updateApp: async (id: string, data: UpdateAppDto): Promise<AppDto> => {
    const response = await request.put<UpdateAppDto, ApiResponse<AppDto>>(`/api/v1/apps/${id}`, data);
    return response.data;
  },

  deleteApp: async (id: string): Promise<void> => {
    await request.delete(`/api/v1/apps/${id}`);
  },

  // Versions
  getVersions: async (appId: string): Promise<VersionListResult> => {
    const response = await request.get<unknown, ApiResponse<VersionListResult>>(
      `/api/v1/apps/${appId}/versions`
    );
    return response.data;
  },

  getVersion: async (appId: string, id: string): Promise<AppVersionDto> => {
    const response = await request.get<unknown, ApiResponse<AppVersionDto>>(
      `/api/v1/apps/${appId}/versions/${id}`
    );
    return response.data;
  },

  createVersion: async (appId: string, data: CreateVersionDto): Promise<AppVersionDto> => {
    const response = await request.post<CreateVersionDto, ApiResponse<AppVersionDto>>(
      `/api/v1/apps/${appId}/versions`,
      data
    );
    return response.data;
  },

  updateVersion: async (
    appId: string,
    versionId: string,
    data: UpdateVersionDto
  ): Promise<AppVersionDto> => {
    const response = await request.put<UpdateVersionDto, ApiResponse<AppVersionDto>>(
      `/api/v1/apps/${appId}/versions/${versionId}`,
      data
    );
    return response.data;
  },

  deleteVersion: async (appId: string, versionId: string): Promise<void> => {
    await request.delete(`/api/v1/apps/${appId}/versions/${versionId}`);
  },
};
```

- [ ] **Step 2: Export in index.ts**

Add to `apps/web/src/api/index.ts`:
```typescript
export * from './app';
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/app.ts apps/web/src/api/index.ts
git commit -m "feat(web): add app API client"
```

---

## Chunk 6: Frontend Services (@rabjs/react)

### Files

- Create: `apps/web/src/services/app.service.ts`
- Create: `apps/web/src/services/app-version.service.ts`
- Modify: `apps/web/src/services/index.ts` (export new services)

### Steps

- [ ] **Step 1: Create app service**

```typescript
// apps/web/src/services/app.service.ts
import { Service } from '@rabjs/react';
import { appApi } from '../api/app';
import { AppDto, CreateAppDto, UpdateAppDto } from '@x-console/dto';

export class AppService extends Service {
  apps: AppDto[] = [];
  currentApp: AppDto | null = null;
  loading = false;

  async loadApps(): Promise<void> {
    this.loading = true;
    try {
      const result = await appApi.getApps();
      this.apps = result.apps;
    } finally {
      this.loading = false;
    }
  }

  async createApp(data: CreateAppDto): Promise<AppDto | null> {
    try {
      const app = await appApi.createApp(data);
      this.apps = [app, ...this.apps];
      return app;
    } catch (err) {
      toast.error('Failed to create app');
      return null;
    }
  }

  async updateApp(id: string, data: UpdateAppDto): Promise<AppDto | null> {
    try {
      const app = await appApi.updateApp(id, data);
      const idx = this.apps.findIndex((a) => a.id === id);
      if (idx !== -1) {
        this.apps = [...this.apps.slice(0, idx), app, ...this.apps.slice(idx + 1)];
      }
      if (this.currentApp?.id === id) {
        this.currentApp = app;
      }
      return app;
    } catch (err) {
      toast.error('Failed to update app');
      return null;
    }
  }

  async deleteApp(id: string): Promise<boolean> {
    try {
      await appApi.deleteApp(id);
      this.apps = this.apps.filter((a) => a.id !== id);
      if (this.currentApp?.id === id) {
        this.currentApp = null;
      }
      return true;
    } catch (err) {
      toast.error('Failed to delete app');
      return false;
    }
  }
}

export const appService = new AppService();
```

- [ ] **Step 2: Create app-version service**

```typescript
// apps/web/src/services/app-version.service.ts
import { Service } from '@rabjs/react';
import { appApi } from '../api/app';
import { AppVersionDto, CreateVersionDto, UpdateVersionDto } from '@x-console/dto';

export class AppVersionService extends Service {
  versions: AppVersionDto[] = [];
  currentVersion: AppVersionDto | null = null;
  loading = false;

  async loadVersions(appId: string): Promise<void> {
    this.loading = true;
    try {
      const result = await appApi.getVersions(appId);
      this.versions = result.versions;
    } finally {
      this.loading = false;
    }
  }

  async createVersion(appId: string, data: CreateVersionDto): Promise<AppVersionDto | null> {
    try {
      const version = await appApi.createVersion(appId, data);
      this.versions = [version, ...this.versions];
      return version;
    } catch (err) {
      toast.error('Failed to create version');
      return null;
    }
  }

  async updateVersion(
    appId: string,
    versionId: string,
    data: UpdateVersionDto
  ): Promise<AppVersionDto | null> {
    try {
      const version = await appApi.updateVersion(appId, versionId, data);
      const idx = this.versions.findIndex((v) => v.id === versionId);
      if (idx !== -1) {
        this.versions = [...this.versions.slice(0, idx), version, ...this.versions.slice(idx + 1)];
      }
      if (this.currentVersion?.id === versionId) {
        this.currentVersion = version;
      }
      return version;
    } catch (err) {
      toast.error('Failed to update version');
      return null;
    }
  }

  async deleteVersion(appId: string, versionId: string): Promise<boolean> {
    try {
      await appApi.deleteVersion(appId, versionId);
      this.versions = this.versions.filter((v) => v.id !== versionId);
      if (this.currentVersion?.id === versionId) {
        this.currentVersion = null;
      }
      return true;
    } catch (err) {
      toast.error('Failed to delete version');
      return false;
    }
  }
}

export const appVersionService = new AppVersionService();
```

- [ ] **Step 3: Export in index.ts**

Add to `apps/web/src/services/index.ts`:
```typescript
export * from './app.service';
export * from './app-version.service';
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/services/app.service.ts apps/web/src/services/app-version.service.ts apps/web/src/services/index.ts
git commit -m "feat(web): add app and app-version services"
```

---

## Chunk 7: Frontend Pages and Components

### Files

- Create: `apps/web/src/pages/apps/index.tsx` (App list page)
- Create: `apps/web/src/pages/apps/[appId]/versions/index.tsx` (Version list page)
- Create: `apps/web/src/pages/apps/components/app-list/index.ts` (App list component)
- Create: `apps/web/src/pages/apps/components/app-list/app-list.tsx`
- Create: `apps/web/src/pages/apps/components/app-list/app-list-header.tsx`
- Create: `apps/web/src/pages/apps/components/app-list/app-list-content.tsx`
- Create: `apps/web/src/pages/apps/components/app-list/app-modal.tsx` (Create/Edit App modal)
- Create: `apps/web/src/pages/apps/components/version-list/index.ts` (Version list component)
- Create: `apps/web/src/pages/apps/components/version-list/version-list.tsx`
- Create: `apps/web/src/pages/apps/components/version-list/version-list-header.tsx`
- Create: `apps/web/src/pages/apps/components/version-list/version-list-content.tsx`
- Create: `apps/web/src/pages/apps/components/version-list/version-modal.tsx` (Create/Edit version modal)
- Create: `apps/web/src/pages/apps/components/version-list/qr-modal.tsx` (QR code display modal)
- Create: `apps/web/src/pages/apps/components/version-list/hooks/useVersionList.ts`
- Modify: `apps/web/src/pages/apps/components/version-list/index.ts`
- Modify: `apps/web/src/App.tsx` or router config (add routes)

### Steps

- [ ] **Step 1: Create app list page structure**

```
apps/web/src/pages/apps/
├── index.tsx                              # Route: /apps
└── components/
    └── app-list/
        ├── index.ts                       # Barrel export
        ├── app-list.tsx                   # Main component
        ├── app-list-header.tsx            # Header with create button
        ├── app-list-content.tsx           # Content with table
        ├── app-modal.tsx                  # Create/Edit App modal
        └── hooks/
            └── useAppList.ts              # Custom hook
```

- [ ] **Step 2: Create version list page structure**

```
apps/web/src/pages/apps/[appId]/
└── versions/
    ├── index.tsx                          # Route: /apps/:appId/versions
    └── components/
        ├── version-list/
        │   ├── index.ts                   # Barrel export
        │   ├── version-list.tsx           # Main component
        │   ├── version-list-header.tsx    # Header with app name + create button
        │   ├── version-list-content.tsx   # Content with table + QR
        │   ├── version-modal.tsx           # Create/Edit version modal
        │   ├── qr-modal.tsx               # QR code display modal
        │   └── hooks/
        │       └── useVersionList.ts      # Custom hook
```

- [ ] **Step 3: Implement App List Page**

Create `apps/web/src/pages/apps/index.tsx`:
```tsx
import { useEffect } from 'react';
import { useService } from '@rabjs/react';
import { appService } from '../../../services/app.service';
import { AppList } from './components/app-list';

export function AppsPage() {
  const service = useService(appService);

  useEffect(() => {
    service.loadApps();
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <AppList />
    </div>
  );
}
```

- [ ] **Step 4: Implement AppList component**

Create `apps/web/src/pages/apps/components/app-list/index.ts`:
```tsx
export { AppList } from './app-list';
```

Create `apps/web/src/pages/apps/components/app-list/app-list.tsx`:
```tsx
import { observer } from '@rabjs/react';
import { AppListHeader } from './app-list-header';
import { AppListContent } from './app-list-content';

export const AppList = observer(() => {
  return (
    <div className="h-full flex flex-col">
      <AppListHeader />
      <AppListContent />
    </div>
  );
});
```

Create `apps/web/src/pages/apps/components/app-list/app-list-header.tsx`:
```tsx
import { useState } from 'react';
import { AppModal } from './app-modal';

export function AppListHeader() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Apps</h1>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
      >
        New App
      </button>
      {showModal && <AppModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

Create `apps/web/src/pages/apps/components/app-list/app-list-content.tsx`:
```tsx
import { observer } from '@rabjs/react';
import { useService } from '@rabjs/react';
import { appService } from '../../../../services/app.service';
import { useNavigate } from 'react-router-dom';

export const AppListContent = observer(() => {
  const service = useService(appService);
  const navigate = useNavigate();

  if (service.loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (service.apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <p>No apps yet. Create your first app to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Description</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Created</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {service.apps.map((app) => (
              <tr
                key={app.id}
                className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-colors duration-150 cursor-pointer"
                onClick={() => navigate(`/apps/${app.id}/versions`)}
              >
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">{app.name}</td>
                <td className="px-4 py-3 text-zinc-500 text-sm">{app.description || '-'}</td>
                <td className="px-4 py-3 text-zinc-500 text-sm">
                  {new Date(app.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle delete
                    }}
                    className="text-red-500 hover:text-red-600 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
```

Create `apps/web/src/pages/apps/components/app-list/app-modal.tsx`:
```tsx
import { useState } from 'react';
import { useService } from '@rabjs/react';
import { appService } from '../../../../services/app.service';
import { AppDto } from '@x-console/dto';

interface AppModalProps {
  app?: AppDto;
  onClose: () => void;
}

export function AppModal({ app, onClose }: AppModalProps) {
  const [name, setName] = useState(app?.name || '');
  const [description, setDescription] = useState(app?.description || '');
  const service = useService(appService);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    if (app) {
      await service.updateApp(app.id, { name, description });
    } else {
      await service.createApp({ name, description });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl w-[400px] p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          {app ? 'Edit App' : 'New App'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="App name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              placeholder="Optional description"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
          >
            {app ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Create `apps/web/src/pages/apps/components/app-list/hooks/useAppList.ts`:
```tsx
import { useService } from '@rabjs/react';
import { appService } from '../../../../services/app.service';

export function useAppList() {
  const service = useService(appService);

  return {
    apps: service.apps,
    loading: service.loading,
    loadApps: () => service.loadApps(),
    createApp: service.createApp.bind(service),
    updateApp: service.updateApp.bind(service),
    deleteApp: service.deleteApp.bind(service),
  };
}
```

- [ ] **Step 5: Implement Version List Page**

Create `apps/web/src/pages/apps/[appId]/versions/index.tsx`:
```tsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useService } from '@rabjs/react';
import { appService } from '../../../../services/app.service';
import { appVersionService } from '../../../../services/app-version.service';
import { VersionList } from './components/version-list';

export function VersionsPage() {
  const { appId } = useParams<{ appId: string }>();
  const appSvc = useService(appService);
  const versionSvc = useService(appVersionService);

  useEffect(() => {
    if (appId) {
      appSvc.loadApps();
      versionSvc.loadVersions(appId);
    }
  }, [appId]);

  const currentApp = appSvc.apps.find((a) => a.id === appId);

  return (
    <div className="flex-1 overflow-auto">
      <VersionList app={currentApp} />
    </div>
  );
}
```

- [ ] **Step 6: Implement VersionList components**

Create `apps/web/src/pages/apps/[appId]/versions/components/version-list/index.ts`:
```tsx
export { VersionList } from './version-list';
```

Create `apps/web/src/pages/apps/[appId]/versions/components/version-list/version-list.tsx`:
```tsx
import { observer } from '@rabjs/react';
import { AppDto } from '@x-console/dto';
import { VersionListHeader } from './version-list-header';
import { VersionListContent } from './version-list-content';

interface VersionListProps {
  app?: AppDto;
}

export const VersionList = observer(({ app }: VersionListProps) => {
  return (
    <div className="h-full flex flex-col">
      <VersionListHeader app={app} />
      <VersionListContent appId={app?.id} />
    </div>
  );
});
```

Create `apps/web/src/pages/apps/[appId]/versions/components/version-list/version-list-header.tsx`:
```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppDto } from '@x-console/dto';
import { VersionModal } from './version-modal';

interface VersionListHeaderProps {
  app?: AppDto;
}

export function VersionListHeader({ app }: VersionListHeaderProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-4">
        <Link
          to="/apps"
          className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          ← Apps
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {app?.name || 'Loading...'} - Versions
        </h1>
      </div>
      {app && (
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
        >
          New Version
        </button>
      )}
      {showModal && app && <VersionModal appId={app.id} onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

Create `apps/web/src/pages/apps/[appId]/versions/components/version-list/version-list-content.tsx`:
```tsx
import { observer } from '@rabjs/react';
import { useService } from '@rabjs/react';
import { appVersionService } from '../../../../../services/app-version.service';
import { useState } from 'react';
import { QRModal } from './qr-modal';
import { AppVersionDto } from '@x-console/dto';

interface VersionListContentProps {
  appId?: string;
}

export const VersionListContent = observer(({ appId }: VersionListContentProps) => {
  const service = useService(appVersionService);
  const [qrVersion, setQrVersion] = useState<AppVersionDto | null>(null);
  const [qrPlatform, setQrPlatform] = useState<'android' | 'ios'>('android');

  if (!appId) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (service.loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (service.versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <p>No versions yet. Create your first version to get started.</p>
      </div>
    );
  }

  const handleShowQR = (version: AppVersionDto, platform: 'android' | 'ios') => {
    setQrVersion(version);
    setQrPlatform(platform);
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Version</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Build</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Platform</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Latest</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Created</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {service.versions.map((version) => (
              <tr
                key={version.id}
                className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-colors duration-150"
              >
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                  {version.version}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-sm">{version.buildNumber}</td>
                <td className="px-4 py-3 text-zinc-500 text-sm">
                  <div className="flex gap-2">
                    {version.androidUrl && (
                      <button
                        onClick={() => handleShowQR(version, 'android')}
                        className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                        title="Android QR"
                      >
                        Android QR
                      </button>
                    )}
                    {version.iosUrl && (
                      <button
                        onClick={() => handleShowQR(version, 'ios')}
                        className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                        title="iOS QR"
                      >
                        iOS QR
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-sm">
                  {version.isLatest && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-xs">
                      Latest
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-sm">
                  {new Date(version.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => service.deleteVersion(appId, version.id)}
                    className="text-red-500 hover:text-red-600 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {qrVersion && (
        <QRModal
          version={qrVersion}
          platform={qrPlatform}
          onClose={() => setQrVersion(null)}
        />
      )}
    </div>
  );
});
```

Create `apps/web/src/pages/apps/[appId]/versions/components/version-list/version-modal.tsx`:
```tsx
import { useState } from 'react';
import { useService } from '@rabjs/react';
import { appVersionService } from '../../../../../services/app-version.service';
import { AppVersionDto } from '@x-console/dto';

interface VersionModalProps {
  appId: string;
  version?: AppVersionDto;
  onClose: () => void;
}

export function VersionModal({ appId, version, onClose }: VersionModalProps) {
  const [versionStr, setVersion] = useState(version?.version || '');
  const [buildNumber, setBuildNumber] = useState(version?.buildNumber || '');
  const [changelog, setChangelog] = useState(version?.changelog || '');
  const [androidUrl, setAndroidUrl] = useState(version?.androidUrl || '');
  const [iosUrl, setIosUrl] = useState(version?.iosUrl || '');
  const [isLatest, setIsLatest] = useState(version?.isLatest || false);
  const service = useService(appVersionService);

  const handleSubmit = async () => {
    if (!versionStr.trim() || !buildNumber.trim()) return;

    const data = {
      version: versionStr,
      buildNumber,
      changelog,
      androidUrl: androidUrl || undefined,
      iosUrl: iosUrl || undefined,
      isLatest,
    };

    if (version) {
      await service.updateVersion(appId, version.id, data);
    } else {
      await service.createVersion(appId, data);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl w-[500px] max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          {version ? 'Edit Version' : 'New Version'}
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Version *
              </label>
              <input
                type="text"
                value={versionStr}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="1.0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Build Number *
              </label>
              <input
                type="text"
                value={buildNumber}
                onChange={(e) => setBuildNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Android Download URL
            </label>
            <input
              type="url"
              value={androidUrl}
              onChange={(e) => setAndroidUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              iOS Download URL
            </label>
            <input
              type="url"
              value={iosUrl}
              onChange={(e) => setIosUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Changelog
            </label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={4}
              placeholder="What's new in this version..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLatest"
              checked={isLatest}
              onChange={(e) => setIsLatest(e.target.checked)}
              className="w-4 h-4 text-green-500 border-zinc-300 rounded focus:ring-green-500"
            />
            <label htmlFor="isLatest" className="text-sm text-zinc-700 dark:text-zinc-300">
              Mark as latest version
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
          >
            {version ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Create `apps/web/src/pages/apps/[appId]/versions/components/version-list/qr-modal.tsx`:
```tsx
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AppVersionDto } from '@x-console/dto';

interface QRModalProps {
  version: AppVersionDto;
  platform: 'android' | 'ios';
  onClose: () => void;
}

export function QRModal({ version, platform, onClose }: QRModalProps) {
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(platform);
  const url = activeTab === 'android' ? version.androidUrl : version.iosUrl;

  if (!url) return null;

  const handleDownload = () => {
    const svg = document.getElementById('qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 280;
      canvas.height = 280;
      ctx?.drawImage(img, 0, 0, 280, 280);
      const png = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${version.version}-${activeTab}-qr.png`;
      link.href = png;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl w-[360px] p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 text-center mb-4">
          Scan to Download
        </h2>

        {/* Platform tabs */}
        <div className="flex mb-4 border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab('android')}
            disabled={!version.androidUrl}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === 'android'
                ? 'text-green-600 border-b-2 border-green-500'
                : 'text-zinc-500 hover:text-zinc-700'
            } ${!version.androidUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Android
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            disabled={!version.iosUrl}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ios'
                ? 'text-green-600 border-b-2 border-green-500'
                : 'text-zinc-500 hover:text-zinc-700'
            } ${!version.iosUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            iOS
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <QRCodeSVG
              id="qr-code"
              value={url}
              size={200}
              level="H"
              includeMargin
            />
          </div>
        </div>

        {/* URL */}
        <div className="mb-4 p-2 bg-zinc-100 dark:bg-zinc-900 rounded text-xs text-zinc-500 break-all">
          {url}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
          >
            Download QR
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

Create `apps/web/src/pages/apps/[appId]/versions/components/version-list/hooks/useVersionList.ts`:
```tsx
import { useService } from '@rabjs/react';
import { appVersionService } from '../../../../../services/app-version.service';

export function useVersionList(appId: string) {
  const service = useService(appVersionService);

  return {
    versions: service.versions,
    loading: service.loading,
    loadVersions: () => service.loadVersions(appId),
    createVersion: (data: Parameters<typeof service.createVersion>[1]) =>
      service.createVersion(appId, data),
    updateVersion: (versionId: string, data: Parameters<typeof service.updateVersion>[2]) =>
      service.updateVersion(appId, versionId, data),
    deleteVersion: (versionId: string) => service.deleteVersion(appId, versionId),
  };
}
```

- [ ] **Step 7: Add routes**

Modify router configuration (likely in `apps/web/src/App.tsx` or a routes file) to add:
```tsx
<Route path="/apps" element={<AppsPage />} />
<Route path="/apps/:appId/versions" element={<VersionsPage />} />
```

- [ ] **Step 8: Install qrcode.react**

Run: `pnpm --filter @x-console/web add qrcode.react @types/qrcode.react`

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/pages/apps/
pnpm --filter @x-console/web add qrcode.react @types/qrcode.react
git add apps/web/src/pages/apps/
git commit -m "feat(web): add app version management pages and components"
```

---

## Chunk 8: Final Verification

### Steps

- [ ] **Step 1: Run lint on new files**

Run: `pnpm --filter @x-console/web lint apps/web/src/pages/apps/ apps/web/src/services/app.service.ts apps/web/src/services/app-version.service.ts apps/web/src/api/app.ts`
Expected: No errors in new files

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @x-console/web build`
Expected: Build succeeds

- [ ] **Step 3: Commit final changes**

---

## Summary

| Chunk | Description |
|-------|-------------|
| 1 | Database schema (app, app-version) |
| 2 | DTOs for app and app-version |
| 3 | Server services (app, app-version) |
| 4 | Server controller with CRUD + version endpoints |
| 5 | Frontend API client |
| 6 | Frontend services (@rabjs/react) |
| 7 | Frontend pages and components |
| 8 | Final verification |
