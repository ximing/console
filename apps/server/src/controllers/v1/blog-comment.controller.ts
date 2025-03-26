import { JsonController, Get, Post, Delete, Body, Param, QueryParam, Req, UseBefore } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { requireVisitor } from '../../middlewares/visitor-auth.js';
import { commentLimiter } from '../../middlewares/blog-rate-limit.js';
import { BlogCommentService } from '../../services/blog-comment.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

import type { Request } from 'express';

@Service()
@JsonController('/api/v1/blog/comments')
export class BlogCommentController {
  constructor(private blogCommentService: BlogCommentService) {}

  @Get('/')
  async list(@QueryParam('postPath') postPath: string) {
    try {
      if (!postPath) return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'postPath is required');
      const comments = await this.blogCommentService.listByPost(postPath);
      return ResponseUtility.success(comments);
    } catch (error) {
      logger.error('blog list comments error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/')
  @UseBefore(commentLimiter, requireVisitor)
  async create(
    @Req() req: Request,
    @Body() body: { postPath?: string; content?: string; parentId?: string }
  ) {
    try {
      if (!body.postPath || !body.content?.trim()) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'postPath and content are required');
      }
      const result = await this.blogCommentService.create(
        req.visitor!,
        body.postPath,
        body.content,
        body.parentId
      );
      if (result === 'invalid_parent') return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '回复的评论不存在');
      if (result === 'too_long') return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '评论内容不能超过 2000 字');
      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('blog create comment error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Delete('/:id')
  @UseBefore(requireVisitor)
  async remove(@Req() req: Request, @Param('id') id: string) {
    try {
      const result = await this.blogCommentService.softDelete(id, req.visitor!);
      if (result === 'not_found') return ResponseUtility.error(ErrorCode.NOT_FOUND);
      if (result === 'forbidden') return ResponseUtility.error(ErrorCode.COMMENT_FORBIDDEN);
      return ResponseUtility.success({ id });
    } catch (error) {
      logger.error('blog delete comment error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
