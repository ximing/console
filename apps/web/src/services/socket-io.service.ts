import { Service } from '@rabjs/react';
import { io, Socket } from 'socket.io-client';
import type {
  NotificationChannel,
  NotificationOwnership,
  NotificationStatus,
  NotificationDto,
} from '@x-console/dto';
import { authService } from './auth.service';
import { notificationService } from './notification.service';
import { isElectron } from '../electron/isElectron';

/**
 * Push event types supported by the client
 * Using const instead of enum for compatibility with erasableSyntaxOnly
 */
export const PushEventType = {
  NOTIFICATION: 'notification',
  NOTIFICATION_UPDATE: 'notification:update',
} as const;

export type PushEventType = (typeof PushEventType)[keyof typeof PushEventType];

/**
 * Generic push payload from server
 */
export interface PushPayload<T = unknown> {
  type: PushEventType;
  data: T;
  timestamp: string;
}

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
 * Event handler type for push events
 */
export type PushEventHandler<T = unknown> = (data: T) => void;

/**
 * Socket.IO Client Service
 * Handles real-time push events on the web client
 * Supports multiple event types (notifications, updates, etc.)
 */
export class SocketIOService extends Service {
  private socket: Socket | null = null;
  private notificationPermission: NotificationPermission = 'default';

  // Event handlers map (extensible system)
  private eventHandlers: Map<PushEventType, Set<PushEventHandler>> = new Map();

  // Legacy callbacks for backward compatibility
  onNotification?: (notification: NotificationPushPayload) => void;
  onNotificationUpdate?: (notification: NotificationPushPayload) => void;

  constructor() {
    super();
    // Check notification permission on init
    this.checkNotificationPermission();
  }

  /**
   * Get the API base URL for Socket.IO connection
   * Uses relative URL to work with Vite proxy in dev and direct server in prod
   */
  private getSocketIOUrl(): string {
    // Use environment variable if set
    if (import.meta.env.VITE_SOCKET_IO_URL) {
      return import.meta.env.VITE_SOCKET_IO_URL;
    }

    // In development, use relative URL (goes through Vite proxy)
    // In production, use the current host
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const host = window.location.host;
      return `${protocol}//${host}`;
    }

    return '';
  }

  /**
   * Get the user room name for the current user
   */
  private getUserRoom(): string {
    const userId = authService.user?.id;
    return userId ? `user:${userId}` : '';
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
    if (!authService.isAuthenticated) {
      console.warn('Cannot connect to Socket.IO: user not authenticated');
      return;
    }

    // Already connected
    if (this.socket?.connected) {
      console.log('Socket.IO already connected');
      return;
    }

    const socketUrl = this.getSocketIOUrl();
    console.log('Connecting to Socket.IO at:', socketUrl);

    // Get token from auth service for authentication
    const token = authService.token;
    console.log('Socket.IO auth token present:', !!token);

    this.socket = io(socketUrl, {
      path: '/socket.io',
      withCredentials: true,
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket?.id);

      // Join user-specific room for multi-tab support
      const userRoom = this.getUserRoom();
      if (userRoom) {
        this.socket?.emit('join-room', userRoom);
        console.log('Joined room:', userRoom);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
    });

    this.socket.io.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });

    this.socket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket.IO reconnect attempt:', attemptNumber);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('Socket.IO reconnect failed');
    });

    // Listen for notification events using the new extensible system
    this.setupNotificationListeners();
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
    if (!this.socket) return;

    // Listen for notification events
    this.socket.on(PushEventType.NOTIFICATION, (payload: PushPayload<NotificationPushPayload>) => {
      console.log('Received notification:', payload);
      this.handleNotification(payload.data);
    });

    // Listen for notification update events
    this.socket.on(
      PushEventType.NOTIFICATION_UPDATE,
      (payload: PushPayload<NotificationPushPayload>) => {
        console.log('Received notification update:', payload);
        this.handleNotificationUpdate(payload.data);
      }
    );

    // Future: add more event listeners here as needed
    // this.socket.on(PushEventType.MEMO_SHARED, (payload) => { ... });
    // this.socket.on(PushEventType.MEMO_COMMENT, (payload) => { ... });
  }

  /**
   * Register an event handler for a specific push event type
   * This allows extensibility for future event types
   */
  registerHandler<T = unknown>(eventType: PushEventType, handler: PushEventHandler<T>): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    this.eventHandlers.get(eventType)!.add(handler as PushEventHandler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler as PushEventHandler);
    };
  }

  /**
   * Emit an event to the server
   */
  emitSocketEvent(event: string, data: unknown): void {
    if (!this.socket?.connected) {
      console.warn('Cannot emit event: socket not connected');
      return;
    }

    this.socket.emit(event, data);
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
   * Convert NotificationPushPayload to NotificationDto
   */
  private convertToDto(payload: NotificationPushPayload): NotificationDto {
    return {
      id: payload.id,
      channel: payload.channel,
      ownership: payload.ownership,
      ownershipId: payload.ownershipId,
      content: payload.content,
      messageType: payload.messageType as NotificationDto['messageType'],
      status: payload.status,
      createdAt: payload.createdAt,
      updatedAt: payload.createdAt, // Use createdAt as fallback for updatedAt
    };
  }

  /**
   * Handle incoming notification
   */
  private handleNotification(payload: NotificationPushPayload): void {
    console.log('handleNotification called with:', payload.id, payload.content);

    const dto = this.convertToDto(payload);
    // Add to notification service
    notificationService.notifications = [dto, ...notificationService.notifications];
    notificationService.total += 1;

    // Increment unread count for badge
    if (payload.status === 'unread') {
      notificationService.incrementUnreadCount();
    }

    // Trigger callback
    this.onNotification?.(payload);

    // Show browser notification if permitted
    this.showBrowserNotification(payload);
  }

  /**
   * Handle notification update
   */
  private handleNotificationUpdate(payload: NotificationPushPayload): void {
    const dto = this.convertToDto(payload);
    // Update in notification service
    notificationService.notifications = notificationService.notifications.map((n) =>
      n.id === payload.id ? dto : n
    );

    // Trigger callback
    this.onNotificationUpdate?.(payload);
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(payload: NotificationPushPayload): void {
    console.log(
      'Showing notification, permission:',
      this.notificationPermission,
      'isElectron:',
      isElectron()
    );

    // Use Electron's Notification API if running in Electron
    if (isElectron()) {
      this.showElectronNotification(payload);
      return;
    }

    // Use browser Notification API for web
    if (this.notificationPermission !== 'granted') {
      // Try to request permission if not denied
      if (this.notificationPermission === 'default') {
        console.log('Requesting notification permission...');
        this.requestNotificationPermission().then((granted) => {
          if (granted) {
            console.log('Notification permission granted, showing notification');
            this.showBrowserNotification(payload);
          }
        });
        return;
      }
      // Fallback: show in-page notification via toast or console
      console.log('Notification (no permission):', payload.content);
      return;
    }

    try {
      const notification = new Notification('Console 通知', {
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
    console.log(
      'Attempting to show Electron notification, electronAPI exists:',
      !!window.electronAPI
    );

    if (!window.electronAPI?.showNotification) {
      console.warn('Electron notification API not available, electronAPI:', window.electronAPI);
      return;
    }

    try {
      console.log('Showing Electron notification:', payload.id, payload.content);
      const result = await window.electronAPI.showNotification({
        id: payload.id,
        title: 'Console 通知',
        body: payload.content,
      });

      console.log('Electron notification result:', result);
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
