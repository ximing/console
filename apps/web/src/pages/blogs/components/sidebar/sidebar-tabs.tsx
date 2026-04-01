import { Folder, Clock } from 'lucide-react';

type SidebarTab = 'directory' | 'recent';

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export const SidebarTabs = ({ activeTab, onTabChange }: SidebarTabsProps) => {
  return (
    <div role="tablist" className="flex border-b border-gray-100/80 dark:border-zinc-800/50 px-1">
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'directory'}
        onClick={() => onTabChange('directory')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-t-lg ${
          activeTab === 'directory'
            ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10 -mb-px'
            : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30'
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
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-t-lg ${
          activeTab === 'recent'
            ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10 -mb-px'
            : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30'
        }`}
      >
        <Clock className="w-4 h-4" />
        最近
      </button>
    </div>
  );
};
