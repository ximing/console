import { Folder, Clock } from 'lucide-react';

type SidebarTab = 'directory' | 'recent';

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export const SidebarTabs = ({ activeTab, onTabChange }: SidebarTabsProps) => {
  return (
    <div role="tablist" className="flex border-b border-gray-200 dark:border-dark-700">
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'directory'}
        onClick={() => onTabChange('directory')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'directory'
            ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        }`}
      >
        <Folder className="w-4 h-4" />
        目录
      </button>
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'recent'}
        onClick={() => onTabChange('recent')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'recent'
            ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        }`}
      >
        <Clock className="w-4 h-4" />
        最近
      </button>
    </div>
  );
};
