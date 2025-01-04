import { view, useService } from '@rabjs/react';
import { useState, useEffect } from 'react';
import { Layout } from '../../components/layout';
import { AuthService } from '../../services/auth.service';
import { Clock, Calendar, User, Mail, Sun, Moon, Sunrise, Sunset } from 'lucide-react';

export const HomePage = view(() => {
  const authService = useService(AuthService);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const userName = authService.user?.username || authService.user?.email?.split('@')[0] || 'User';
  const userAvatar = authService.user?.avatar;

  // Format time and date
  const timeString = currentTime.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateString = currentTime.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
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

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Time Card */}
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">当前时间</h2>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 font-mono">
                  {timeString}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{dateString}</div>
              </div>
            </div>

            {/* Date Card */}
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">今日日期</h2>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {currentTime.getDate()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {currentTime.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {currentTime.toLocaleDateString('zh-CN', { weekday: 'long' })}
                </div>
              </div>
            </div>

            {/* User Info Card */}
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">用户信息</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">用户名：</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {userName}
                  </span>
                </div>
                {authService.user?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">邮箱：</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {authService.user.email}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {currentTime.getHours()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">当前小时</div>
            </div>
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {currentTime.getMinutes()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">当前分钟</div>
            </div>
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.ceil(
                  (Number(currentTime) - Number(new Date(currentTime.getFullYear(), 0, 1))) /
                    86400000
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">今年第几天</div>
            </div>
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.ceil(
                  (Number(currentTime) -
                    Number(new Date(currentTime.getFullYear(), currentTime.getMonth(), 1))) /
                    86400000
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">本月第几天</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
});
