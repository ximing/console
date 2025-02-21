import { view } from '@rabjs/react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router';
import { Layout } from '../../components/layout';
import { UserSettings } from './components/user-settings';
import { ModelSettings } from './components/model-settings';
import { CommandPaletteSettings } from './components/command-palette-settings';
import { ApiTokenSettings } from './components/api-token-settings';
import { LogSettings } from './components/log-settings';
import { GithubTokenSettings } from './components/github-token-settings';
import { User, Settings as SettingsIcon, Bot, Key, FileText, Command, Github } from 'lucide-react';
import { isElectron } from '../../electron/isElectron';

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
  {
    id: 'command-palette',
    label: '命令面板',
    icon: Command,
    path: '/settings/command-palette',
  },
  {
    id: 'api-tokens',
    label: 'API Token',
    icon: Key,
    path: '/settings/api-tokens',
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: Github,
    path: '/settings/github',
  },
];

// Add log menu item only in Electron environment
if (isElectron()) {
  menuItems.push({
    id: 'logs',
    label: '日志',
    icon: FileText,
    path: '/settings/logs',
  });
}

export const SettingsPage = view(() => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex-1 flex bg-gray-50 dark:bg-dark-900 overflow-hidden">
        {/* Left Sidebar - Menu */}
        <div className="w-64 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm overflow-y-auto">
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
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all
                      ${isActive
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-green-50/60 dark:hover:bg-green-900/15'
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
        <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-zinc-900/50">
          <Routes>
            <Route path="/" element={<Navigate to="/settings/user" replace />} />
            <Route path="/user" element={<UserSettings />} />
            <Route path="/models" element={<ModelSettings />} />
            <Route path="/command-palette" element={<CommandPaletteSettings />} />
            <Route path="/api-tokens" element={<ApiTokenSettings />} />
            <Route path="/github" element={<GithubTokenSettings />} />
            <Route path="/logs" element={<LogSettings />} />
          </Routes>
        </div>
      </div>
    </Layout>
  );
});
