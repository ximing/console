import { view, useService } from '@rabjs/react';
import { DirectoryService } from '../../../../services/directory.service';
import { SearchButton } from './search-button';
import { SidebarTabs } from './sidebar-tabs';
import { RecentBlogList } from './recent-blog-list';
import { TagPanel } from './tag-panel';
import { DirectoryTree } from '../directory-tree';
import { Plus, FolderPlus, Loader2 } from 'lucide-react';

interface SidebarProps {
  activeTab: 'directory' | 'recent' | 'tags';
  onTabChange: (tab: 'directory' | 'recent' | 'tags') => void;
  selectedDirectoryId: string | null;
  selectedBlogId: string | null;
  selectedTagId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectBlog: (blogId: string) => void;
  onSelectTag: (tagId: string | null) => void;
  onSearchClick: () => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
  onContextMenuDirectory?: (e: React.MouseEvent, nodeId: string, nodeName: string) => void;
  onContextMenuPage?: (e: React.MouseEvent, blogId: string) => void;
  onExpandDirectory?: (directoryId: string) => void;
  initialExpandedIds?: string[];
}

export const Sidebar = view((props: SidebarProps) => {
  const directoryService = useService(DirectoryService);
  // Only show loading for initial directory load, not for blog preview loads
  const isLoading = directoryService.loading;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 shadow-[4px_0_24px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
      {/* Search Button */}
      <div className="px-2 py-2">
        <SearchButton onClick={props.onSearchClick} />
      </div>

      {/* Sidebar Tabs */}
      <SidebarTabs activeTab={props.activeTab} onTabChange={props.onTabChange} />

      {/* Tab Content */}
      {props.activeTab === 'directory' ? (
        <div className="flex-1 overflow-auto py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-zinc-500" />
            </div>
          ) : (
            <DirectoryTree
              initialExpandedIds={props.initialExpandedIds}
              selectedDirectoryId={props.selectedDirectoryId}
              selectedPageId={props.selectedBlogId}
              onSelectDirectory={props.onSelectDirectory}
              onSelectPage={props.onSelectBlog}
              onContextMenuDirectory={props.onContextMenuDirectory}
              onContextMenuPage={props.onContextMenuPage}
              onNewBlog={props.onNewBlog}
              onNewDirectory={props.onNewDirectory}
            />
          )}
        </div>
      ) : props.activeTab === 'recent' ? (
        <RecentBlogList
          selectedBlogId={props.selectedBlogId}
          onSelectBlog={props.onSelectBlog}
        />
      ) : (
        <TagPanel
          selectedTagId={props.selectedTagId}
          onSelectTag={props.onSelectTag}
        />
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-1 px-2 py-2">
        <button
          onClick={() => props.onNewBlog()}
          disabled={isLoading}
          aria-label="新建博客"
          className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100/80 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-200 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          新建博客
        </button>
        {props.activeTab === 'directory' && (
          <button
            onClick={() => props.onNewDirectory()}
            disabled={isLoading}
            aria-label="新建目录"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100/80 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-200 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderPlus className="w-4 h-4" />
            新建目录
          </button>
        )}
      </div>
    </div>
  );
});
