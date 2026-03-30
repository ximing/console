import { useMemo } from 'react';
import { view, useService } from '@rabjs/react';
import { Folder, FileText, Loader2 } from 'lucide-react';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogService } from '../../../../services/blog.service';
import { TreeNode } from './TreeNode';
import { useTreeState } from './hooks/useTreeState';
import type { TreeNodeData, DirectoryTreeProps } from './types';

export const DirectoryTree = view(
  ({
    selectedDirectoryId,
    selectedPageId,
    onSelectDirectory,
    onSelectPage,
    onContextMenuDirectory,
    onContextMenuPage,
    onNewBlog,
    onNewDirectory,
  }: DirectoryTreeProps) => {
    const directoryService = useService(DirectoryService);
    const blogService = useService(BlogService);
    const { expandedIds, toggleNode } = useTreeState();

    // Build tree data from services
    const treeData = useMemo(() => {
      const buildTree = (nodes: ReturnType<DirectoryService['buildTree']>): TreeNodeData[] => {
        return nodes.map(node => ({
          id: node.id,
          type: 'directory' as const,
          name: node.name,
          children: [
            ...buildTree(node.children),
            ...blogService.blogs
              .filter(b => b.directoryId === node.id)
              .map(b => ({
                id: b.id,
                type: 'blog' as const,
                name: b.title,
                title: b.title,
                directoryId: b.directoryId,
              })),
          ],
        }));
      };

      const dirTree = directoryService.buildTree();
      return buildTree(dirTree);
    }, [directoryService, blogService.blogs]);

    // Root-level blogs (outside any directory)
    const rootBlogs = useMemo(() => {
      return blogService.blogs
        .filter(b => !b.directoryId)
        .map(b => ({
          id: b.id,
          type: 'blog' as const,
          name: b.title,
          title: b.title,
          directoryId: b.directoryId,
        }));
    }, [blogService.blogs]);

    // All blogs combined with root blogs
    const allData: TreeNodeData[] = [
      ...rootBlogs,
      ...treeData,
    ];

    if (directoryService.loading) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
        </div>
      );
    }

    return (
      <div>
        {/* All Blogs option */}
        <div
          className={`
            flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-2 mb-1
            ${selectedDirectoryId === null ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
          `}
          onClick={() => onSelectDirectory(null)}
        >
          <Folder className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span className="text-sm">全部博客</span>
        </div>

        {/* Root-level Blogs */}
        {rootBlogs.length > 0 && (
          <div>
            {rootBlogs.map(blog => (
              <div
                key={blog.id}
                className={`
                  flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-2
                  ${selectedPageId === blog.id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
                `}
                style={{ paddingLeft: '24px' }}
                onClick={() => onSelectPage(blog.id)}
                onContextMenu={e => {
                  e.preventDefault();
                  onContextMenuPage(e, blog.id);
                }}
              >
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="truncate text-sm">{blog.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Directory Tree */}
        {treeData.length > 0 ? (
          <div>
            {treeData.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                selectedDirectoryId={selectedDirectoryId}
                selectedPageId={selectedPageId}
                onToggle={toggleNode}
                onSelectDirectory={onSelectDirectory}
                onSelectPage={onSelectPage}
                onContextMenuDirectory={onContextMenuDirectory}
                onContextMenuPage={onContextMenuPage}
                onNewBlog={onNewBlog}
                onNewDirectory={onNewDirectory}
              />
            ))}
          </div>
        ) : rootBlogs.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            暂无目录
          </div>
        ) : null}
      </div>
    );
  }
);
