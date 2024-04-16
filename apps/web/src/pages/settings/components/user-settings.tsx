import { view, useService } from '@rabjs/react';
import { useState, useRef } from 'react';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { Loader2, Camera } from 'lucide-react';

export const UserSettings = view(() => {
  const authService = useService(AuthService);
  const userService = useService(UserService);
  const toastService = useService(ToastService);

  const [username, setUsername] = useState(authService.user?.username || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toastService.error('用户名不能为空');
      return;
    }

    setIsLoading(true);
    try {
      await userService.updateUserInfo({ username: username.trim() });
      toastService.success('用户信息更新成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新失败';
      toastService.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastService.error('请选择图片文件');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toastService.error('图片大小不能超过 5MB');
      return;
    }

    setIsUploading(true);
    try {
      await userService.uploadAvatar(file);
      toastService.success('头像上传成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '头像上传失败';
      toastService.error(errorMessage);
    } finally {
      setIsUploading(false);
      // Clear input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const currentAvatar = authService.user?.avatar;
  const currentUsername = authService.user?.username || '';
  const currentEmail = authService.user?.email || '';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">个人信息</h2>
        <p className="text-gray-600 dark:text-gray-400">管理您的个人资料和头像</p>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md border border-gray-200 dark:border-dark-700">
        {/* Avatar Section */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">头像</h3>
          <div className="flex items-center gap-6">
            <div className="relative">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="User avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-dark-600"
                />
              ) : (
                <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-semibold border-4 border-gray-200 dark:border-dark-600">
                  {currentUsername.charAt(0).toUpperCase()}
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <button
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    更换头像
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                支持 JPG、PNG 格式，文件大小不超过 5MB
              </p>
            </div>
          </div>
        </div>

        {/* User Info Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">基本信息</h3>

          <div className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                用户名 *
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                value={currentEmail}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-gray-100 dark:bg-dark-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                邮箱地址不可修改
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={isLoading || username === currentUsername}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存更改'
              )}
            </button>
            {username !== currentUsername && (
              <button
                type="button"
                onClick={() => setUsername(currentUsername)}
                className="px-6 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
});
