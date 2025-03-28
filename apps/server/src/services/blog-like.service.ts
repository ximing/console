import { Service } from 'typedi';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { blogComments } from '../db/schema/blog-comment.js';
import { blogLikes } from '../db/schema/blog-like.js';
import { blogPostStats } from '../db/schema/blog-post-stats.js';
import { resolveLikeActor } from '../utils/anon-key.js';
import { generateUid } from '../utils/id.js';

import type { BlogLikeInfoDto } from '@x-console/dto';

type TargetType = 'post' | 'comment';

@Service()
export class BlogLikeService {
  private actorCondition(targetType: TargetType, targetId: string, field: 'visitorId' | 'anonKey', value: string) {
    const base = and(eq(blogLikes.targetType, targetType), eq(blogLikes.targetId, targetId));
    return field === 'visitorId'
      ? and(base, eq(blogLikes.visitorId, value))
      : and(base, eq(blogLikes.anonKey, value), isNull(blogLikes.visitorId));
  }

  private async bumpCounter(targetType: TargetType, targetId: string, delta: 1 | -1) {
    const db = getDatabase();
    if (targetType === 'post') {
      await db
        .insert(blogPostStats)
        .values({ postPath: targetId, likeCount: delta === 1 ? 1 : 0 })
        .onDuplicateKeyUpdate({
          set: { likeCount: sql`GREATEST(${blogPostStats.likeCount} + ${delta}, 0)` },
        });
    } else {
      await db
        .update(blogComments)
        .set({ likeCount: sql`GREATEST(${blogComments.likeCount} + ${delta}, 0)` })
        .where(eq(blogComments.id, targetId));
    }
  }

  private async currentCount(targetType: TargetType, targetId: string): Promise<number> {
    const db = getDatabase();
    if (targetType === 'post') {
      const rows = await db.select().from(blogPostStats).where(eq(blogPostStats.postPath, targetId)).limit(1);
      return rows[0]?.likeCount ?? 0;
    }
    const rows = await db.select().from(blogComments).where(eq(blogComments.id, targetId)).limit(1);
    return rows[0]?.likeCount ?? 0;
  }

  async toggle(
    targetType: TargetType,
    targetId: string,
    visitorId: string | null,
    anonKey: string
  ): Promise<{ liked: boolean; likeCount: number }> {
    const db = getDatabase();
    const actor = resolveLikeActor(visitorId, anonKey);
    const existing = await db
      .select()
      .from(blogLikes)
      .where(this.actorCondition(targetType, targetId, actor.field, actor.value))
      .limit(1);

    if (existing[0]) {
      await db.delete(blogLikes).where(eq(blogLikes.id, existing[0].id));
      await this.bumpCounter(targetType, targetId, -1);
      return { liked: false, likeCount: await this.currentCount(targetType, targetId) };
    }

    await db.insert(blogLikes).values({
      id: generateUid(),
      targetType,
      targetId,
      visitorId: actor.field === 'visitorId' ? actor.value : null,
      anonKey: actor.field === 'anonKey' ? actor.value : null,
    });
    await this.bumpCounter(targetType, targetId, 1);
    return { liked: true, likeCount: await this.currentCount(targetType, targetId) };
  }

  async listInfo(
    targetType: TargetType,
    targetIds: string[],
    visitorId: string | null,
    anonKey: string
  ): Promise<BlogLikeInfoDto[]> {
    const db = getDatabase();
    const result: BlogLikeInfoDto[] = [];
    for (const targetId of targetIds) {
      const likeCount = await this.currentCount(targetType, targetId);
      let likedByMe = false;
      if (visitorId || anonKey) {
        const actor = resolveLikeActor(visitorId, anonKey);
        const rows = await db
          .select({ id: blogLikes.id })
          .from(blogLikes)
          .where(this.actorCondition(targetType, targetId, actor.field, actor.value))
          .limit(1);
        likedByMe = rows.length > 0;
      }
      result.push({ targetId, likeCount, likedByMe });
    }
    return result;
  }
}
