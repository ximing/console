import {
  JsonController,
  Get,
  Post,
  Body,
  Param,
  QueryParams,
  UseBefore,
  Req,
} from 'routing-controllers';
import { Service, Inject } from 'typedi';
import type { Request } from 'express';

import { ErrorCode } from '../../constants/error-codes.js';
import { NotificationService } from '../../services/notification.service.js';
import { NotificationPushService } from '../../services/notification-push.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { baAuthInterceptor } from '../../middlewares/ba-auth.interceptor.js';

import type {
  NotificationDto,
  NotificationListDto,
  QueryNotificationDto,
  CreateNotificationDto,
} from '@aimo-console/dto';
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
@JsonController('/api/v1/ba/notifications')
export class NotificationBAController {
  constructor(
    private notificationService: NotificationService,
    @Inject() private notificationPushService: NotificationPushService
  ) {}

  /**
   * POST /api/v1/ba/notifications - Create a new notification (BA Auth with User Token)
   *
   * When using user API token, the userId is attached to request from the auth interceptor.
   * This allows creating notifications on behalf of the user.
   * The notification will be automatically pushed to the user via Socket.IO.
   */
  @Post('/')
  @UseBefore(baAuthInterceptor)
  async createNotification(@Req() request: Request, @Body() createData: CreateNotificationDto) {
    try {
      // Get userId from request (attached by baAuthInterceptor)
      const userId = (request as Request & { userId?: string }).userId;

      if (!userId) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED, 'User authentication required');
      }

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
      if (!createData.content) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Content is required');
      }

      // Create notification and push to user via Socket.IO
      const notification = await this.notificationPushService.createAndPushNotification(userId, {
        channel: createData.channel,
        ownership: createData.ownership,
        ownershipId: createData.ownershipId,
        content: createData.content,
        messageType: createData.messageType,
      });

      return ResponseUtility.success(convertNotificationToDto(notification));
    } catch (error) {
      logger.error('Create notification error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/ba/notifications - Query notifications with filters (BA Auth)
   */
  @Get('/')
  @UseBefore(baAuthInterceptor)
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
   * POST /api/v1/ba/notifications/:id/read - Mark notification as read (BA Auth)
   */
  @Post('/:id/read')
  @UseBefore(baAuthInterceptor)
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
}
