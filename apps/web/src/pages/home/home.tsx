import { view, useService } from '@rabjs/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../../components/layout';
import { AuthService } from '../../services/auth.service';
import { MiniMaxTokenService } from '../../services/minimax-token.service';
import { NotificationService } from '../../services/notification.service';
import { Clock, Sun, Moon, Sunrise, Sunset, RefreshCw, Zap, Bell } from 'lucide-react';
import { NotificationList } from './components/notification-list';
import { TaskStatsCard } from './components/task-stats-card';
import { QuickActions } from './components/quick-actions';

export const HomePage = view(() => {
  const authService = useService(AuthService);
  const tokenService = useService(MiniMaxTokenService);
  const notificationService = useService(NotificationService);
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initial load and auto-refresh for MiniMax token
  useEffect(() => {
    tokenService.refresh();
    tokenService.startAutoRefresh();

    return () => {
      tokenService.stopAutoRefresh();
    };
  }, []);

  // Refresh on visibility change (page comes to foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tokenService.refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Refresh on route change (using popstate event for SPA navigation)
  useEffect(() => {
    const handlePopState = () => {
      tokenService.refresh();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const userName = authService.user?.username || authService.user?.email?.split('@')[0] || 'User';
  const userAvatar = authService.user?.avatar;

  // Format time and date
  const timeString = currentTime.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Get greeting based on time
  const hour = currentTime.getHours();
  let greeting = '早上好';
  let greetingIcon = Sunrise;
  if (hour >= 12 && hour < 18) {
    greeting = '下午好';
    greetingIcon = Sun;
  } else if (hour >= 18) {
    greeting = '晚上好';
    greetingIcon = Sunset;
  } else if (hour >= 6) {
    greeting = '早上好';
    greetingIcon = Sunrise;
  } else {
    greeting = '夜深了';
    greetingIcon = Moon;
  }

  const GreetingIcon = greetingIcon;

  return (
    <Layout>
      <div className="flex-1 bg-gray-50/50 dark:bg-zinc-900/50 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header - Greeting */}
          <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-8 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <GreetingIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {greeting}，{userName}！
                  </h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">欢迎回来，开始您的工作吧</p>
              </div>
              <div className="hidden md:flex items-center">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={`${userName} avatar`}
                    className="w-20 h-20 rounded-full object-cover border-4 border-green-500/30"
                  />
                ) : (
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 text-3xl font-semibold border-4 border-green-500/30">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid - 4 columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Time Card (compact) */}
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">时间</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
                {timeString}
              </div>
            </div>

            {/* Token Card (compact) */}
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Token</span>
                </div>
                <button
                  onClick={() => tokenService.refresh()}
                  disabled={tokenService.refreshing}
                  className="p-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 text-green-600 dark:text-green-400 ${tokenService.refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(() => {
                  const mainModel = tokenService.getMainModelRemain();
                  const tokenRemaining = mainModel
                    ? mainModel.current_interval_total_count - mainModel.current_interval_usage_count
                    : 0;
                  return tokenRemaining.toLocaleString();
                })()}
              </div>
            </div>

            {/* Task Stats Card (clickable) */}
            <button
              onClick={() => navigate('/tasks')}
              className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150 text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">任务</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                待处理
              </div>
            </button>

            {/* Notification Count (clickable) */}
            <button
              onClick={() => navigate('/notifications')}
              className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150 text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Bell className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">通知</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {notificationService.unreadCount}
              </div>
            </button>
          </div>

          {/* Dual-column content area */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* 60% - Notification list */}
            <div className="lg:col-span-3">
              <NotificationList />
            </div>
            {/* 40% - Right panel */}
            <div className="lg:col-span-2 space-y-4">
              <TaskStatsCard />
              <QuickActions />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
});
