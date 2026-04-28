import { view, useService } from '@rabjs/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../../components/layout';
import { AuthService } from '../../services/auth.service';
import { MiniMaxTokenService } from '../../services/minimax-token.service';
import { NotificationService } from '../../services/notification.service';
import { Sun, Moon, Sunrise, Sunset, RefreshCw, Zap } from 'lucide-react';
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
                <div className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                  {currentTime.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
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

          {/* Token 独占一行 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* 主 Token 卡片 */}
            <div className="lg:col-span-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
              {(() => {
                const mainModel = tokenService.getMainModelRemain();
                if (!mainModel) {
                  return <div className="text-gray-400">加载中...</div>;
                }
                const intervalRemaining = mainModel.current_interval_total_count - mainModel.current_interval_usage_count;
                const intervalPercentage = tokenService.getProgressPercentage(mainModel);
                const intervalColor = tokenService.getProgressColor(intervalPercentage);
                const weeklyRemaining = mainModel.current_weekly_total_count - mainModel.current_weekly_usage_count;
                const weeklyPercentage = mainModel.current_weekly_total_count > 0
                  ? Math.round((weeklyRemaining / mainModel.current_weekly_total_count) * 100)
                  : 0;
                const weeklyColor = tokenService.getProgressColor(weeklyPercentage);
                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{mainModel.model_name}</span>
                      </div>
                      <button
                        onClick={() => tokenService.refresh()}
                        disabled={tokenService.refreshing}
                        className="p-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 text-green-600 dark:text-green-400 ${tokenService.refreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {/* 当前配额 */}
                    <div className="mb-3">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">当前配额</span>
                        <span className={mainModel.remains_time < 3600000 ? 'text-xs text-red-500' : 'text-xs text-gray-400'}>
                          剩余 {tokenService.formatRemainsTime(mainModel.remains_time)}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {intervalRemaining.toLocaleString()}
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${intervalColor} transition-all duration-300`}
                          style={{ width: `${intervalPercentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{intervalPercentage}% 剩余</div>
                    </div>
                    {/* 本周配额 */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">本周配额</span>
                        <span className="text-xs text-gray-400">
                          剩余 {tokenService.formatRemainsTime(mainModel.weekly_remains_time)}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-1">
                        {weeklyRemaining.toLocaleString()}
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${weeklyColor} transition-all duration-300`}
                          style={{ width: `${weeklyPercentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{weeklyPercentage}% 剩余</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 其他模型小卡片网格 */}
            <div className="lg:col-span-3 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 content-start">
              {tokenService.getOtherModelRemains().map((model) => {
                const remaining = model.current_interval_total_count - model.current_interval_usage_count;
                const percentage = tokenService.getProgressPercentage(model);
                const color = tokenService.getProgressColor(percentage);
                const isEmpty = remaining === 0;
                return (
                  <div
                    key={model.model_name}
                    className={`bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg p-3 transition-all duration-150 ${isEmpty ? 'opacity-50' : 'hover:shadow-md hover:-translate-y-0.5'}`}
                  >
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1" title={model.model_name}>
                      {model.model_name}
                    </div>
                    <div className={`text-lg font-bold ${isEmpty ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {remaining.toLocaleString()}
                    </div>
                    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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
