import { view, useService } from '@rabjs/react';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogService } from '../../../../services/blog.service';
import { SearchButton } from './search-button';
import { DirectoryTree } from '../directory-tree';
import type { DirectoryTreeNode } from '../../../../services/directory.service';
import type { BlogDto } from '@x-console/dto';
import { Plus, FolderPlus, Loader2 } from 'lucide-react';

interface SidebarProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onSearchClick: () => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
  onContextMenuDirectory: (e: React.MouseEvent, nodeId: string, nodeName: string) => void;
  onContextMenuPage: (e: React.MouseEvent, blogId: string) => void;
  onExpandDirectory?: (directoryId: string) => void;
}

export const Sidebar = view((props: SidebarProps) => {
  const directoryService = useService(DirectoryService);
  const blogService = useService(BlogService);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700">
      {/* Search Button */}
      <div className="px-2 py-2 border-b border-gray-200 dark:border-dark-700">
        <SearchButton onClick={props.onSearchClick} />
      </div>

      {/* Directory Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-dark-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">目录</span>
      </div>

      {/* Directory Tree */}
      <div className="flex-1 overflow-auto py-1">
        {directoryService.loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
          </div>
        ) : (
          <DirectoryTree
            selectedDirectoryId={props.selectedDirectoryId}
            selectedPageId={props.selectedPageId}
            onSelectDirectory={props.onSelectDirectory}
            onSelectPage={props.onSelectPage}
            onContextMenuDirectory={props.onContextMenuDirectory}
            onContextMenuPage={props.onContextMenuPage}
            onNewBlog={props.onNewBlog}
            onNewDirectory={props.onNewDirectory}
          />
        )}
      </div>

      {/* Action Buttons - New Blog and New Directory */}
      <div className="flex flex-col gap-1 px-2 py-2 border-t border-gray-200 dark:border-dark-700">
        <button
          onClick={() => props.onNewBlog()}
          disabled={blogService.loading || directoryService.loading}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          新建博客
        </button>
        <button
          onClick={() => props.onNewDirectory()}
          disabled={blogService.loading || directoryService.loading}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FolderPlus className="w-4 h-4" />
          新建目录
        </button>
      </div>
    </div>
  );
});
