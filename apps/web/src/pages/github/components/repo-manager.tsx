import { useState, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { githubApi } from '../../../api/github';
import { ToastService } from '../../../services/toast.service';
import { Trash2, Plus, Github, Loader2, Pencil, X } from 'lucide-react';
import type { GithubRepoDto } from '@x-console/dto';

interface RepoManagerProps {
  onClose?: () => void;
  onRepoAdded?: () => void;
}

export const RepoManager = view(({ onClose, onRepoAdded }: RepoManagerProps) => {
  const toastService = useService(ToastService);

  const [repos, setRepos] = useState<GithubRepoDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [pat, setPat] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPat, setEditPat] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Load repos on mount
  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    setIsLoading(true);
    try {
      const data = await githubApi.getRepos();
      setRepos(data.repos || []);
    } catch (err) {
      console.error('Failed to load repos:', err);
      toastService.error('加载仓库列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = '请输入显示名称';
    }

    if (!fullName.trim()) {
      newErrors.fullName = '请输入仓库路径';
    } else if (!/^[^/]+\/[^/]+$/.test(fullName.trim())) {
      newErrors.fullName = '仓库路径格式应为 owner/repo';
    }

    if (!pat.trim()) {
      newErrors.pat = '请输入 GitHub Personal Access Token';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await githubApi.addRepo({
        name: name.trim(),
        full_name: fullName.trim(),
        pat: pat.trim(),
      });

      toastService.success('仓库添加成功');
      setName('');
      setFullName('');
      setPat('');
      setIsAdding(false);
      await loadRepos();
      onRepoAdded?.();
    } catch (err: unknown) {
      console.error('Failed to add repo:', err);
      const errorMessage = err instanceof Error ? err.message : '添加仓库失败';
      toastService.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, repoName: string) => {
    if (!confirm(`确定要删除仓库 "${repoName}" 吗？`)) {
      return;
    }

    try {
      await githubApi.deleteRepo(id);
      toastService.success('仓库删除成功');
      await loadRepos();
    } catch (err: unknown) {
      console.error('Failed to delete repo:', err);
      const errorMessage = err instanceof Error ? err.message : '删除仓库失败';
      toastService.error(errorMessage);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setName('');
    setFullName('');
    setPat('');
    setErrors({});
  };

  const startEdit = (repo: GithubRepoDto) => {
    setEditingId(repo.id);
    setEditName(repo.name);
    setEditFullName(repo.full_name);
    setEditPat('');
    setEditErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditErrors({});
  };

  const validateEdit = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!editName.trim()) newErrors.name = '请输入显示名称';
    if (!editFullName.trim()) {
      newErrors.fullName = '请输入仓库路径';
    } else if (!/^[^/]+\/[^/]+$/.test(editFullName.trim())) {
      newErrors.fullName = '仓库路径格式应为 owner/repo';
    }
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async (e: React.FormEvent, repoId: string) => {
    e.preventDefault();
    if (!validateEdit()) return;

    setIsEditSubmitting(true);
    try {
      const updateData: { name: string; full_name: string; pat?: string } = {
        name: editName.trim(),
        full_name: editFullName.trim(),
      };
      // Only send PAT if user actually typed something
      if (editPat.trim()) {
        updateData.pat = editPat.trim();
      }

      await githubApi.updateRepo(repoId, updateData);
      toastService.success('仓库更新成功');
      setEditingId(null);
      await loadRepos();
    } catch (err: unknown) {
      console.error('Failed to update repo:', err);
      const errorMessage = err instanceof Error ? err.message : '更新仓库失败';
      toastService.error(errorMessage);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const content = (
    <div className={onClose ? 'p-4 max-w-2xl w-full' : 'p-4 max-w-2xl mx-auto'}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">GitHub 仓库管理</h2>
        <div className="flex items-center gap-2">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              disabled={!!editingId}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              添加仓库
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="mb-6 p-4 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg">
          <h3 className="text-lg font-medium mb-4">添加新仓库</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">显示名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：我的项目"
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">仓库路径</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="例如：username/my-repo"
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Personal Access Token</label>
              <input
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="请输入 GitHub PAT"
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.pat && <p className="text-sm text-red-500 mt-1">{errors.pat}</p>}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                需要 repo 权限的 Token
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                添加
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Repo List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-gray-400" />
        </div>
      ) : repos.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Github className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无关联的仓库</p>
          <p className="text-sm">点击上方"添加仓库"按钮开始</p>
        </div>
      ) : (
        <div className="space-y-2">
          {repos.map((repo) =>
            editingId === repo.id ? (
              // Edit form row
              <div
                key={repo.id}
                className="p-4 bg-white dark:bg-dark-800 border border-primary-300 dark:border-primary-700 rounded-lg"
              >
                <form onSubmit={(e) => handleEditSubmit(e, repo.id)} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">显示名称</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      disabled={isEditSubmitting}
                    />
                    {editErrors.name && <p className="text-xs text-red-500 mt-1">{editErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">仓库路径</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      disabled={isEditSubmitting}
                    />
                    {editErrors.fullName && <p className="text-xs text-red-500 mt-1">{editErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Personal Access Token</label>
                    <input
                      type="password"
                      value={editPat}
                      onChange={(e) => setEditPat(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      disabled={isEditSubmitting}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">留空则不修改 Token</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isEditSubmitting}
                      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={isEditSubmitting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {isEditSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      保存
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Normal read row
              <div
                key={repo.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-100/50 dark:hover:bg-dark-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="font-medium">{repo.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{repo.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(repo)}
                    disabled={!!editingId}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="编辑仓库"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(repo.id, repo.name)}
                    disabled={!!editingId}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="删除仓库"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="relative bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-xl w-[600px] max-w-[90vw] max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
});
