import {
  JsonController,
  Get,
  Post,
  Param,
  QueryParams,
  UseBefore,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { NotificationService } from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { baAuthInterceptor } from '../../middlewares/ba-auth.interceptor.js';

import type {
  NotificationDto,
  NotificationListDto,
  QueryNotificationDto,
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
    createdAt: notification.createdAt instanceof Date ? notification.createdAt.toISOString() : notification.createdAt,
    updatedAt: notification.updatedAt instanceof Date ? notification.updatedAt.toISOString() : notification.updatedAt,
  };
}

@Service()
@JsonController('/api/v1/ba/notifications')
export class NotificationBAController {
  constructor(private notificationService: NotificationService) {}

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
