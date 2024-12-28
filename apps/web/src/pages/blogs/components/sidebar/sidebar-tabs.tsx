type SidebarTab = 'directory' | 'recent';

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export const SidebarTabs = ({ activeTab, onTabChange }: SidebarTabsProps) => {
  return (
    <div role="tablist" className="flex gap-5 px-3 py-2">
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'directory'}
        onClick={() => onTabChange('directory')}
        className="flex items-center gap-2 transition-all duration-150 cursor-pointer"
      >
        <div
          className={`w-2 h-2 rounded-full ${
            activeTab === 'directory'
              ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
              : 'bg-gray-300 dark:bg-zinc-600'
          }`}
        />
        <span
          className={`text-sm font-medium ${
            activeTab === 'directory'
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-500 dark:text-zinc-500'
          }`}
        >
          目录
        </span>
      </button>
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'recent'}
        onClick={() => onTabChange('recent')}
        className="flex items-center gap-2 transition-all duration-150 cursor-pointer"
      >
        <div
          className={`w-2 h-2 rounded-full ${
            activeTab === 'recent'
              ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
              : 'bg-gray-300 dark:bg-zinc-600'
          }`}
        />
        <span
          className={`text-sm font-medium ${
            activeTab === 'recent'
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-500 dark:text-zinc-500'
          }`}
        >
          最近
        </span>
      </button>
    </div>
  );
};
