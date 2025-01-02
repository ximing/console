import { forwardRef, useState, type ReactNode } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, FolderPlus } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { TreeNodeProps, TreeNodeData } from './types';

interface Props extends Omit<TreeNodeProps, 'node' | 'children'> {
  node: TreeNodeData;
  depth: number;
  children?: ReactNode;
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
      dragRef,
      dragAttributes,
      dragListeners,
      isDragging,
      isDropTarget,
      children,
    }
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
        // Toggle expand/collapse when clicking on directory with children
        if (hasChildren) {
          onToggle(node.id);
        }
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
        onContextMenuDirectory?.(e, node.id, node.name);
      } else {
        onContextMenuPage?.(e, node.id);
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
          ref={dragRef}
          {...dragAttributes}
          {...dragListeners}
          className={`
            group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md mx-1
            transition-all duration-100
            ${isSelected
              ? 'text-green-600 dark:text-green-400 font-medium'
              : 'hover:bg-green-50/60 dark:hover:bg-green-900/15 text-gray-700 dark:text-zinc-300'
            }
            ${isDragging ? 'opacity-50' : ''}
            ${isDropTarget ? 'ring-2 ring-green-500/50' : ''}
          `}
          style={{ paddingLeft: `${depth * DEPTH_INDENT + 8}px` }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Expand/Collapse Icon */}
          <span
            className="w-4 h-4 flex-shrink-0"
            onClick={handleToggle}
          >
            {isDirectory && hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              )
            ) : !isDirectory ? (
              <span className="w-4 h-4" />
            ) : null}
          </span>

          {/* Icon */}
          {isDirectory ? (
            isExpanded && hasChildren ? (
              <FolderOpen className="w-4 h-4 text-yellow-500/80 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500/80 flex-shrink-0" />
            )
          ) : (
            <FileText className="w-4 h-4 text-blue-400/70 flex-shrink-0" />
          )}

          {/* Name */}
          <span className="truncate text-xs font-medium flex-1">
            {isDirectory ? node.name : node.title}
          </span>

          {/* Hover Actions - only for directories */}
          {isDirectory && isHovered && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleNewBlog}
                className="p-1 hover:bg-gray-200/80 dark:hover:bg-zinc-700 rounded transition-colors"
                title="在当前目录创建博客"
              >
                <Plus className="w-3 h-3 text-gray-500 dark:text-zinc-400" />
              </button>
              <button
                onClick={handleNewDirectory}
                className="p-1 hover:bg-gray-200/80 dark:hover:bg-zinc-700 rounded transition-colors"
                title="在当前目录下创建子目录"
              >
                <FolderPlus className="w-3 h-3 text-gray-500 dark:text-zinc-400" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {isDirectory && isExpanded && node.children && (
          <div>
            {children || node.children.map(child => (
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

export interface DraggableTreeNodeProps extends Omit<TreeNodeProps, 'dragRef' | 'dragAttributes' | 'dragListeners' | 'isDragging' | 'isDropTarget' | 'children'> {
  node: TreeNodeData;
  depth: number;
}

export function DraggableTreeNode(props: DraggableTreeNodeProps) {
  const { node, ...treeNodeProps } = props;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    data: node,
  });

  // Only directories can be drop targets
  const isDirectory = node.type === 'directory';
  const { isOver: isDropTarget, setNodeRef: setDropRef } = useDroppable({
    id: node.id,
    data: node,
    disabled: !isDirectory,
  });

  // Create a callback ref that sets all refs without reading any ref.current during render
  const combinedRef = (domNode: HTMLDivElement | null) => {
    setDragRef(domNode);
    setDropRef(domNode);
  };

  // Render children with DraggableTreeNode for full drag support
  const renderedChildren = isDirectory && node.children ? (
    node.children.map(child => (
      <DraggableTreeNode
        key={child.id}
        node={child}
        depth={props.depth + 1}
        expandedIds={treeNodeProps.expandedIds}
        selectedDirectoryId={treeNodeProps.selectedDirectoryId}
        selectedPageId={treeNodeProps.selectedPageId}
        onToggle={treeNodeProps.onToggle}
        onSelectDirectory={treeNodeProps.onSelectDirectory}
        onSelectPage={treeNodeProps.onSelectPage}
        onContextMenuDirectory={treeNodeProps.onContextMenuDirectory}
        onContextMenuPage={treeNodeProps.onContextMenuPage}
        onNewBlog={treeNodeProps.onNewBlog}
        onNewDirectory={treeNodeProps.onNewDirectory}
      />
    ))
  ) : null;

  return (
    <TreeNode
      ref={combinedRef}
      node={node}
      depth={props.depth}
      expandedIds={treeNodeProps.expandedIds}
      selectedDirectoryId={treeNodeProps.selectedDirectoryId}
      selectedPageId={treeNodeProps.selectedPageId}
      onToggle={treeNodeProps.onToggle}
      onSelectDirectory={treeNodeProps.onSelectDirectory}
      onSelectPage={treeNodeProps.onSelectPage}
      onContextMenuDirectory={treeNodeProps.onContextMenuDirectory}
      onContextMenuPage={treeNodeProps.onContextMenuPage}
      onNewBlog={treeNodeProps.onNewBlog}
      onNewDirectory={treeNodeProps.onNewDirectory}
      dragRef={combinedRef}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
      isDropTarget={isDropTarget}
      children={renderedChildren}
    />
  );
}
