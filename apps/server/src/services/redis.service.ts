import { Redis } from 'ioredis';
import type { Redis as RedisType } from 'ioredis';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

@Service()
export class RedisService {
  private client: RedisType | null = null;
  private subscriber: RedisType | null = null;
  private publisher: RedisType | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  private initialize() {
    const redisConfig = config.redis;

    if (!redisConfig?.enabled) {
      logger.info('Redis is disabled, RedisService will not connect');
      this.isEnabled = false;
      return;
    }

    this.isEnabled = true;

    // Create main client
    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
      connectTimeout: redisConfig.connectTimeout,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    // Create separate clients for pub/sub
    this.subscriber = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
      connectTimeout: redisConfig.connectTimeout,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    });

    this.publisher = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
      connectTimeout: redisConfig.connectTimeout,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    });

    // Handle connection events
    this.client.on('connect', () => {
      logger.info('Redis client connected', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db,
      });
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });
  }

  /**
   * Check if Redis is enabled and connected
   */
  isAvailable(): boolean {
    return this.isEnabled && this.client !== null && this.client.status === 'ready';
  }

  /**
   * Get the main Redis client
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * Get the publisher client for pub/sub
   */
  getPublisher(): Redis | null {
    return this.publisher;
  }

  /**
   * Get the subscriber client for pub/sub
   */
  getSubscriber(): Redis | null {
    return this.subscriber;
  }

  // ==================== String Operations ====================

  /**
   * Set a string value
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    const fullKey = this.addPrefix(key);
    if (ttlSeconds) {
      await this.client!.setex(fullKey, ttlSeconds, value);
    } else {
      await this.client!.set(fullKey, value);
    }
  }

  /**
   * Get a string value
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.get(this.addPrefix(key));
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(items: Record<string, string>): Promise<void> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    const prefixedItems: Record<string, string> = {};
    for (const [key, value] of Object.entries(items)) {
      prefixedItems[this.addPrefix(key)] = value;
    }
    await this.client!.mset(prefixedItems);
  }

  /**
   * Get multiple values
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    const prefixedKeys = keys.map((k) => this.addPrefix(k));
    return this.client!.mget(...prefixedKeys);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.del(this.addPrefix(key));
  }

  /**
   * Delete multiple keys
   */
  async mdel(keys: string[]): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    const prefixedKeys = keys.map((k) => this.addPrefix(k));
    return this.client!.del(...prefixedKeys);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    const result = await this.client!.exists(this.addPrefix(key));
    return result === 1;
  }

  /**
   * Set key expiration (TTL in seconds)
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    await this.client!.expire(this.addPrefix(key), ttlSeconds);
  }

  /**
   * Get key TTL
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.ttl(this.addPrefix(key));
  }

  // ==================== Hash Operations ====================

  /**
   * Set a hash field
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    await this.client!.hset(this.addPrefix(key), field, value);
  }

  /**
   * Set multiple hash fields
   */
  async hmset(key: string, data: Record<string, string>): Promise<void> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    await this.client!.hmset(this.addPrefix(key), data);
  }

  /**
   * Get a hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.hget(this.addPrefix(key), field);
  }

  /**
   * Get all hash fields and values
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.hgetall(this.addPrefix(key));
  }

  /**
   * Get multiple hash fields
   */
  async hmget(key: string, fields: string[]): Promise<(string | null)[]> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.hmget(this.addPrefix(key), ...fields);
  }

  /**
   * Delete hash fields
   */
  async hdel(key: string, fields: string[]): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.hdel(this.addPrefix(key), ...fields);
  }

  /**
   * Check if hash field exists
   */
  async hexists(key: string, field: string): Promise<boolean> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    const result = await this.client!.hexists(this.addPrefix(key), field);
    return result === 1;
  }

  // ==================== List Operations ====================

  /**
   * Push to list (right)
   */
  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.rpush(this.addPrefix(key), ...values);
  }

  /**
   * Push to list (left)
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.lpush(this.addPrefix(key), ...values);
  }

  /**
   * Get list range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.lrange(this.addPrefix(key), start, stop);
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.llen(this.addPrefix(key));
  }

  // ==================== Set Operations ====================

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.sadd(this.addPrefix(key), ...members);
  }

  /**
   * Remove from set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.srem(this.addPrefix(key), ...members);
  }

  /**
   * Get all set members
   */
  async smembers(key: string): Promise<string[]> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.smembers(this.addPrefix(key));
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    const result = await this.client!.sismember(this.addPrefix(key), member);
    return result === 1;
  }

  // ==================== Sorted Set Operations ====================

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.zadd(this.addPrefix(key), score, member);
  }

  /**
   * Get sorted set range (ascending)
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.zrange(this.addPrefix(key), start, stop);
  }

  /**
   * Get sorted set range with scores
   */
  async zrangeWithScores(key: string, start: number, stop: number): Promise<Array<{ member: string; score: number }>> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    const result = await this.client!.zrange(this.addPrefix(key), start, stop, 'WITHSCORES');
    const items: Array<{ member: string; score: number }> = [];
    for (let i = 0; i < result.length; i += 2) {
      items.push({
        member: result[i],
        score: Number(result[i + 1]),
      });
    }
    return items;
  }

  // ==================== Pub/Sub Operations ====================

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.subscriber || !this.isEnabled) {
      throw new Error('Redis is not available for subscribe');
    }

    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  /**
   * Publish to a channel
   */
  async publish(channel: string, message: string): Promise<number> {
    if (!this.publisher || !this.isEnabled) {
      throw new Error('Redis is not available for publish');
    }
    return this.publisher.publish(channel, message);
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber || !this.isEnabled) {
      return;
    }
    await this.subscriber.unsubscribe(channel);
  }

  // ==================== Utility Methods ====================

  /**
   * Add key prefix
   */
  private addPrefix(key: string): string {
    const prefix = config.redis?.keyPrefix || '';
    return `${prefix}${key}`;
  }

  /**
   * Increment a value
   */
  async incr(key: string): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.incr(this.addPrefix(key));
  }

  /**
   * Increment by amount
   */
  async incrby(key: string, amount: number): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.incrby(this.addPrefix(key), amount);
  }

  /**
   * Decrement a value
   */
  async decr(key: string): Promise<number> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    return this.client!.decr(this.addPrefix(key));
  }

  /**
   * Find keys by pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.isAvailable()) throw new Error('Redis is not available');
    const prefix = config.redis?.keyPrefix || '';
    return this.client!.keys(`${prefix}${pattern}`);
  }

  /**
   * Close all Redis connections
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    if (this.publisher) {
      await this.publisher.quit();
    }
    logger.info('Redis connections closed');
  }
}
