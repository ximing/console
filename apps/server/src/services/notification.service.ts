import { Service } from 'typedi';
import { eq, and, count, desc, type SQL } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import {
  notifications,
  type Notification,
  type NewNotification,
} from '../db/schema/notifications.js';
import { generateUid } from '../utils/id.js';

import type {
  NotificationChannel,
  NotificationOwnership,
  NotificationStatus,
} from '@x-console/dto';

@Service()
export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: {
    channel: NotificationChannel;
    ownership: NotificationOwnership;
    ownershipId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file' | 'link' | 'mixed';
  }): Promise<Notification> {
    const db = getDatabase();
    const id = generateUid();

    const newNotification: NewNotification = {
      id,
      channel: data.channel,
      ownership: data.ownership,
      ownershipId: data.ownershipId,
      content: data.content,
      messageType: data.messageType || 'text',
      status: 'unread',
    };

    await db.insert(notifications).values(newNotification);

    const [created] = await db.select().from(notifications).where(eq(notifications.id, id));
    return created;
  }

  /**
   * Get a notification by ID
   */
  async getNotificationById(id: string): Promise<Notification | null> {
    const db = getDatabase();
    const results = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Query notifications with filters and pagination
   */
  async queryNotifications(filters: {
    channel?: NotificationChannel;
    ownership?: NotificationOwnership;
    ownershipId?: string;
    status?: NotificationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: Notification[]; total: number }> {
    const db = getDatabase();

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Build conditions
    const conditions: SQL[] = [];

    if (filters.channel) {
      conditions.push(eq(notifications.channel, filters.channel));
    }
    if (filters.ownership) {
      conditions.push(eq(notifications.ownership, filters.ownership));
    }
    if (filters.ownershipId) {
      conditions.push(eq(notifications.ownershipId, filters.ownershipId));
    }
    if (filters.status) {
      conditions.push(eq(notifications.status, filters.status));
    }

    // Query with filters
    const results = await db
      .select()
      .from(notifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(notifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.count ?? 0;

    return { notifications: results, total };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<Notification | null> {
    const db = getDatabase();

    const existing = await this.getNotificationById(id);
    if (!existing) {
      return null;
    }

    await db.update(notifications).set({ status: 'read' }).where(eq(notifications.id, id));

    const [updated] = await db.select().from(notifications).where(eq(notifications.id, id));
    return updated;
  }

  /**
   * Mark all notifications as read (with optional filters)
   */
  async markAllAsRead(filters?: {
    channel?: NotificationChannel;
    ownership?: NotificationOwnership;
    ownershipId?: string;
  }): Promise<number> {
    const db = getDatabase();

    const conditions: SQL[] = [];

    if (filters?.channel) {
      conditions.push(eq(notifications.channel, filters.channel));
    }
    if (filters?.ownership) {
      conditions.push(eq(notifications.ownership, filters.ownership));
    }
    if (filters?.ownershipId) {
      conditions.push(eq(notifications.ownershipId, filters.ownershipId));
    }

    // Always filter to unread
    conditions.push(eq(notifications.status, 'unread'));

    const result = await db
      .update(notifications)
      .set({ status: 'read' })
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result.rowCount || 0;
  }

  /**
   * Update a notification
   */
  async updateNotification(
    id: string,
    updateData: {
      status?: NotificationStatus;
      content?: string;
    }
  ): Promise<Notification | null> {
    const db = getDatabase();

    const existing = await this.getNotificationById(id);
    if (!existing) {
      return null;
    }

    const setData: Partial<Notification> = {};

    if (updateData.status) {
      setData.status = updateData.status;
    }
    if (updateData.content !== undefined) {
      setData.content = updateData.content;
    }

    await db.update(notifications).set(setData).where(eq(notifications.id, id));

    const [updated] = await db.select().from(notifications).where(eq(notifications.id, id));
    return updated;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<boolean> {
    const db = getDatabase();

    const existing = await this.getNotificationById(id);
    if (!existing) {
      return false;
    }

    await db.delete(notifications).where(eq(notifications.id, id));

    return true;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(filters?: {
    channel?: NotificationChannel;
    ownership?: NotificationOwnership;
    ownershipId?: string;
  }): Promise<number> {
    const db = getDatabase();
    const conditions: SQL[] = [];

    // Always filter to unread status
    conditions.push(eq(notifications.status, 'unread'));

    if (filters?.channel) {
      conditions.push(eq(notifications.channel, filters.channel));
    }
    if (filters?.ownership) {
      conditions.push(eq(notifications.ownership, filters.ownership));
    }
    if (filters?.ownershipId) {
      conditions.push(eq(notifications.ownershipId, filters.ownershipId));
    }

    const countResult = await db
      .select({ count: count() })
      .from(notifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return countResult[0]?.count ?? 0;
  }
}
