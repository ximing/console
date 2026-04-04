import { Folder, Clock, Tag } from 'lucide-react';

type SidebarTab = 'directory' | 'recent' | 'tags';

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export const SidebarTabs = ({ activeTab, onTabChange }: SidebarTabsProps) => {
  return (
    <div role="tablist" className="flex px-3 border-b border-gray-100 dark:border-zinc-800">
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'directory'}
        onClick={() => onTabChange('directory')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-150 cursor-pointer ${
          activeTab === 'directory'
            ? 'border-green-500 text-green-600 dark:text-green-400'
            : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
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
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-150 cursor-pointer ${
          activeTab === 'recent'
            ? 'border-green-500 text-green-600 dark:text-green-400'
            : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
        }`}
      >
        <Clock className="w-4 h-4" />
        最近
      </button>
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'tags'}
        onClick={() => onTabChange('tags')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-150 cursor-pointer ${
          activeTab === 'tags'
            ? 'border-green-500 text-green-600 dark:text-green-400'
            : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
        }`}
      >
        <Tag className="w-4 h-4" />
        标签
      </button>
    </div>
  );
};
