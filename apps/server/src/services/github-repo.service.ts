import { Service } from 'typedi';
import { eq } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { githubRepos } from '../db/schema/github-repos.js';
import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { getEncryptionService } from './encryption.service.js';

import type { GithubRepo, NewGithubRepo } from '../db/schema/github-repos.js';

export interface CreateGithubRepoData {
  name: string;
  full_name: string;
  pat: string; // Plaintext PAT
}

export interface UpdateGithubRepoData {
  name?: string;
  full_name?: string;
  pat?: string; // Plaintext PAT - if provided, will be re-encrypted
}

@Service()
export class GithubRepoService {
  /**
   * Create a new GitHub repository for a user
   * Encrypts the PAT before storing
   */
  async createRepo(userId: string, data: CreateGithubRepoData): Promise<GithubRepo> {
    try {
      const db = getDatabase();
      const encryptionService = getEncryptionService();

      // Encrypt PAT before storing
      const encryptedPat = encryptionService.encrypt(data.pat);

      const id = generateUid();
      const newRepo: NewGithubRepo = {
        id,
        userId,
        name: data.name,
        fullName: data.full_name,
        pat: encryptedPat,
      };

      await db.insert(githubRepos).values(newRepo);

      logger.info(`Created GitHub repo: ${id} for user: ${userId}`);

      // Return without the encrypted pat (use empty string for consistency)
      return {
        ...newRepo,
        pat: '',
      } as GithubRepo;
    } catch (error) {
      logger.error('Error creating GitHub repo:', error);
      throw error;
    }
  }

  /**
   * Get all GitHub repositories for a user
   * Returns repos without decrypted PAT
   */
  async getRepos(userId: string): Promise<GithubRepo[]> {
    try {
      const db = getDatabase();

      const results = await db
        .select({
          id: githubRepos.id,
          userId: githubRepos.userId,
          name: githubRepos.name,
          fullName: githubRepos.fullName,
          pat: githubRepos.pat,
          createdAt: githubRepos.createdAt,
          updatedAt: githubRepos.updatedAt,
        })
        .from(githubRepos)
        .where(eq(githubRepos.userId, userId))
        .orderBy(githubRepos.createdAt);

      // Return without actual PAT values (use empty string)
      return results.map((repo) => ({
        ...repo,
        pat: '',
      }));
    } catch (error) {
      logger.error('Error getting GitHub repos:', error);
      throw error;
    }
  }

  /**
   * Get a single GitHub repository by ID (verifies ownership)
   * Returns repo without decrypted PAT
   */
  async getRepo(id: string, userId: string): Promise<GithubRepo | null> {
    try {
      const db = getDatabase();

      const results = await db
        .select({
          id: githubRepos.id,
          userId: githubRepos.userId,
          name: githubRepos.name,
          fullName: githubRepos.fullName,
          pat: githubRepos.pat,
          createdAt: githubRepos.createdAt,
          updatedAt: githubRepos.updatedAt,
        })
        .from(githubRepos)
        .where(eq(githubRepos.id, id))
        .limit(1);

      const repo = results[0];

      // Verify ownership
      if (!repo || repo.userId !== userId) {
        return null;
      }

      // Return without actual PAT
      return {
        ...repo,
        pat: '',
      };
    } catch (error) {
      logger.error('Error getting GitHub repo:', error);
      throw error;
    }
  }

  /**
   * Get decrypted PAT for a repository
   */
  async getRepoToken(id: string, userId: string): Promise<string | null> {
    try {
      const db = getDatabase();
      const encryptionService = getEncryptionService();

      const results = await db
        .select({
          id: githubRepos.id,
          userId: githubRepos.userId,
          pat: githubRepos.pat,
        })
        .from(githubRepos)
        .where(eq(githubRepos.id, id))
        .limit(1);

      const repo = results[0];

      // Verify ownership
      if (!repo || repo.userId !== userId) {
        return null;
      }

      // Decrypt and return PAT
      return encryptionService.decrypt(repo.pat);
    } catch (error) {
      logger.error('Error getting GitHub repo token:', error);
      throw error;
    }
  }

  /**
   * Update a GitHub repository
   * Re-encrypts PAT if provided
   */
  async updateRepo(
    id: string,
    userId: string,
    data: UpdateGithubRepoData
  ): Promise<GithubRepo | null> {
    try {
      const db = getDatabase();
      const encryptionService = getEncryptionService();

      // First verify ownership
      const existing = await this.getRepo(id, userId);
      if (!existing) {
        return null;
      }

      // Build update data
      const updateData: Partial<NewGithubRepo> = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      if (data.full_name !== undefined) {
        updateData.fullName = data.full_name;
      }

      if (data.pat !== undefined) {
        // Re-encrypt the new PAT
        updateData.pat = encryptionService.encrypt(data.pat);
      }

      await db
        .update(githubRepos)
        .set(updateData)
        .where(eq(githubRepos.id, id));

      // Return updated repo without PAT
      const updated = await this.getRepo(id, userId);
      return updated;
    } catch (error) {
      logger.error('Error updating GitHub repo:', error);
      throw error;
    }
  }

  /**
   * Delete a GitHub repository
   */
  async deleteRepo(id: string, userId: string): Promise<boolean> {
    try {
      const db = getDatabase();

      // Verify ownership first
      const existing = await this.getRepo(id, userId);
      if (!existing) {
        return false;
      }

      await db.delete(githubRepos).where(eq(githubRepos.id, id));

      logger.info(`Deleted GitHub repo: ${id} for user: ${userId}`);

      return true;
    } catch (error) {
      logger.error('Error deleting GitHub repo:', error);
      throw error;
    }
  }
}
