import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { GithubService } from '../github.service';
import {
  X,
  FilePlus,
  FileEdit,
  Trash2,
  Loader2,
  Check,
} from 'lucide-react';

interface CommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommitDialog = view(({ isOpen, onClose }: CommitDialogProps) => {
  const githubService = useService(GithubService);
  const [message, setMessage] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected paths when dialog opens
  useState(() => {
    if (isOpen) {
      setSelectedPaths(new Set(githubService.pendingChanges.keys()));
      setMessage('');
      setError(null);
    }
  });

  if (!isOpen) return null;

  const pendingChangesCount = githubService.pendingChanges.size;
  const selectedCount = selectedPaths.size;

  const handlePathToggle = (path: string) => {
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedPaths(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCount === pendingChangesCount) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(githubService.pendingChanges.keys()));
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || selectedCount === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await githubService.commitChanges(
        message.trim(),
        Array.from(selectedPaths)
      );

      if (success) {
        onClose();
        setMessage('');
        setSelectedPaths(new Set());
      } else {
        setError(githubService.error || '提交失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <FilePlus className="w-4 h-4 text-green-500" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      default:
        return <FileEdit className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getChangeLabel = (type: string) => {
    switch (type) {
      case 'create':
        return '+';
      case 'delete':
        return '-';
      default:
        return 'M';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">提交更改</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Commit message */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              提交信息 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="输入提交信息..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* File list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                更改的文件 ({selectedCount}/{pendingChangesCount})
              </label>
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary hover:underline"
                disabled={isSubmitting}
              >
                {selectedCount === pendingChangesCount ? '取消全选' : '全选'}
              </button>
            </div>

            <div className="border border-border rounded-lg max-h-[200px] overflow-auto">
              {Array.from(githubService.pendingChanges.entries()).map(([path, change]) => (
                <div
                  key={path}
                  className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedPaths.has(path)}
                    onChange={() => handlePathToggle(path)}
                    disabled={isSubmitting}
                    className="w-4 h-4"
                  />
                  {getChangeIcon(change.type)}
                  <span className="text-sm flex-1 truncate">{path}</span>
                  <span className={`
                    text-xs font-medium
                    ${change.type === 'create' ? 'text-green-500' : ''}
                    ${change.type === 'delete' ? 'text-red-500' : ''}
                    ${change.type === 'edit' ? 'text-yellow-500' : ''}
                  `}>
                    {getChangeLabel(change.type)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || selectedCount === 0 || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? '提交中...' : '提交'}
          </button>
        </div>
      </div>
    </div>
  );
});

// Commit button component to be placed in the header
export const CommitButton = view(() => {
  const githubService = useService(GithubService);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pendingCount = githubService.pendingChanges.size;

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        disabled={pendingCount === 0}
        className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Check className="w-4 h-4" />
        提交 {pendingCount > 0 ? `(${pendingCount})` : ''}
      </button>

      <CommitDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
});
