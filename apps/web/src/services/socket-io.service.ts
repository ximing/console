import { Service } from '@rabjs/react';
import { io, Socket } from 'socket.io-client';
import type { NotificationChannel, NotificationOwnership, NotificationStatus } from '@aimo-console/dto';
import { authService } from './auth.service';
import { notificationService } from './notification.service';
import { isElectron } from '../electron/isElectron';

/**
 * Notification push payload received from server
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

/**
 * Socket.IO Client Service
 * Handles real-time notification push on the web client
 */
export class SocketIOService extends Service {
  private socket: Socket | null = null;
  private notificationPermission: NotificationPermission = 'default';

  // Callback for notification events (for external listeners)
  onNotification?: (notification: NotificationPushPayload) => void;
  onNotificationUpdate?: (notification: NotificationPushPayload) => void;

  constructor() {
    super();
    // Check notification permission on init
    this.checkNotificationPermission();
  }

  /**
   * Get the API base URL for Socket.IO connection
   */
  private getSocketIOUrl(): string {
    return '';
  }

  /**
   * Check browser notification permission
   */
  private async checkNotificationPermission(): Promise<void> {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (this.notificationPermission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Connect to Socket.IO server
   */
  connect(): void {
    // Check if user is authenticated
    if (!authService.token) {
      console.warn('Cannot connect to Socket.IO: user not authenticated');
      return;
    }

    // Already connected
    if (this.socket?.connected) {
      return;
    }

    const socketUrl = this.getSocketIOUrl();

    this.socket = io(socketUrl, {
      path: '/socket.io',
      auth: {
        token: authService.token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
    });

    // Listen for notification events
    this.socket.on('notification', (payload: NotificationPushPayload) => {
      console.log('Received notification:', payload);
      this.handleNotification(payload);
    });

    this.socket.on('notification:update', (payload: NotificationPushPayload) => {
      console.log('Received notification update:', payload);
      this.handleNotificationUpdate(payload);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Handle incoming notification
   */
  private handleNotification(payload: NotificationPushPayload): void {
    // Add to notification service
    notificationService.notifications = [payload, ...notificationService.notifications];
    notificationService.total += 1;

    // Trigger callback
    this.onNotification?.(payload);

    // Show browser notification if permitted
    this.showBrowserNotification(payload);
  }

  /**
   * Handle notification update
   */
  private handleNotificationUpdate(payload: NotificationPushPayload): void {
    // Update in notification service
    notificationService.notifications = notificationService.notifications.map((n) =>
      n.id === payload.id ? payload : n
    );

    // Trigger callback
    this.onNotificationUpdate?.(payload);
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(payload: NotificationPushPayload): void {
    // Use Electron's Notification API if running in Electron
    if (isElectron()) {
      this.showElectronNotification(payload);
      return;
    }

    // Use browser Notification API for web
    if (this.notificationPermission !== 'granted') {
      // Fallback: show in-page notification via toast or console
      console.log('Notification:', payload.content);
      return;
    }

    try {
      const notification = new Notification('AIMO 通知', {
        body: payload.content,
        icon: '/logo.png',
        tag: payload.id, // Prevent duplicate notifications
        requireInteraction: false,
      });

      notification.onclick = () => {
        // Focus the window and navigate to notification
        window.focus();
        // TODO: Navigate to the relevant page based on ownership/ownershipId
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }

  /**
   * Show Electron system notification
   */
  private async showElectronNotification(payload: NotificationPushPayload): Promise<void> {
    if (!window.electronAPI?.showNotification) {
      console.warn('Electron notification API not available');
      return;
    }

    try {
      const result = await window.electronAPI.showNotification({
        id: payload.id,
        title: 'AIMO 通知',
        body: payload.content,
      });

      if (!result.success) {
        console.error('Failed to show Electron notification:', result.error);
      }
    } catch (error) {
      console.error('Failed to show Electron notification:', error);
    }
  }

  /**
   * Set up notification click handler (for Electron click-to-navigate)
   */
  setupNotificationClickHandler(callback: (notificationId: string) => void): void {
    if (!isElectron()) {
      return;
    }

    if (window.electronAPI?.onNotificationClick) {
      window.electronAPI.onNotificationClick((data) => {
        callback(data.id);
      });
    }
  }

  /**
   * Check if socket is connected
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export singleton instance
export const socketIOService = new SocketIOService();
