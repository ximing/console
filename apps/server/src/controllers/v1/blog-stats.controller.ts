import { JsonController, Get, Post, Body, QueryParam, UseBefore } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { viewLimiter } from '../../middlewares/blog-rate-limit.js';
import { BlogStatsService } from '../../services/blog-stats.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

@Service()
@JsonController('/api/v1/blog/stats')
export class BlogStatsController {
  constructor(private blogStatsService: BlogStatsService) {}

  @Post('/view')
  @UseBefore(viewLimiter)
  async recordView(@Body() body: { postPath?: string }) {
    try {
      if (!body.postPath) return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'postPath is required');
      return ResponseUtility.success(await this.blogStatsService.recordView(body.postPath));
    } catch (error) {
      logger.error('blog record view error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/')
  async list(@QueryParam('postPaths') postPaths: string) {
    try {
      if (!postPaths) return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'postPaths is required');
      const paths = postPaths.split(',').filter(Boolean).slice(0, 50);
      return ResponseUtility.success(await this.blogStatsService.getStats(paths));
    } catch (error) {
      logger.error('blog get stats error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
