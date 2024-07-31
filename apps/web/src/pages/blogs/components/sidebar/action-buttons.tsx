import { Plus, FolderPlus } from 'lucide-react';
import { view } from '@rabjs/react';

interface ActionButtonsProps {
  onNewBlog: () => void;
  onNewDirectory: () => void;
  disabled?: boolean;
}

export const ActionButtons = view(({ onNewBlog, onNewDirectory, disabled }: ActionButtonsProps) => {
  return (
    <div className="flex flex-col gap-1 px-2 py-2 border-t border-gray-200 dark:border-dark-700">
      <button
        onClick={onNewBlog}
        disabled={disabled}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        新建博客
      </button>
      <button
        onClick={onNewDirectory}
        disabled={disabled}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FolderPlus className="w-4 h-4" />
        新建目录
      </button>
    </div>
  );
});
