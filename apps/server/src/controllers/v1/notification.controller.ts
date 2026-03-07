import {
  JsonController,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  QueryParams,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { NotificationService } from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type {
  CreateNotificationDto,
  NotificationDto,
  NotificationListDto,
  QueryNotificationDto,
  UpdateNotificationDto,
  UserInfoDto,
} from '@x-console/dto';
import type { Notification } from '../../db/schema/notifications.js';

/**
 * Helper to convert Notification model to NotificationDto
 */
function convertNotificationToDto(notification: Notification): NotificationDto {
  return {
    id: notification.id,
    channel: notification.channel,
    ownership: notification.ownership,
    ownershipId: notification.ownershipId,
    content: notification.content,
    messageType: notification.messageType,
    status: notification.status,
    createdAt:
      notification.createdAt instanceof Date
        ? notification.createdAt.toISOString()
        : notification.createdAt,
    updatedAt:
      notification.updatedAt instanceof Date
        ? notification.updatedAt.toISOString()
        : notification.updatedAt,
  };
}

@Service()
@JsonController('/api/v1/notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * POST /api/v1/notifications - Create a new notification
   */
  @Post('/')
  async createNotification(@Body() createData: CreateNotificationDto) {
    try {
      // Validate required fields
      if (!createData.channel) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Channel is required');
      }

      if (!createData.ownership) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Ownership is required');
      }

      if (!createData.ownershipId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Ownership ID is required');
      }

      if (!createData.content || createData.content.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Content is required');
      }

      const notification = await this.notificationService.createNotification({
        channel: createData.channel,
        ownership: createData.ownership,
        ownershipId: createData.ownershipId,
        content: createData.content.trim(),
        messageType: createData.messageType,
      });

      return ResponseUtility.success(convertNotificationToDto(notification));
    } catch (error) {
      logger.error('Create notification error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/notifications - Query notifications with filters
   */
  @Get('/')
  async listNotifications(@QueryParams() params: QueryNotificationDto) {
    try {
      const limit = params.limit ? parseInt(String(params.limit), 10) : 20;
      const offset = params.offset ? parseInt(String(params.offset), 10) : 0;

      if (isNaN(limit) || isNaN(offset) || limit < 0 || offset < 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Invalid pagination parameters');
      }

      const result = await this.notificationService.queryNotifications({
        channel: params.channel,
        ownership: params.ownership,
        ownershipId: params.ownershipId,
        status: params.status,
        limit,
        offset,
      });

      const notificationDtos = result.notifications.map(convertNotificationToDto);

      const response: NotificationListDto = {
        notifications: notificationDtos,
        total: result.total,
      };

      return ResponseUtility.success(response);
    } catch (error) {
      logger.error('List notifications error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count - Get unread notification count
   */
  @Get('/unread-count')
  async getUnreadCount(
    @QueryParams() params: { channel?: string; ownership?: string; ownershipId?: string }
  ) {
    try {
      const filters: { channel?: string; ownership?: string; ownershipId?: string } = {};

      if (params.channel) {
        filters.channel = params.channel;
      }
      if (params.ownership) {
        filters.ownership = params.ownership;
      }
      if (params.ownershipId) {
        filters.ownershipId = params.ownershipId;
      }

      const count = await this.notificationService.getUnreadCount(
        filters.channel && filters.ownership && filters.ownershipId
          ? {
              channel: filters.channel as any,
              ownership: filters.ownership as any,
              ownershipId: filters.ownershipId,
            }
          : undefined
      );

      return ResponseUtility.success({ count });
    } catch (error) {
      logger.error('Get unread count error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
  /**
   * POST /api/v1/notifications/read-all - Mark all notifications as read
   */
  @Post('/read-all')
  async markAllAsRead(
    @QueryParams() params: { channel?: string; ownership?: string; ownershipId?: string }
  ) {
    try {
      const filters: { channel?: string; ownership?: string; ownershipId?: string } = {};

      if (params.channel) {
        filters.channel = params.channel;
      }
      if (params.ownership) {
        filters.ownership = params.ownership;
      }
      if (params.ownershipId) {
        filters.ownershipId = params.ownershipId;
      }

      const count = await this.notificationService.markAllAsRead(
        filters.channel && filters.ownership && filters.ownershipId
          ? {
              channel: filters.channel as any,
              ownership: filters.ownership as any,
              ownershipId: filters.ownershipId,
            }
          : undefined
      );

      return ResponseUtility.success({ markedCount: count });
    } catch (error) {
      logger.error('Mark all as read error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/notifications/:id/read - Mark notification as read
   */
  @Post('/:id/read')
  async markAsRead(@Param('id') id: string) {
    try {
      const notification = await this.notificationService.markAsRead(id);

      if (!notification) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Notification not found');
      }

      return ResponseUtility.success(convertNotificationToDto(notification));
    } catch (error) {
      logger.error('Mark as read error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/notifications/:id - Get notification details
   */
  @Get('/:id')
  async getNotification(@Param('id') id: string) {
    try {
      const notification = await this.notificationService.getNotificationById(id);

      if (!notification) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Notification not found');
      }

      return ResponseUtility.success(convertNotificationToDto(notification));
    } catch (error) {
      logger.error('Get notification error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id - Update notification
   */
  @Patch('/:id')
  async updateNotification(@Param('id') id: string, @Body() updateData: UpdateNotificationDto) {
    try {
      const notification = await this.notificationService.updateNotification(id, updateData);

      if (!notification) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Notification not found');
      }

      return ResponseUtility.success(convertNotificationToDto(notification));
    } catch (error) {
      logger.error('Update notification error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/notifications/:id - Delete notification
   */
  @Delete('/:id')
  async deleteNotification(@Param('id') id: string) {
    try {
      const deleted = await this.notificationService.deleteNotification(id);

      if (!deleted) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Notification not found');
      }

      return ResponseUtility.success({ deleted: true });
    } catch (error) {
      logger.error('Delete notification error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
