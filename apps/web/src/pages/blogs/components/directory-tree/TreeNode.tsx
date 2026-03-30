import { forwardRef, useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, FolderPlus } from 'lucide-react';
import type { TreeNodeProps } from './types';

interface Props extends Omit<TreeNodeProps, 'node'> {
  node: TreeNodeData;
  depth: number;
}

const DEPTH_INDENT = 16; // pixels per depth level

export const TreeNode = forwardRef<HTMLDivElement, Props>(
  (
    {
      node,
      depth,
      expandedIds,
      selectedDirectoryId,
      selectedPageId,
      onToggle,
      onSelectDirectory,
      onSelectPage,
      onContextMenuDirectory,
      onContextMenuPage,
      onNewBlog,
      onNewDirectory,
    },
    ref
  ) => {
    const isDirectory = node.type === 'directory';
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = isDirectory && node.children && node.children.length > 0;
    const [isHovered, setIsHovered] = useState(false);

    const isSelected = isDirectory
      ? selectedDirectoryId === node.id
      : selectedPageId === node.id;

    const handleClick = () => {
      if (isDirectory) {
        onSelectDirectory(node.id);
      } else {
        onSelectPage(node.id);
      }
    };

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDirectory) {
        onToggle(node.id);
      }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDirectory) {
        onContextMenuDirectory(e, node.id, node.name);
      } else {
        onContextMenuPage(e, node.id);
      }
    };

    const handleNewBlog = (e: React.MouseEvent) => {
      e.stopPropagation();
      onNewBlog(node.id);
    };

    const handleNewDirectory = (e: React.MouseEvent) => {
      e.stopPropagation();
      onNewDirectory(node.id);
    };

    return (
      <div>
        <div
          ref={ref}
          className={`
            group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
            ${isSelected ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
          `}
          style={{ paddingLeft: `${depth * DEPTH_INDENT + 8}px` }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Expand/Collapse Icon */}
          <span className="w-4 h-4 flex-shrink-0">
            {isDirectory && hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )
            ) : !isDirectory ? (
              <span className="w-4 h-4" />
            ) : null}
          </span>

          {/* Icon */}
          {isDirectory ? (
            isExpanded && hasChildren ? (
              <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )
          ) : (
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
          )}

          {/* Name */}
          <span className="truncate text-sm flex-1">
            {isDirectory ? node.name : node.title}
          </span>

          {/* Hover Actions - only for directories */}
          {isDirectory && isHovered && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleNewBlog}
                className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
                title="在当前目录创建博客"
              >
                <Plus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={handleNewDirectory}
                className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
                title="在当前目录下创建子目录"
              >
                <FolderPlus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                selectedDirectoryId={selectedDirectoryId}
                selectedPageId={selectedPageId}
                onToggle={onToggle}
                onSelectDirectory={onSelectDirectory}
                onSelectPage={onSelectPage}
                onContextMenuDirectory={onContextMenuDirectory}
                onContextMenuPage={onContextMenuPage}
                onNewBlog={onNewBlog}
                onNewDirectory={onNewDirectory}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

TreeNode.displayName = 'TreeNode';
