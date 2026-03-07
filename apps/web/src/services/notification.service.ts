import { Service } from '@rabjs/react';
import { notificationApi } from '../api/notification';
import type { NotificationDto, QueryNotificationDto } from '@x-console/dto';

/**
 * Notification Service
 * Manages notification state and operations
 */
export class NotificationService extends Service {
  // State
  notifications: NotificationDto[] = [];
  total = 0;
  unreadCount = 0;
  isLoading = false;
  error: string | null = null;

  // Filter state
  currentFilter: QueryNotificationDto = {
    limit: 20,
    offset: 0,
  };

  /**
   * Load notifications with optional filters
   */
  async loadNotifications(params?: QueryNotificationDto): Promise<void> {
    this.isLoading = true;
    this.error = null;

    // Merge params with current filter
    this.currentFilter = {
      ...this.currentFilter,
      ...params,
    };

    try {
      const data = await notificationApi.getNotifications(this.currentFilter);
      this.notifications = data.notifications;
      this.total = data.total;
    } catch (err) {
      this.error = 'Failed to load notifications';
      console.error('Load notifications error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load more notifications (pagination)
   */
  async loadMore(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    const newOffset = this.notifications.length;

    try {
      const data = await notificationApi.getNotifications({
        ...this.currentFilter,
        offset: newOffset,
      });
      // Append new notifications, avoiding duplicates
      const existingIds = new Set(this.notifications.map((n) => n.id));
      const newNotifications = data.notifications.filter((n) => !existingIds.has(n.id));
      // Since backend returns notifications in descending order by createdAt,
      // new notifications should be appended to the end (they are older)
      this.notifications = [...this.notifications, ...newNotifications];
      this.total = data.total;
    } catch (err) {
      this.error = 'Failed to load more notifications';
      console.error('Load more notifications error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      const notification = await notificationApi.markAsRead(id);
      // Update local state
      this.notifications = this.notifications.map((n) => (n.id === id ? notification : n));
      // Decrement unread count if was unread
      if (notification.status === 'read') {
        this.decrementUnreadCount();
      }
      return true;
    } catch (err) {
      console.error('Mark as read error:', err);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      await notificationApi.markAllAsRead();
      // Update local state
      this.notifications = this.notifications.map((n) => ({
        ...n,
        status: 'read',
      }));
      // Reset unread count
      this.resetUnreadCount();
      return true;
    } catch (err) {
      console.error('Mark all as read error:', err);
      return false;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      await notificationApi.deleteNotification(id);
      // Remove from local state
      this.notifications = this.notifications.filter((n) => n.id !== id);
      this.total = Math.max(0, this.total - 1);
      return true;
    } catch (err) {
      console.error('Delete notification error:', err);
      return false;
    }
  }

  /**
   * Filter by status
   */
  filterByStatus(status: 'unread' | 'read'): void {
    this.loadNotifications({
      ...this.currentFilter,
      status,
      offset: 0,
    });
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.notifications = [];
    this.total = 0;
    this.unreadCount = 0;
    this.error = null;
  }

  /**
   * Load unread notification count only (for badge)
   */
  async loadUnreadCount(): Promise<void> {
    try {
      const data = await notificationApi.getUnreadCount();
      this.unreadCount = data.count;
    } catch (err) {
      console.error('Load unread count error:', err);
    }
  }

  /**
   * Increment unread count when new notification arrives via socket
   */
  incrementUnreadCount(): void {
    this.unreadCount += 1;
  }

  /**
   * Decrement unread count (e.g., when notification is read)
   */
  decrementUnreadCount(): void {
    this.unreadCount = Math.max(0, this.unreadCount - 1);
  }

  /**
   * Reset unread count to zero
   */
  resetUnreadCount(): void {
    this.unreadCount = 0;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
