import { view, useService } from '@rabjs/react';
import { useState, useEffect } from 'react';
import { ApiTokenService } from '../../../services/api-token.service';
import { ToastService } from '../../../services/toast.service';
import { Loader2, Plus, Trash2, Copy, Check, Key, AlertTriangle } from 'lucide-react';

export const ApiTokenSettings = view(() => {
  const apiTokenService = useService(ApiTokenService);
  const toastService = useService(ToastService);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    apiTokenService.fetchTokens();
  }, []);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) {
      toastService.error('请输入Token名称');
      return;
    }

    setIsCreating(true);
    try {
      const token = await apiTokenService.createToken({ name: tokenName.trim() });
      setNewToken(token.token || '');
      setTokenName('');
    } catch (err) {
      // Error already handled in service
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyToken = async (token: string, id: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toastService.success('Token已复制到剪贴板');
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm('确定要删除这个Token吗？删除后无法恢复。')) {
      return;
    }

    setDeletingId(id);
    try {
      await apiTokenService.deleteToken(id);
      toastService.success('Token删除成功');
    } catch (err) {
      // Error already handled in service
    } finally {
      setDeletingId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTokenName('');
    setNewToken(null);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">API Token</h2>
        <p className="text-gray-600 dark:text-gray-400">管理您的API访问令牌</p>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md border border-gray-200 dark:border-dark-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">我的Token</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              使用Token通过API访问您的账户
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            生成新Token
          </button>
        </div>

        {/* Token List */}
        <div className="p-6">
          {apiTokenService.isLoading && apiTokenService.tokens.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : apiTokenService.tokens.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">暂无Token</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                点击"生成新Token"创建一个
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiTokenService.tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {token.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-dark-600 text-gray-600 dark:text-gray-300 rounded">
                        {token.prefix}***
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      创建于 {formatDate(token.createdAt)}
                      {token.expiresAt && ` · 过期于 ${formatDate(token.expiresAt)}`}
                      {token.lastUsedAt && ` · 最后使用 ${formatDate(token.lastUsedAt)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteToken(token.id)}
                    disabled={deletingId === token.id}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="删除Token"
                  >
                    {deletingId === token.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">安全提示</p>
            <p>
              Token只在创建时显示一次，请妥善保存。Token泄露后请立即删除。
            </p>
          </div>
        </div>
      </div>

      {/* Create Token Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={newToken ? closeModal : undefined}
          />
          <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {newToken ? 'Token已创建' : '生成新Token'}
            </h3>

            {newToken ? (
              <div>
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    请复制您的Token，此Token将不再显示。
                  </p>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 p-3 bg-gray-100 dark:bg-dark-700 rounded-lg text-sm font-mono break-all text-gray-900 dark:text-white">
                    {newToken}
                  </code>
                  <button
                    onClick={() => handleCopyToken(newToken, 'new')}
                    className="p-2 text-gray-500 hover:text-primary-600 transition-colors"
                    title="复制"
                  >
                    {copiedId === 'new' ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
                  >
                    完成
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateToken}>
                <div className="mb-4">
                  <label
                    htmlFor="tokenName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Token名称
                  </label>
                  <input
                    id="tokenName"
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="例如: My API Client"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !tokenName.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      '生成'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
