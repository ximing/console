import { JsonController, Get, Post, Body, QueryParam, Req, UseBefore } from 'routing-controllers';
import { Service } from 'typedi';

import { config } from '../../config/config.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { likeLimiter } from '../../middlewares/blog-rate-limit.js';
import { optionalVisitor } from '../../middlewares/visitor-auth.js';
import { BlogLikeService } from '../../services/blog-like.service.js';
import { buildAnonKey } from '../../utils/anon-key.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

import type { Request } from 'express';

type TargetType = 'post' | 'comment';

function anonKeyOf(req: Request): string {
  const ip = req.ip ?? 'unknown';
  const ua = req.headers['user-agent'] ?? 'unknown';
  return buildAnonKey(ip, ua, config.blog.anonSalt);
}

function validTarget(targetType?: string): targetType is TargetType {
  return targetType === 'post' || targetType === 'comment';
}

@Service()
@JsonController('/api/v1/blog/likes')
export class BlogLikeController {
  constructor(private blogLikeService: BlogLikeService) {}

  @Post('/')
  @UseBefore(likeLimiter, optionalVisitor)
  async toggle(@Req() req: Request, @Body() body: { targetType?: string; targetId?: string }) {
    try {
      if (!validTarget(body.targetType) || !body.targetId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'targetType and targetId are required');
      }
      const result = await this.blogLikeService.toggle(
        body.targetType,
        body.targetId,
        req.visitor?.id ?? null,
        anonKeyOf(req)
      );
      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('blog toggle like error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/')
  @UseBefore(optionalVisitor)
  async list(
    @Req() req: Request,
    @QueryParam('targetType') targetType: string,
    @QueryParam('targetIds') targetIds: string
  ) {
    try {
      if (!validTarget(targetType) || !targetIds) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'targetType and targetIds are required');
      }
      const ids = targetIds.split(',').filter(Boolean).slice(0, 50);
      const result = await this.blogLikeService.listInfo(
        targetType,
        ids,
        req.visitor?.id ?? null,
        anonKeyOf(req)
      );
      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('blog list likes error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
