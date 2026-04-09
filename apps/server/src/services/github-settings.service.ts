import { Service } from 'typedi';
import { eq, and } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { githubSettings } from '../db/schema/github-settings.js';
import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { getEncryptionService } from './encryption.service.js';

import type { GithubSettings, NewGithubSettings } from '../db/schema/github-settings.js';
import type { GithubSettingsDto } from '@x-console/dto';

@Service()
export class GithubSettingsService {
  /**
   * Get GitHub settings for a user
   * Returns settings without exposing the actual PAT
   */
  async getSettings(userId: string): Promise<GithubSettingsDto | null> {
    try {
      const db = getDatabase();

      const results = await db
        .select({
          id: githubSettings.id,
          userId: githubSettings.userId,
          encryptedPat: githubSettings.encryptedPat,
          createdAt: githubSettings.createdAt,
          updatedAt: githubSettings.updatedAt,
        })
        .from(githubSettings)
        .where(eq(githubSettings.userId, userId))
        .limit(1);

      const settings = results[0];

      if (!settings) {
        return null;
      }

      // Try to determine token scope by decrypting and checking
      // We don't return the actual token, just whether one exists and its scope
      const hasToken = !!settings.encryptedPat && settings.encryptedPat.length > 0;

      return {
        has_token: hasToken,
        updated_at: settings.updatedAt
          ? new Date(settings.updatedAt).toISOString()
          : undefined,
      };
    } catch (error) {
      logger.error('Error getting GitHub settings:', error);
      throw error;
    }
  }

  /**
   * Update GitHub settings for a user
   * Encrypts the PAT before storing
   */
  async updateSettings(userId: string, pat: string): Promise<GithubSettingsDto> {
    try {
      const db = getDatabase();
      const encryptionService = getEncryptionService();

      // Encrypt PAT before storing
      const encryptedPat = encryptionService.encrypt(pat);

      // Check if settings already exist
      const existing = await db
        .select({ id: githubSettings.id })
        .from(githubSettings)
        .where(eq(githubSettings.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing settings
        await db
          .update(githubSettings)
          .set({
            encryptedPat,
            updatedAt: new Date(),
          })
          .where(eq(githubSettings.userId, userId));
      } else {
        // Create new settings
        const id = generateUid();
        const newSettings: NewGithubSettings = {
          id,
          userId,
          encryptedPat,
        };

        await db.insert(githubSettings).values(newSettings);
      }

      logger.info(`Updated GitHub settings for user: ${userId}`);

      // Return without exposing PAT
      return {
        has_token: true,
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error updating GitHub settings:', error);
      throw error;
    }
  }

  /**
   * Get decrypted GitHub PAT for API calls
   */
  async getDecryptedToken(userId: string): Promise<string | null> {
    try {
      const db = getDatabase();
      const encryptionService = getEncryptionService();

      const results = await db
        .select({
          id: githubSettings.id,
          userId: githubSettings.userId,
          encryptedPat: githubSettings.encryptedPat,
        })
        .from(githubSettings)
        .where(eq(githubSettings.userId, userId))
        .limit(1);

      const settings = results[0];

      if (!settings || !settings.encryptedPat) {
        return null;
      }

      // Decrypt and return PAT
      return encryptionService.decrypt(settings.encryptedPat);
    } catch (error) {
      logger.error('Error getting decrypted GitHub token:', error);
      throw error;
    }
  }
}
