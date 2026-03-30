import { forwardRef, useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, FolderPlus } from 'lucide-react';
import type { DirectoryNodeRendererProps } from '../types';

interface Props extends DirectoryNodeRendererProps {
  selectedDirectoryId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onNewBlog: (directoryId: string) => void;
  onNewDirectory: (parentId: string) => void;
}

export const DirectoryNode = forwardRef<HTMLDivElement, Props>(
  ({ node, style, selectedDirectoryId, onSelectDirectory, onNewBlog, onNewDirectory }, ref) => {
    const { data, isOpen, isDropTarget } = node;
    const hasChildren = data.children && data.children.length > 0;
    const [isHovered, setIsHovered] = useState(false);
    const isSelected = selectedDirectoryId === data.id;

    return (
      <div
        ref={ref}
        style={style}
        className={`
          group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
          ${isSelected ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
          ${isDropTarget ? 'bg-green-100 dark:bg-green-900/30' : ''}
        `}
        onClick={() => onSelectDirectory(data.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/Collapse Icon */}
        <span className="w-4 h-4 flex-shrink-0">
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </span>

        {/* Folder Icon */}
        {isOpen && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        )}

        {/* Name */}
        <span className="truncate text-sm flex-1">{data.name}</span>

        {/* Hover Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewBlog(data.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
            title="在当前目录创建博客"
          >
            <Plus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewDirectory(data.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
            title="在当前目录下创建子目录"
          >
            <FolderPlus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
    );
  }
);

DirectoryNode.displayName = 'DirectoryNode';