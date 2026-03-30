import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  FolderPlus,
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
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
}

/**
 * Directory Tree Component
 * Displays hierarchical directory structure with expand/collapse and context menu
 */
export const DirectoryTree = view(
  ({ selectedDirectoryId, selectedPageId, onSelectDirectory, onSelectPage, onContextMenuDirectory, onContextMenuPage, onExpandDirectory, onNewBlog, onNewDirectory }: DirectoryTreeProps) => {
    const directoryService = useService(DirectoryService);
    const blogService = useService(BlogService);

    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
    const [loadedBlogsForDirs, setLoadedBlogsForDirs] = useState<Set<string>>(new Set());
    const [dirBlogs, setDirBlogs] = useState<Map<string, BlogDto[]>>(new Map());
    const [hoveredDirId, setHoveredDirId] = useState<string | null>(null);

    // Build tree from flat directory list
    const tree = directoryService.buildTree();

    // Get root-level blogs (blogs without directory)
    const rootBlogs = blogService.blogs.filter((b) => !b.directoryId);

    // Toggle directory expand/collapse
    const toggleDir = (dirId: string) => {
      const isCurrentlyExpanded = expandedDirs.has(dirId);

      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyExpanded) {
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

    // Handle directory click - toggle expand if has children or blogs, otherwise select
    const handleDirectoryClick = (dir: DirectoryTreeNode) => {
      const blogs = dirBlogs.get(dir.id) || [];
      if (dir.children.length > 0 || blogs.length > 0) {
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
      const isHovered = hoveredDirId === node.id;

      return (
        <div key={node.id}>
          <div
            className={`
              group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
              ${isActive ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
            `}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => handleDirectoryClick(node)}
            onContextMenu={(e) => handleContextMenu(e, node)}
            onMouseEnter={() => setHoveredDirId(node.id)}
            onMouseLeave={() => setHoveredDirId(null)}
          >
            {/* Expand/Collapse Icon */}
            <span className="w-4 h-4 flex-shrink-0">
              {hasChildren || blogs.length > 0 ? (
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
            {isExpanded && (hasChildren || blogs.length > 0) ? (
              <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )}

            {/* Name */}
            <span className="truncate text-sm flex-1">{node.name}</span>

            {/* Hover Actions */}
            {isHovered && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewBlog(node.id);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
                  title="在当前目录创建博客"
                >
                  <Plus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewDirectory(node.id);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
                  title="在当前目录下创建子目录"
                >
                  <FolderPlus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            )}
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

    // Render root-level blog
    const renderRootBlog = (blog: BlogDto) => {
      const isPageActive = selectedPageId === blog.id;
      return (
        <div
          key={blog.id}
          className={`
            flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-2
            ${isPageActive ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
          `}
          style={{ paddingLeft: '24px' }}
          onClick={() => onSelectPage(blog.id)}
          onContextMenu={(e) => handlePageContextMenu(e, blog)}
        >
          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="truncate text-sm">{blog.title}</span>
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

        {/* Root-level Blogs */}
        {rootBlogs.length > 0 && (
          <div>
            {rootBlogs.map((blog) => renderRootBlog(blog))}
          </div>
        )}

        {/* Directory Tree */}
        {tree.length > 0 ? (
          <div>{tree.map((node) => renderNode(node))}</div>
        ) : rootBlogs.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            暂无目录
          </div>
        ) : null}
      </>
    );
  }
);
