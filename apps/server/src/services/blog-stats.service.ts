import { Service } from 'typedi';
import { eq, sql } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { blogPostStats } from '../db/schema/blog-post-stats.js';

import type { BlogPostStatsDto } from '@x-console/dto';

function toDto(row: typeof blogPostStats.$inferSelect): BlogPostStatsDto {
  return {
    postPath: row.postPath,
    viewCount: row.viewCount,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
  };
}

@Service()
export class BlogStatsService {
  async recordView(postPath: string): Promise<BlogPostStatsDto> {
    const db = getDatabase();
    await db
      .insert(blogPostStats)
      .values({ postPath, viewCount: 1 })
      .onDuplicateKeyUpdate({ set: { viewCount: sql`${blogPostStats.viewCount} + 1` } });
    const rows = await db.select().from(blogPostStats).where(eq(blogPostStats.postPath, postPath)).limit(1);
    return toDto(rows[0]);
  }

  async getStats(postPaths: string[]): Promise<BlogPostStatsDto[]> {
    if (!postPaths.length) return [];
    const db = getDatabase();
    const rows = await db
      .select()
      .from(blogPostStats)
      .where(sql`${blogPostStats.postPath} IN (${sql.join(postPaths.map((p) => sql`${p}`), sql`, `)})`);
    const map = new Map<string, typeof blogPostStats.$inferSelect>(rows.map((r) => [r.postPath, r]));
    return postPaths.map((p) =>
      map.has(p) ? toDto(map.get(p)!) : { postPath: p, viewCount: 0, likeCount: 0, commentCount: 0 }
    );
  }
}
