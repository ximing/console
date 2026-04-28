import { view, useService } from '@rabjs/react';
import { Inbox } from 'lucide-react';
import { useEffect } from 'react';
import { NotificationService } from '../../../../services/notification.service';
import { NotificationItem } from './notification-item';

export const NotificationList = view(() => {
  const service = useService(NotificationService);

  // Load unread notifications on mount
  useEffect(() => {
    service.loadNotifications({ status: 'unread', limit: 10 });
    service.loadUnreadCount();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const success = await service.markAsRead(id);
    if (success) {
      await service.loadUnreadCount();
    }
  };

  const handleDelete = async (id: string) => {
    const success = await service.deleteNotification(id);
    if (success) {
      await service.loadUnreadCount();
    }
  };

  if (service.isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
        加载中...
      </div>
    );
  }

  if (service.error) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-red-500 dark:text-red-400">
        {service.error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">通知中心</h3>
        {service.unreadCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            {service.unreadCount}
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-h-24">
        {service.notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
            <Inbox className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" />
            <span>暂无未读通知</span>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {service.notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
