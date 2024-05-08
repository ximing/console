import { Service } from 'typedi';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

import { getDatabase } from '../db/connection.js';
import { userApiTokens } from '../db/schema/user-api-tokens.js';
import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import type { UserApiToken, NewUserApiToken } from '../db/schema/user-api-tokens.js';

export interface GeneratedToken {
  id: string;
  name: string;
  token: string; // Plaintext token (only returned once)
  prefix: string;
  createdAt: Date;
  expiresAt: Date | null;
}

@Service()
export class ApiTokenService {
  private readonly TOKEN_PREFIX = 'aik_';
  private readonly TOKEN_LENGTH = 32;

  /**
   * Hash a token using SHA-256
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a new random token
   */
  private generateRandomToken(): string {
    const randomBytes = crypto.randomBytes(this.TOKEN_LENGTH);
    return this.TOKEN_PREFIX + randomBytes.toString('hex');
  }

  /**
   * Generate a token prefix for display (e.g., "aik_a1b2c3")
   */
  private generatePrefix(token: string): string {
    return token.substring(0, 8);
  }

  /**
   * Generate a new API token for a user
   * Returns the plaintext token only once - it cannot be retrieved later
   */
  async generateToken(userId: string, name: string, expiresAt?: Date): Promise<GeneratedToken> {
    try {
      const db = getDatabase();

      // Generate plaintext token
      const plaintextToken = this.generateRandomToken();
      const hashedToken = this.hashToken(plaintextToken);
      const prefix = this.generatePrefix(plaintextToken);

      const id = generateUid();
      const newToken: NewUserApiToken = {
        id,
        userId,
        name,
        token: hashedToken,
        prefix,
        expiresAt: expiresAt || null,
      };

      await db.insert(userApiTokens).values(newToken);

      // Return with plaintext token (only time it's available)
      return {
        id,
        name,
        token: plaintextToken,
        prefix,
        createdAt: new Date(),
        expiresAt: expiresAt || null,
      };
    } catch (error) {
      logger.error('Error generating API token:', error);
      throw error;
    }
  }

  /**
   * Validate a token and return the associated user ID
   */
  async validateToken(plaintextToken: string): Promise<string | null> {
    try {
      const db = getDatabase();
      const hashedToken = this.hashToken(plaintextToken);

      // First, find tokens that match the hash
      const results = await db
        .select()
        .from(userApiTokens)
        .where(eq(userApiTokens.token, hashedToken));

      // Check each token (in case of hash collision, though unlikely)
      const now = new Date();
      for (const tokenRecord of results) {
        // Check if token has expired
        if (tokenRecord.expiresAt && tokenRecord.expiresAt < now) {
          continue;
        }

        // Token is valid - update last used timestamp
        await this.updateLastUsed(tokenRecord.id);
        return tokenRecord.userId;
      }

      return null;
    } catch (error) {
      logger.error('Error validating API token:', error);
      return null;
    }
  }

  /**
   * List all tokens for a user (without exposing the actual token)
   */
  async listTokens(userId: string): Promise<Omit<UserApiToken, 'token'>[]> {
    try {
      const db = getDatabase();
      const results = await db
        .select({
          id: userApiTokens.id,
          userId: userApiTokens.userId,
          name: userApiTokens.name,
          prefix: userApiTokens.prefix,
          createdAt: userApiTokens.createdAt,
          expiresAt: userApiTokens.expiresAt,
          lastUsedAt: userApiTokens.lastUsedAt,
        })
        .from(userApiTokens)
        .where(eq(userApiTokens.userId, userId))
        .orderBy(userApiTokens.createdAt);

      return results;
    } catch (error) {
      logger.error('Error listing API tokens:', error);
      throw error;
    }
  }

  /**
   * Delete a token
   */
  async deleteToken(id: string, userId: string): Promise<boolean> {
    try {
      const db = getDatabase();

      const result = await db
        .delete(userApiTokens)
        .where(and(eq(userApiTokens.id, id), eq(userApiTokens.userId, userId)));

      return true;
    } catch (error) {
      logger.error('Error deleting API token:', error);
      throw error;
    }
  }

  /**
   * Update the last used timestamp for a token
   */
  async updateLastUsed(id: string): Promise<void> {
    try {
      const db = getDatabase();

      await db
        .update(userApiTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(userApiTokens.id, id));
    } catch (error) {
      logger.error('Error updating token last used:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Get a single token by ID (for ownership verification)
   */
  async getToken(id: string, userId: string): Promise<UserApiToken | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(userApiTokens)
        .where(and(eq(userApiTokens.id, id), eq(userApiTokens.userId, userId)))
        .limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Error getting API token:', error);
      throw error;
    }
  }
}
