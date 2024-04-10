import { view, useService } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { AuthService } from '../../services/auth.service';

export const HomePage = view(() => {
  const authService = useService(AuthService);

  const userName = authService.user?.username || authService.user?.email?.split('@')[0] || 'User';
  const userAvatar = authService.user?.avatar;

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-dark-900">
        <div className="text-center max-w-md px-6">
          {/* User Avatar */}
          <div className="mb-6 flex justify-center">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={`${userName} avatar`}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 dark:border-primary-800"
              />
            ) : (
              <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white text-4xl font-semibold border-4 border-primary-200 dark:border-primary-800">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Welcome Message */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You're successfully logged in to your account.
          </p>

          {/* User Info Card */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-dark-700">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Username:
                </span>
                <span className="text-sm text-gray-900 dark:text-white">{userName}</span>
              </div>
              {authService.user?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white truncate max-w-[200px]">
                    {authService.user.email}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tip */}
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
            Use the theme toggle in the sidebar to switch between light and dark modes.
          </p>
        </div>
      </div>
    </Layout>
  );
});
