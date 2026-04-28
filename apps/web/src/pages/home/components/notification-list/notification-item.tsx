import { view } from '@rabjs/react';
import { Bell, FileText, AlertCircle, Zap, Check, Trash2 } from 'lucide-react';
import type { NotificationDto } from '@x-console/dto';

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Get icon component based on notification channel/type
 * Icon map: task (wechat/feishu/dingtalk/slack) → Bell
 *            blog → FileText
 *            system (webhook/email) → AlertCircle
 *            default → Zap
 */
const getNotificationIcon = (notification: NotificationDto) => {
  const { channel } = notification;

  // Task-related channels (messaging platforms)
  if (['wechat', 'feishu', 'dingtalk', 'slack'].includes(channel)) {
    return Bell;
  }

  // Blog-related (email could be blog notifications)
  if (channel === 'email') {
    return FileText;
  }

  // System notifications (webhook)
  if (channel === 'webhook') {
    return AlertCircle;
  }

  // Default
  return Zap;
};

/**
 * Format relative time in Chinese
 * e.g., "2分钟前", "3小时前", "1天前"
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return '刚刚';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }
  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }
  if (diffDays < 30) {
    return `${diffDays}天前`;
  }

  return date.toLocaleDateString('zh-CN');
};

export const NotificationItem = view<NotificationItemProps>(({ notification, onMarkAsRead, onDelete }) => {
  if (!notification) {
    return null;
  }

  const isUnread = notification.status === 'unread';
  const IconComponent = getNotificationIcon(notification);

  return (
    <div
      className={`
        group flex items-start gap-3 p-4 rounded-lg duration-150
        ${isUnread
          ? 'bg-white dark:bg-zinc-800/50 opacity-100'
          : 'bg-transparent dark:bg-transparent opacity-60'
        }
        hover:bg-green-50/60 dark:hover:bg-green-900/15
      `}
    >
      {/* Icon */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${isUnread
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400'
          }
        `}
      >
        <IconComponent className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`
            text-sm leading-relaxed
            ${isUnread
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400'
            }
          `}
        >
          {notification.content}
        </p>
        <p
          className={`
            text-xs mt-1
            ${isUnread
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-400 dark:text-gray-500'
            }
          `}
        >
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Mark as read button */}
        {isUnread && (
          <button
            type="button"
            onClick={() => onMarkAsRead(notification.id)}
            className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
            aria-label="标记为已读"
          >
            <Check className="w-4 h-4" />
          </button>
        )}

        {/* Delete button - only for unread */}
        {isUnread && (
          <button
            type="button"
            onClick={() => onDelete(notification.id)}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
            aria-label="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
});
