import { forwardRef, useState, type Ref, type ReactNode } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, FolderPlus } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { TreeNodeProps, TreeNodeData } from './types';

interface Props extends Omit<TreeNodeProps, 'node' | 'dragRef' | 'children'> {
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
          ref={dragRef}
          {...dragAttributes}
          {...dragListeners}
          className={`
            group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
            ${isSelected ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
            ${isDragging ? 'opacity-50' : ''}
            ${isDropTarget ? 'ring-2 ring-primary-500' : ''}
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

// Helper to merge refs
function mergeRefs<T>(
  dragRef: React.Ref<T> | undefined,
  nodeRef: React.Ref<T> | undefined
): React.Ref<T> | undefined {
  return (node: T) => {
    // Handle callback refs
    if (typeof dragRef === 'function') {
      dragRef(node);
    } else if (dragRef && 'current' in dragRef) {
      (dragRef as React.MutableRefObject<T | null>).current = node;
    }
    if (typeof nodeRef === 'function') {
      nodeRef(node);
    } else if (nodeRef && 'current' in nodeRef) {
      (nodeRef as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export interface DraggableTreeNodeProps extends Omit<TreeNodeProps, 'dragRef' | 'dragAttributes' | 'dragListeners' | 'isDragging' | 'isDropTarget' | 'children'> {
  node: TreeNodeData;
  depth: number;
}

export const DraggableTreeNode = forwardRef<HTMLDivElement, DraggableTreeNodeProps>(
  (props, ref) => {
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

    // Merge drag and drop refs
    const mergedRef = mergeRefs(ref, setDragRef);

    // Also set the drop ref on the same element
    const handleRef = (node: HTMLDivElement | null) => {
      if (typeof mergedRef === 'function') {
        mergedRef(node);
      } else if (mergedRef && 'current' in mergedRef) {
        (mergedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
      if (setDropRef) {
        setDropRef(node);
      }
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
        ref={handleRef as React.Ref<HTMLDivElement>}
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
        dragRef={handleRef as React.Ref<HTMLDivElement>}
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
        isDropTarget={isDropTarget}
        children={renderedChildren}
      />
    );
  }
);

DraggableTreeNode.displayName = 'DraggableTreeNode';
