import { view } from '@rabjs/react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router';
import { Layout } from '../../components/layout';
import { UserSettings } from './components/user-settings';
import { ModelSettings } from './components/model-settings';
import { User, Settings as SettingsIcon, Bot } from 'lucide-react';

const menuItems = [
  {
    id: 'user',
    label: '个人信息',
    icon: User,
    path: '/settings/user',
  },
  {
    id: 'models',
    label: '大模型设置',
    icon: Bot,
    path: '/settings/models',
  },
  // 可以在这里添加更多菜单项
  // {
  //   id: 'security',
  //   label: '安全设置',
  //   icon: Shield,
  //   path: '/settings/security',
  // },
];

export const SettingsPage = view(() => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex-1 flex bg-gray-50 dark:bg-dark-900 overflow-hidden">
        {/* Left Sidebar - Menu */}
        <div className="w-64 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <SettingsIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">设置</h1>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                      ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/settings/user" replace />} />
            <Route path="/user" element={<UserSettings />} />
            <Route path="/models" element={<ModelSettings />} />
            {/* 可以在这里添加更多路由 */}
            {/* <Route path="/security" element={<SecuritySettings />} /> */}
          </Routes>
        </div>
      </div>
    </Layout>
  );
});
