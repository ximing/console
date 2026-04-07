/**
 * App Controller - REST API for app version management
 */

import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { AppService } from '../../services/app.service.js';
import { AppVersionService } from '../../services/app-version.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type {
  AppDto,
  AppListDto,
  CreateAppDto,
  UpdateAppDto,
  AppVersionDto,
  VersionListDto,
  CreateVersionDto,
  UpdateVersionDto,
} from '@x-console/dto';

@Service()
@JsonController('/api/v1/apps')
export class AppController {
  constructor(
    private appService: AppService,
    private appVersionService: AppVersionService
  ) {}

  // ==================== App Endpoints ====================

  /**
   * GET /api/v1/apps - List all apps for current user
   */
  @Get('/')
  async listApps(@CurrentUser() user: { id: string }) {
    const result = await this.appService.getApps(user.id);
    return ResponseUtility.success(result);
  }

  /**
   * GET /api/v1/apps/:id - Get app by ID
   */
  @Get('/:id')
  async getApp(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const app = await this.appService.getAppById(id, user.id);
    if (!app) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'App not found');
    }
    return ResponseUtility.success(app);
  }

  /**
   * POST /api/v1/apps - Create a new app
   */
  @Post('/')
  async createApp(@CurrentUser() user: { id: string }, @Body() data: CreateAppDto) {
    if (!data.name || data.name.trim().length === 0) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'App name is required');
    }
    const app = await this.appService.createApp(user.id, data);
    return ResponseUtility.success(app);
  }

  /**
   * PUT /api/v1/apps/:id - Update an app
   */
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

  /**
   * DELETE /api/v1/apps/:id - Delete an app
   */
  @Delete('/:id')
  async deleteApp(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const success = await this.appService.deleteApp(id, user.id);
    if (!success) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'App not found');
    }
    return ResponseUtility.success({ success: true });
  }

  // ==================== Version Endpoints ====================

  /**
   * GET /api/v1/apps/:appId/versions - List all versions for an app
   */
  @Get('/:appId/versions')
  async listVersions(@CurrentUser() user: { id: string }, @Param('appId') appId: string) {
    // First verify user owns the app
    const app = await this.appService.getAppById(appId, user.id);
    if (!app) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'App not found');
    }
    const result = await this.appVersionService.getVersionsByAppId(appId);
    return ResponseUtility.success(result);
  }

  /**
   * GET /api/v1/apps/:appId/versions/:id - Get version by ID
   */
  @Get('/:appId/versions/:id')
  async getVersion(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const version = await this.appVersionService.getVersionById(id, user.id);
    if (!version) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Version not found');
    }
    return ResponseUtility.success(version);
  }

  /**
   * POST /api/v1/apps/:appId/versions - Create a new version
   */
  @Post('/:appId/versions')
  async createVersion(
    @CurrentUser() user: { id: string },
    @Param('appId') appId: string,
    @Body() data: CreateVersionDto
  ) {
    // Verify user owns the app first
    const app = await this.appService.getAppById(appId, user.id);
    if (!app) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'App not found');
    }
    if (!data.version || data.version.trim().length === 0) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Version is required');
    }
    if (!data.buildNumber || data.buildNumber.trim().length === 0) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Build number is required');
    }
    const version = await this.appVersionService.createVersion(appId, data);
    return ResponseUtility.success(version);
  }

  /**
   * PUT /api/v1/apps/:appId/versions/:id - Update a version
   */
  @Put('/:appId/versions/:id')
  async updateVersion(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() data: UpdateVersionDto
  ) {
    const version = await this.appVersionService.updateVersion(id, user.id, data);
    if (!version) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Version not found');
    }
    return ResponseUtility.success(version);
  }

  /**
   * DELETE /api/v1/apps/:appId/versions/:id - Delete a version
   */
  @Delete('/:appId/versions/:id')
  async deleteVersion(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const success = await this.appVersionService.deleteVersion(id, user.id);
    if (!success) {
      return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Version not found');
    }
    return ResponseUtility.success({ success: true });
  }
}
