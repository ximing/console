import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'card' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewToggle = ({ value, onChange }: ViewToggleProps) => {
  return (
    <div className="flex rounded-lg border border-gray-200/80 dark:border-zinc-800/60 overflow-hidden bg-gray-50/50 dark:bg-zinc-800/40">
      <button
        onClick={() => onChange('card')}
        aria-label="卡片视图"
        aria-pressed={value === 'card'}
        className={`p-2 transition-all duration-150 ${
          value === 'card'
            ? 'bg-white dark:bg-zinc-700/60 text-primary-600 dark:text-primary-400 shadow-sm'
            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100/50 dark:hover:bg-zinc-700/30'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        aria-label="列表视图"
        aria-pressed={value === 'list'}
        className={`p-2 transition-all duration-150 ${
          value === 'list'
            ? 'bg-white dark:bg-zinc-700/60 text-primary-600 dark:text-primary-400 shadow-sm'
            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100/50 dark:hover:bg-zinc-700/30'
        }`}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
};
