import { useState, useEffect } from 'react';
import { view } from '@rabjs/react';
import { githubApi } from '../../../api/github';
import type { GithubSettingsDto } from '@x-console/dto';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export const GithubTokenSettings = view(() => {
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Load current settings on mount
  useEffect(() => {
    githubApi.getGithubSettings().then((settings: GithubSettingsDto) => {
      setIsConfigured(settings.has_token);
    });
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await githubApi.updateGithubSettings({ pat });
      setIsConfigured(true);
      setPat('');
      setTestResult(null);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await githubApi.updateGithubSettings({ pat });
      setTestResult('success');
    } catch {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        GitHub 全局 Token
      </h3>
      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
        配置一个 GitHub Personal Access Token，用于访问您账号下所有仓库的 Actions 数据。
        需要 <code className="px-1 py-0.5 bg-gray-100 dark:bg-zinc-700 rounded">repo</code> 权限。
      </p>

      {isConfigured && !pat && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
          <Check className="w-5 h-5" />
          <span>Token 已配置</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
            Personal Access Token
          </label>
          <div className="relative">
            <input
              type={showPat ? 'text' : 'password'}
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder={isConfigured ? '••••••••••••' : 'ghp_xxxxxxxxxxxx'}
              className="w-full px-3 py-2 pr-10 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPat(!showPat)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPat ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!pat || isLoading}
            className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '保存中...' : '保存 Token'}
          </button>

          {pat && (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50"
            >
              {isTesting ? '测试中...' : '测试'}
            </button>
          )}

          {testResult === 'success' && (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="w-4 h-4" /> Token 有效
            </span>
          )}
          {testResult === 'error' && (
            <span className="flex items-center gap-1 text-red-600">
              <X className="w-4 h-4" /> Token 无效
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
