/**
 * Notification DTOs for message notification system
 */

// Enum types
export type NotificationChannel = 'wechat' | 'feishu' | 'dingtalk' | 'slack' | 'email' | 'webhook';
export type NotificationOwnership = 'group' | 'private';
export type NotificationMessageType = 'text' | 'image' | 'file' | 'link' | 'mixed';
export type NotificationStatus = 'unread' | 'read';

/**
 * DTO for creating a new notification
 */
export interface CreateNotificationDto {
  channel: NotificationChannel;
  ownership: NotificationOwnership;
  ownershipId: string;
  content: string;
  messageType?: NotificationMessageType;
}

/**
 * DTO for updating an existing notification
 */
export interface UpdateNotificationDto {
  status?: NotificationStatus;
  content?: string;
}

/**
 * DTO for query parameters
 */
export interface QueryNotificationDto {
  channel?: NotificationChannel;
  ownership?: NotificationOwnership;
  ownershipId?: string;
  status?: NotificationStatus;
  limit?: number;
  offset?: number;
}

/**
 * DTO for notification response
 */
export interface NotificationDto {
  id: string;
  channel: NotificationChannel;
  ownership: NotificationOwnership;
  ownershipId: string;
  content: string;
  messageType: NotificationMessageType;
  status: NotificationStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for notification list response
 */
export interface NotificationListDto {
  notifications: NotificationDto[];
  total: number;
}
