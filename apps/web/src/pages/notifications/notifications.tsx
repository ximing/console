import { view, useService } from '@rabjs/react';
import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout';
import { NotificationService } from '../../services/notification.service';
import { ToastService } from '../../services/toast.service';
import { Bell, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import type { NotificationDto } from '@aimo-console/dto';

type StatusFilter = 'all' | 'unread' | 'read';

export const NotificationsPage = view(() => {
  const notificationService = useService(NotificationService);
  const toastService = useService(ToastService);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load notifications on mount
  useEffect(() => {
    notificationService.loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle filter change
  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    if (filter === 'all') {
      notificationService.loadNotifications({ limit: 20, offset: 0 });
    } else {
      notificationService.loadNotifications({ status: filter, limit: 20, offset: 0 });
    }
  };

  // Handle mark as read
  const handleMarkAsRead = async (id: string) => {
    const success = await notificationService.markAsRead(id);
    if (success) {
      toastService.success('已标记为已读');
    } else {
      toastService.error('操作失败');
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    const success = await notificationService.markAllAsRead();
    if (success) {
      toastService.success('已全部标记为已读');
    } else {
      toastService.error('操作失败');
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const success = await notificationService.deleteNotification(id);
    setDeletingId(null);

    if (success) {
      toastService.success('删除成功');
    } else {
      toastService.error('删除失败');
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    const icons: Record<string, string> = {
      wechat: '💬',
      feishu: '🔗',
      dingtalk: '🔔',
      slack: '💼',
      email: '📧',
      webhook: '🌐',
    };
    return icons[channel] || '📢';
  };

  // Filtered notifications
  const filteredNotifications = notificationService.notifications;
  const unreadCount = filteredNotifications.filter((n) => n.status === 'unread').length;

  // Load more
  const hasMore = filteredNotifications.length < notificationService.total;

  return (
    <Layout>
      <div className="flex-1 bg-gray-50 dark:bg-dark-900 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">通知中心</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  共 {notificationService.total} 条通知
                  {unreadCount > 0 && `，${unreadCount} 条未读`}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span>全部已读</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 bg-white dark:bg-dark-800 p-1.5 rounded-lg border border-gray-200 dark:border-dark-700">
            {(['all', 'unread', 'read'] as StatusFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  statusFilter === filter
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                }`}
              >
                {filter === 'all' ? '全部' : filter === 'unread' ? '未读' : '已读'}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {notificationService.isLoading && filteredNotifications.length === 0 && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-dark-700">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-dark-700 rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!notificationService.isLoading && filteredNotifications.length === 0 && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md p-12 border border-gray-200 dark:border-dark-700 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无通知</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {statusFilter === 'all'
                  ? '您目前没有收到任何通知'
                  : statusFilter === 'unread'
                    ? '没有未读通知'
                    : '没有已读通知'}
              </p>
            </div>
          )}

          {/* Notification List */}
          {!notificationService.isLoading && filteredNotifications.length > 0 && (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  onDelete={() => handleDelete(notification.id)}
                  isDeleting={deletingId === notification.id}
                  getChannelIcon={getChannelIcon}
                  formatDate={formatDate}
                />
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={() => notificationService.loadMore()}
                    disabled={notificationService.isLoading}
                    className="px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {notificationService.isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        加载中...
                      </span>
                    ) : (
                      '加载更多'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
});

interface NotificationCardProps {
  notification: NotificationDto;
  onMarkAsRead: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  getChannelIcon: (channel: string) => string;
  formatDate: (date: string) => string;
}

const NotificationCard = view(
  ({
    notification,
    onMarkAsRead,
    onDelete,
    isDeleting,
    getChannelIcon,
    formatDate,
  }: NotificationCardProps) => {
    const isUnread = notification.status === 'unread';

    return (
      <div
        className={`bg-white dark:bg-dark-800 rounded-xl shadow-sm border transition-colors ${
          isUnread
            ? 'border-l-4 border-l-primary-500 border-gray-200 dark:border-dark-700'
            : 'border-gray-200 dark:border-dark-700'
        }`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Channel Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-dark-700 rounded-lg flex items-center justify-center text-lg">
              {getChannelIcon(notification.channel)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${isUnread ? 'font-medium' : ''} text-gray-900 dark:text-white`}
                  >
                    {notification.content}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getChannelLabel(notification.channel)}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {notification.ownership === 'private' ? '个人' : '群组'}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isUnread && (
                    <button
                      onClick={onMarkAsRead}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                      title="标记已读"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
                    title="删除"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

function getChannelLabel(channel: string): string {
  const labels: Record<string, string> = {
    wechat: '微信',
    feishu: '飞书',
    dingtalk: '钉钉',
    slack: 'Slack',
    email: '邮件',
    webhook: 'Webhook',
  };
  return labels[channel] || channel;
}
