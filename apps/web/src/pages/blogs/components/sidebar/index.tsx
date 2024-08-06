import { view, useService } from '@rabjs/react';
import { DirectoryService } from '../../../services/directory.service';
import { BlogService } from '../../../services/blog.service';
import { SearchButton } from './search-button';
import { ActionButtons } from './action-buttons';
import { DirectoryTree } from '../directory-tree';
import type { DirectoryTreeNode } from '../../../../services/directory.service';
import type { BlogDto } from '@x-console/dto';

interface SidebarProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onSearchClick: () => void;
  onNewBlog: () => void;
  onNewDirectory: () => void;
  onContextMenuDirectory: (e: React.MouseEvent, node: DirectoryTreeNode) => void;
  onContextMenuPage: (e: React.MouseEvent, blog: BlogDto) => void;
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

      {/* Directory Tree */}
      <div className="flex-1 overflow-auto py-1">
        <DirectoryTree
          selectedDirectoryId={props.selectedDirectoryId}
          selectedPageId={props.selectedPageId}
          onSelectDirectory={props.onSelectDirectory}
          onSelectPage={props.onSelectPage}
          onContextMenuDirectory={props.onContextMenuDirectory}
          onContextMenuPage={props.onContextMenuPage}
          onExpandDirectory={props.onExpandDirectory}
        />
      </div>

      {/* Action Buttons */}
      <ActionButtons
        onNewBlog={props.onNewBlog}
        onNewDirectory={props.onNewDirectory}
        disabled={blogService.loading || directoryService.loading}
      />
    </div>
  );
});
