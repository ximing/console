import React from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';

export interface TreeNodeData {
  id: string;
  type: 'directory' | 'blog';
  name: string;
  children?: TreeNodeData[];
  title?: string;
  directoryId?: string;
}

export interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  expandedIds: Set<string>;
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onToggle: (id: string) => void;
  onSelectDirectory: (id: string) => void;
  onSelectPage: (id: string) => void;
  onContextMenuDirectory?: (e: React.MouseEvent, nodeId: string, nodeName: string) => void;
  onContextMenuPage?: (e: React.MouseEvent, blogId: string) => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
  // drag props
  dragRef?: (el: HTMLDivElement | null) => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: Record<string, unknown>;
  isDragging?: boolean;
  isDropTarget?: boolean;
}

export interface DirectoryTreeProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onContextMenuDirectory?: (e: React.MouseEvent, nodeId: string, nodeName: string) => void;
  onContextMenuPage?: (e: React.MouseEvent, blogId: string) => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
  initialExpandedIds?: string[];
}
