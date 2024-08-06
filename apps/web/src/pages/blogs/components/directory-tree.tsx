import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { DirectoryService, type DirectoryTreeNode } from '../../../services/directory.service';
import { BlogService } from '../../../services/blog.service';
import type { BlogDto } from '@x-console/dto';

interface DirectoryTreeProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onContextMenuDirectory: (e: React.MouseEvent, node: DirectoryTreeNode) => void;
  onContextMenuPage: (e: React.MouseEvent, blog: BlogDto) => void;
  onExpandDirectory?: (directoryId: string) => void;
}

/**
 * Directory Tree Component
 * Displays hierarchical directory structure with expand/collapse and context menu
 */
export const DirectoryTree = view(
  ({ selectedDirectoryId, selectedPageId, onSelectDirectory, onSelectPage, onContextMenuDirectory, onContextMenuPage, onExpandDirectory }: DirectoryTreeProps) => {
    const directoryService = useService(DirectoryService);
    const blogService = useService(BlogService);

    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
    const [loadedBlogsForDirs, setLoadedBlogsForDirs] = useState<Set<string>>(new Set());
    const [dirBlogs, setDirBlogs] = useState<Map<string, BlogDto[]>>(new Map());

    // Build tree from flat directory list
    const tree = directoryService.buildTree();

    // Toggle directory expand/collapse
    const toggleDir = async (dirId: string) => {
      const isExpanding = !expandedDirs.has(dirId);

      if (isExpanding && !loadedBlogsForDirs.has(dirId)) {
        // Load blogs for this directory when expanding for the first time
        await blogService.loadBlogs({ directoryId: dirId, pageSize: 1000 });
        setLoadedBlogsForDirs((prev) => new Set(prev).add(dirId));
        setDirBlogs((prev) => new Map(prev).set(dirId, blogService.blogs));
      }

      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(dirId)) {
          next.delete(dirId);
        } else {
          next.add(dirId);
          // Notify parent that directory was expanded
          if (onExpandDirectory) {
            onExpandDirectory(dirId);
          }
        }
        return next;
      });
    };

    // Handle directory click - toggle expand if has children, otherwise select
    const handleDirectoryClick = (dir: DirectoryTreeNode) => {
      if (dir.children.length > 0) {
        toggleDir(dir.id);
      }
      onSelectDirectory(dir.id);
    };

    // Handle right-click context menu for directories
    const handleContextMenu = (e: React.MouseEvent, node: DirectoryTreeNode) => {
      e.preventDefault();
      onContextMenuDirectory(e, node);
    };

    // Handle right-click context menu for pages
    const handlePageContextMenu = (e: React.MouseEvent, blog: BlogDto) => {
      e.preventDefault();
      onContextMenuPage(e, blog);
    };

    // Render directory node recursively
    const renderNode = (node: DirectoryTreeNode, depth: number = 0): React.ReactNode => {
      const isExpanded = expandedDirs.has(node.id);
      const isActive = selectedDirectoryId === node.id;
      const hasChildren = node.children.length > 0;
      const blogs = dirBlogs.get(node.id) || [];

      return (
        <div key={node.id}>
          <div
            className={`
              flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
              ${isActive ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
            `}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => handleDirectoryClick(node)}
            onContextMenu={(e) => handleContextMenu(e, node)}
          >
            {/* Expand/Collapse Icon */}
            <span className="w-4 h-4 flex-shrink-0">
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )
              ) : (
                <span className="w-4 h-4" />
              )}
            </span>

            {/* Folder Icon */}
            {isExpanded && hasChildren ? (
              <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )}

            {/* Name */}
            <span className="truncate text-sm">{node.name}</span>
          </div>

          {/* Children - Subdirectories and Blog Pages */}
          {(hasChildren || blogs.length > 0) && isExpanded && (
            <div>
              {/* Subdirectories */}
              {node.children.map((child) => renderNode(child, depth + 1))}

              {/* Blog Pages */}
              {blogs.map((blog) => {
                const isPageActive = selectedPageId === blog.id;
                return (
                  <div
                    key={blog.id}
                    className={`
                      flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
                      ${isPageActive ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
                    `}
                    style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
                    onClick={() => onSelectPage(blog.id)}
                    onContextMenu={(e) => handlePageContextMenu(e, blog)}
                  >
                    <span className="w-4 h-4" />
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="truncate text-sm">{blog.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    };

    return (
      <>
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

        {/* Directory Tree */}
        {tree.length > 0 ? (
          <div>{tree.map((node) => renderNode(node))}</div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            暂无目录
          </div>
        )}
      </>
    );
  }
);
