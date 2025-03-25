import jwt from 'jsonwebtoken';
import { Service } from 'typedi';
import { eq } from 'drizzle-orm';

import { config } from '../config/config.js';
import { getDatabase } from '../db/connection.js';
import { blogVisitors } from '../db/schema/blog-visitor.js';
import { generateUid } from '../utils/id.js';

import type { BlogVisitor } from '../db/schema/blog-visitor.js';

export interface GithubProfile {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string;
}

@Service()
export class BlogVisitorService {
  async upsertFromGithubProfile(profile: GithubProfile): Promise<BlogVisitor> {
    const db = getDatabase();
    const githubId = String(profile.id);
    const existing = await db
      .select()
      .from(blogVisitors)
      .where(eq(blogVisitors.githubId, githubId))
      .limit(1);

    if (existing[0]) {
      await db
        .update(blogVisitors)
        .set({
          login: profile.login,
          name: profile.name ?? null,
          avatarUrl: profile.avatar_url ?? null,
          lastLoginAt: new Date(),
        })
        .where(eq(blogVisitors.id, existing[0].id));
      return { ...existing[0], login: profile.login, name: profile.name ?? null, avatarUrl: profile.avatar_url ?? null };
    }

    const id = generateUid();
    await db.insert(blogVisitors).values({
      id,
      githubId,
      login: profile.login,
      name: profile.name ?? null,
      avatarUrl: profile.avatar_url ?? null,
    });
    const created = await db.select().from(blogVisitors).where(eq(blogVisitors.id, id)).limit(1);
    return created[0];
  }

  async getById(id: string): Promise<BlogVisitor | null> {
    const db = getDatabase();
    const rows = await db.select().from(blogVisitors).where(eq(blogVisitors.id, id)).limit(1);
    return rows[0] ?? null;
  }

  signToken(visitorId: string): string {
    return jwt.sign({ vid: visitorId }, config.blog.visitorJwtSecret, { expiresIn: '30d' });
  }

  async resolveToken(token: string): Promise<BlogVisitor | null> {
    try {
      const decoded = jwt.verify(token, config.blog.visitorJwtSecret) as { vid: string };
      return await this.getById(decoded.vid);
    } catch {
      return null;
    }
  }
}
