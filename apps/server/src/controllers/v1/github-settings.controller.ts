import { JsonController, Get, Put, Body, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { GithubSettingsService } from '../../services/github-settings.service.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { ResponseUtil } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

import type { GithubSettingsDto, UpdateGithubSettingsDto, UserInfoDto } from '@x-console/dto';

@Service()
@JsonController('/api/v1/github/settings')
export class GithubSettingsController {
  constructor(private githubSettingsService: GithubSettingsService) {}

  /**
   * GET /api/v1/github/settings - Get user's GitHub settings
   */
  @Get('/')
  async getSettings(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const settings = await this.githubSettingsService.getSettings(userDto.id);

      if (!settings) {
        // Return empty settings if none exist
        const emptySettings: GithubSettingsDto = {
          has_token: false,
        };
        return ResponseUtil.success(emptySettings);
      }

      return ResponseUtil.success(settings);
    } catch (error) {
      logger.error('Get GitHub settings error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/github/settings - Update user's GitHub settings
   */
  @Put('/')
  async updateSettings(@CurrentUser() userDto: UserInfoDto, @Body() body: UpdateGithubSettingsDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      if (!body.pat || body.pat.trim().length === 0) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'PAT is required');
      }

      const settings = await this.githubSettingsService.updateSettings(userDto.id, body.pat.trim());

      return ResponseUtil.success(settings);
    } catch (error) {
      logger.error('Update GitHub settings error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }
}
