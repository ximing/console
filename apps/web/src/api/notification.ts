import type { NotificationDto, NotificationListDto, QueryNotificationDto } from '@x-console/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

/**
 * Notification API endpoints
 */
export const notificationApi = {
  /**
   * Get notifications with filters
   */
  getNotifications: async (params?: QueryNotificationDto): Promise<NotificationListDto> => {
    const queryParams = new URLSearchParams();
    if (params?.channel) queryParams.set('channel', params.channel);
    if (params?.ownership) queryParams.set('ownership', params.ownership);
    if (params?.ownershipId) queryParams.set('ownershipId', params.ownershipId);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    const response = await request.get<unknown, ApiResponse<NotificationListDto>>(
      `/api/v1/notifications${query ? `?${query}` : ''}`
    );
    return response.data;
  },

  /**
   * Get a single notification by ID
   */
  getNotification: async (id: string): Promise<NotificationDto> => {
    const response = await request.get<unknown, ApiResponse<NotificationDto>>(
      `/api/v1/notifications/${id}`
    );
    return response.data;
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (id: string): Promise<NotificationDto> => {
    const response = await request.post<unknown, ApiResponse<NotificationDto>>(
      `/api/v1/notifications/${id}/read`
    );
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (params?: {
    channel?: string;
    ownership?: string;
    ownershipId?: string;
  }): Promise<{ markedCount: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.channel) queryParams.set('channel', params.channel);
    if (params?.ownership) queryParams.set('ownership', params.ownership);
    if (params?.ownershipId) queryParams.set('ownershipId', params.ownershipId);

    const query = queryParams.toString();
    const response = await request.post<unknown, ApiResponse<{ markedCount: number }>>(
      `/api/v1/notifications/read-all${query ? `?${query}` : ''}`
    );
    return response.data;
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/notifications/${id}`
    );
    return response.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (params?: {
    channel?: string;
    ownership?: string;
    ownershipId?: string;
  }): Promise<{ count: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.channel) queryParams.set('channel', params.channel);
    if (params?.ownership) queryParams.set('ownership', params.ownership);
    if (params?.ownershipId) queryParams.set('ownershipId', params.ownershipId);

    const query = queryParams.toString();
    const response = await request.get<unknown, ApiResponse<{ count: number }>>(
      `/api/v1/notifications/unread-count${query ? `?${query}` : ''}`
    );
    return response.data;
  },
};
