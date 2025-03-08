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
