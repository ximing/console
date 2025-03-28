import { JsonController, Get, Patch, Body, Param, QueryParams, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';
import { and, desc, eq, sql, count, type SQL } from 'drizzle-orm';

import { ErrorCode } from '../../constants/error-codes.js';
import { getDatabase } from '../../db/connection.js';
import { blogComments } from '../../db/schema/blog-comment.js';
import { blogPostStats } from '../../db/schema/blog-post-stats.js';
import { blogVisitors } from '../../db/schema/blog-visitor.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

import type { UserInfoDto, BlogEngagementOverviewDto, BlogVisitorDto } from '@x-console/dto';

@Service()
@JsonController('/api/v1/admin/blog')
export class BlogAdminController {
  @Get('/comments')
  async listComments(
    @CurrentUser() userDto: UserInfoDto,
    @QueryParams() params: { page?: string; pageSize?: string; postPath?: string; status?: string }
  ) {
    try {
      if (!userDto?.id) return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      const db = getDatabase();
      const page = Math.max(1, Number(params.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
      const conditions: SQL[] = [];
      if (params.postPath) conditions.push(eq(blogComments.postPath, params.postPath));
      if (params.status === 'visible' || params.status === 'deleted') {
        conditions.push(eq(blogComments.status, params.status));
      }
      const where = conditions.length ? and(...conditions) : undefined;

      const rows = await db
        .select({ comment: blogComments, visitor: blogVisitors })
        .from(blogComments)
        .leftJoin(blogVisitors, eq(blogComments.visitorId, blogVisitors.id))
        .where(where)
        .orderBy(desc(blogComments.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const totalRows = await db.select({ count: count() }).from(blogComments).where(where);

      const comments = rows.map(({ comment, visitor }) => ({
        id: comment.id,
        postPath: comment.postPath,
        author: {
          id: visitor?.id ?? comment.visitorId,
          login: visitor?.login ?? 'unknown',
          name: visitor?.name ?? undefined,
          avatarUrl: visitor?.avatarUrl ?? undefined,
        },
        parentId: comment.parentId ?? undefined,
        content: comment.content,
        status: comment.status,
        likeCount: comment.likeCount,
        createdAt: comment.createdAt.toISOString(),
        visitorStatus: visitor?.status ?? 'active',
      }));
      return ResponseUtility.success({ comments, total: totalRows[0]?.count ?? 0 });
    } catch (error) {
      logger.error('admin list blog comments error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Patch('/comments/:id')
  async updateCommentStatus(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() body: { status?: string }
  ) {
    try {
      if (!userDto?.id) return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      if (body.status !== 'visible' && body.status !== 'deleted') {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'invalid status');
      }
      const db = getDatabase();
      const rows = await db.select().from(blogComments).where(eq(blogComments.id, id)).limit(1);
      const comment = rows[0];
      if (!comment) return ResponseUtility.error(ErrorCode.NOT_FOUND);
      if (comment.status !== body.status) {
        await db.update(blogComments).set({ status: body.status }).where(eq(blogComments.id, id));
        const delta = body.status === 'deleted' ? -1 : 1;
        await db
          .update(blogPostStats)
          .set({ commentCount: sql`GREATEST(${blogPostStats.commentCount} + ${delta}, 0)` })
          .where(eq(blogPostStats.postPath, comment.postPath));
      }
      return ResponseUtility.success({ id, status: body.status });
    } catch (error) {
      logger.error('admin update blog comment error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/stats')
  async overview(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      const db = getDatabase();
      const posts = await db
        .select()
        .from(blogPostStats)
        .orderBy(desc(blogPostStats.viewCount))
        .limit(200);
      const visitorRows = await db.select({ count: count() }).from(blogVisitors);
      const overview: BlogEngagementOverviewDto = {
        totalViews: posts.reduce((s, p) => s + p.viewCount, 0),
        totalLikes: posts.reduce((s, p) => s + p.likeCount, 0),
        totalComments: posts.reduce((s, p) => s + p.commentCount, 0),
        totalVisitors: visitorRows[0]?.count ?? 0,
        posts: posts.map((p) => ({
          postPath: p.postPath,
          viewCount: p.viewCount,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
        })),
      };
      return ResponseUtility.success(overview);
    } catch (error) {
      logger.error('admin blog stats error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/visitors')
  async listVisitors(
    @CurrentUser() userDto: UserInfoDto,
    @QueryParams() params: { page?: string; pageSize?: string }
  ) {
    try {
      if (!userDto?.id) return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      const db = getDatabase();
      const page = Math.max(1, Number(params.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
      const rows = await db
        .select()
        .from(blogVisitors)
        .orderBy(desc(blogVisitors.lastLoginAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const totalRows = await db.select({ count: count() }).from(blogVisitors);
      const commentCounts = await db
        .select({ visitorId: blogComments.visitorId, count: count() })
        .from(blogComments)
        .groupBy(blogComments.visitorId);
      const countMap = new Map(commentCounts.map((r) => [r.visitorId, r.count]));
      const visitors: BlogVisitorDto[] = rows.map((v) => ({
        id: v.id,
        githubId: v.githubId,
        login: v.login,
        name: v.name ?? undefined,
        avatarUrl: v.avatarUrl ?? undefined,
        status: v.status as 'active' | 'blocked',
        createdAt: v.createdAt.toISOString(),
        lastLoginAt: v.lastLoginAt.toISOString(),
        commentCount: countMap.get(v.id) ?? 0,
      }));
      return ResponseUtility.success({ visitors, total: totalRows[0]?.count ?? 0 });
    } catch (error) {
      logger.error('admin list blog visitors error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Patch('/visitors/:id')
  async updateVisitorStatus(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() body: { status?: string }
  ) {
    try {
      if (!userDto?.id) return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      if (body.status !== 'active' && body.status !== 'blocked') {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'invalid status');
      }
      const db = getDatabase();
      await db.update(blogVisitors).set({ status: body.status }).where(eq(blogVisitors.id, id));
      return ResponseUtility.success({ id, status: body.status });
    } catch (error) {
      logger.error('admin update blog visitor error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
