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

export const PushEventType = {
  NOTIFICATION: 'notification',
  NOTIFICATION_UPDATE: 'notification:update',
} as const;

export type PushEventType = (typeof PushEventType)[keyof typeof PushEventType];

export interface PushPayload<T = unknown> {
  type: PushEventType;
  data: T;
  timestamp: string;
}

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

export class SocketIOService extends Service {
  private socket: Socket | null = null;
  private notificationPermission: NotificationPermission = 'default';

  constructor() {
    super();
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  private getSocketIOUrl(): string {
    if (import.meta.env.VITE_SOCKET_IO_URL) {
      return import.meta.env.VITE_SOCKET_IO_URL;
    }
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      return `${protocol}//${window.location.host}`;
    }
    return '';
  }

  connect(): void {
    if (!authService.isAuthenticated) return;
    if (this.socket?.connected) return;

    this.socket = io(this.getSocketIOUrl(), {
      path: '/socket.io',
      withCredentials: true,
      auth: { token: authService.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      // Server auto-joins the user room on connection — no join-room emit needed
    });

    this.socket.on('disconnect', (_reason) => {
      // reconnection handled automatically by socket.io client
    });

    this.socket.on(PushEventType.NOTIFICATION, (payload: PushPayload<NotificationPushPayload>) => {
      this.handleNotification(payload.data);
    });

    this.socket.on(PushEventType.NOTIFICATION_UPDATE, (payload: PushPayload<NotificationPushPayload>) => {
      this.handleNotificationUpdate(payload.data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (this.notificationPermission === 'granted') return true;
    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  setupNotificationClickHandler(callback: (notificationId: string) => void): void {
    if (!isElectron()) return;
    window.electronAPI?.onNotificationClick?.((data) => callback(data.id));
  }

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
      updatedAt: payload.createdAt,
    };
  }

  private handleNotification(payload: NotificationPushPayload): void {
    const dto = this.convertToDto(payload);
    notificationService.notifications = [dto, ...notificationService.notifications];
    notificationService.total += 1;
    if (payload.status === 'unread') {
      notificationService.incrementUnreadCount();
    }
    this.showBrowserNotification(payload);
  }

  private handleNotificationUpdate(payload: NotificationPushPayload): void {
    const dto = this.convertToDto(payload);
    notificationService.notifications = notificationService.notifications.map((n) =>
      n.id === payload.id ? dto : n
    );
  }

  private showBrowserNotification(payload: NotificationPushPayload): void {
    if (isElectron()) {
      this.showElectronNotification(payload);
      return;
    }

    if (this.notificationPermission !== 'granted') {
      if (this.notificationPermission === 'default') {
        this.requestNotificationPermission().then((granted) => {
          if (granted) this.showBrowserNotification(payload);
        });
      }
      return;
    }

    try {
      const notification = new Notification('Console 通知', {
        body: payload.summary || payload.content,
        icon: '/logo.png',
        tag: payload.id,
        requireInteraction: false,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      setTimeout(() => notification.close(), 5000);
    } catch {
      // ignore notification errors
    }
  }

  private async showElectronNotification(payload: NotificationPushPayload): Promise<void> {
    if (!window.electronAPI?.showNotification) return;
    try {
      await window.electronAPI.showNotification({
        id: payload.id,
        title: 'Console 通知',
        body: payload.content,
      });
    } catch {
      // ignore
    }
  }
}

export const socketIOService = new SocketIOService();
