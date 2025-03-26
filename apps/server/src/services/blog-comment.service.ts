import { Service } from 'typedi';
import { and, eq, sql } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { blogComments } from '../db/schema/blog-comment.js';
import { blogPostStats } from '../db/schema/blog-post-stats.js';
import { blogVisitors } from '../db/schema/blog-visitor.js';
import { buildCommentTree } from '../utils/comment-tree.js';
import { generateUid } from '../utils/id.js';

import type { BlogComment } from '../db/schema/blog-comment.js';
import type { BlogVisitor } from '../db/schema/blog-visitor.js';
import type { BlogCommentDto } from '@x-console/dto';

const MAX_CONTENT_LENGTH = 2000;

function toDto(comment: BlogComment, author: BlogVisitor | undefined): BlogCommentDto {
  return {
    id: comment.id,
    postPath: comment.postPath,
    author: {
      id: author?.id ?? comment.visitorId,
      login: author?.login ?? 'unknown',
      name: author?.name ?? undefined,
      avatarUrl: author?.avatarUrl ?? undefined,
    },
    parentId: comment.parentId ?? undefined,
    content: comment.status === 'deleted' ? '' : comment.content,
    status: comment.status as 'visible' | 'deleted',
    likeCount: comment.likeCount,
    createdAt: comment.createdAt.toISOString(),
  };
}

@Service()
export class BlogCommentService {
  async listByPost(postPath: string): Promise<BlogCommentDto[]> {
    const db = getDatabase();
    const comments = await db
      .select()
      .from(blogComments)
      .where(eq(blogComments.postPath, postPath));
    const visitorIds = [...new Set(comments.map((c) => c.visitorId))];
    const visitors = visitorIds.length
      ? await db
          .select()
          .from(blogVisitors)
          .where(sql`${blogVisitors.id} IN (${sql.join(visitorIds.map((id) => sql`${id}`), sql`, `)})`)
      : [];
    const visitorMap = new Map<string, BlogVisitor>(visitors.map((v) => [v.id, v]));
    const tree = buildCommentTree<BlogComment>(comments);
    return tree.map((node) => ({
      ...toDto(node.item, visitorMap.get(node.item.visitorId)),
      replies: node.replies.map((r) => toDto(r, visitorMap.get(r.visitorId))),
    }));
  }

  async create(
    visitor: BlogVisitor,
    postPath: string,
    content: string,
    parentId?: string
  ): Promise<BlogCommentDto | 'invalid_parent' | 'too_long'> {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_CONTENT_LENGTH) return 'too_long';

    const db = getDatabase();
    if (parentId) {
      const parent = await db
        .select()
        .from(blogComments)
        .where(and(eq(blogComments.id, parentId), eq(blogComments.postPath, postPath)))
        .limit(1);
      // replies hang on top-level comments only
      if (!parent[0] || parent[0].parentId) return 'invalid_parent';
    }

    const id = generateUid();
    await db.insert(blogComments).values({ id, postPath, visitorId: visitor.id, parentId: parentId ?? null, content: trimmed });
    await db
      .insert(blogPostStats)
      .values({ postPath, commentCount: 1 })
      .onDuplicateKeyUpdate({ set: { commentCount: sql`${blogPostStats.commentCount} + 1` } });

    const created = await db.select().from(blogComments).where(eq(blogComments.id, id)).limit(1);
    return toDto(created[0], visitor);
  }

  async softDelete(id: string, visitor: BlogVisitor): Promise<'ok' | 'forbidden' | 'not_found'> {
    const db = getDatabase();
    const rows = await db.select().from(blogComments).where(eq(blogComments.id, id)).limit(1);
    const comment = rows[0];
    if (!comment) return 'not_found';
    if (comment.visitorId !== visitor.id) return 'forbidden';
    if (comment.status === 'deleted') return 'ok';

    await db.update(blogComments).set({ status: 'deleted' }).where(eq(blogComments.id, id));
    await db
      .update(blogPostStats)
      .set({ commentCount: sql`GREATEST(${blogPostStats.commentCount} - 1, 0)` })
      .where(eq(blogPostStats.postPath, comment.postPath));
    return 'ok';
  }
}
