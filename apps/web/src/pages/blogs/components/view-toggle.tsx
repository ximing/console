import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'card' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewToggle = ({ value, onChange }: ViewToggleProps) => {
  return (
    <div className="flex rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
      <button
        onClick={() => onChange('card')}
        aria-label="卡片视图"
        aria-pressed={value === 'card'}
        className={`p-2 transition-colors ${
          value === 'card'
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        aria-label="列表视图"
        aria-pressed={value === 'list'}
        className={`p-2 transition-colors ${
          value === 'list'
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700'
        }`}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
};
