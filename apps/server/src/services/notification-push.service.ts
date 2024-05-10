import { Service } from 'typedi';
import { NotificationService } from './notification.service.js';
import { SocketIOService, PushEventType } from './socket-io.service.js';
import { logger } from '../utils/logger.js';

import type { Notification } from '../db/schema/notifications.js';
import type {
  NotificationChannel,
  NotificationOwnership,
  NotificationStatus,
} from '@aimo-console/dto';

/**
 * Notification push payload sent to clients
 */
export interface NotificationPushPayload {
  id: string;
  channel: NotificationChannel;
  ownership: NotificationOwnership;
  ownershipId: string;
  content: string;
  messageType: string;
  status: NotificationStatus;
  summary: string;
  createdAt: string;
}

@Service()
export class NotificationPushService {
  constructor(
    private notificationService: NotificationService,
    private socketIOService: SocketIOService
  ) {}

  /**
   * Generate a summary from notification content
   */
  private generateSummary(content: string, maxLength: number = 50): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Convert notification to push payload
   */
  private toPushPayload(notification: Notification): NotificationPushPayload {
    return {
      id: notification.id,
      channel: notification.channel,
      ownership: notification.ownership,
      ownershipId: notification.ownershipId,
      content: notification.content,
      messageType: notification.messageType,
      status: notification.status,
      summary: this.generateSummary(notification.content),
      createdAt: notification.createdAt.toISOString(),
    };
  }

  /**
   * Push notification to a specific user
   */
  pushNotificationToUser(userId: string, notification: Notification): void {
    const payload = this.toPushPayload(notification);

    // Use the new room-based sendToUser method
    this.socketIOService.sendToUser(userId, PushEventType.NOTIFICATION, payload);

    logger.info(`Pushed notification ${notification.id} to user ${userId}`);
  }

  /**
   * Create notification and push to user
   * This is the main entry point for creating notifications with push
   */
  async createAndPushNotification(
    userId: string,
    data: {
      channel: NotificationChannel;
      ownership: NotificationOwnership;
      ownershipId: string;
      content: string;
      messageType?: 'text' | 'image' | 'file' | 'link' | 'mixed';
    }
  ): Promise<Notification> {
    // Create the notification
    const notification = await this.notificationService.createNotification(data);

    // Push to user
    this.pushNotificationToUser(userId, notification);

    return notification;
  }

  /**
   * Push notification update to user (e.g., status change)
   */
  pushNotificationUpdate(userId: string, notification: Notification): void {
    const payload = this.toPushPayload(notification);

    // Use the new room-based sendToUser method
    this.socketIOService.sendToUser(userId, PushEventType.NOTIFICATION_UPDATE, payload);

    logger.info(`Pushed notification update ${notification.id} to user ${userId}`);
  }
}
