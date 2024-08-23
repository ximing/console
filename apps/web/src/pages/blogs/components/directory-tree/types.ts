export interface TreeNodeData {
  id: string;
  type: 'directory' | 'blog';
  name: string;
  children?: TreeNodeData[];
  // Blog specific
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
  onContextMenuDirectory: (e: React.MouseEvent, nodeId: string, nodeName: string) => void;
  onContextMenuPage: (e: React.MouseEvent, blogId: string) => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
  // Drag and drop props
  dragRef?: React.Ref<HTMLDivElement>;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
  isDragging?: boolean;
  isDropTarget?: boolean;
  // Children (rendered recursively by parent for drag support)
  children?: React.ReactNode;
}

export interface DirectoryTreeProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onContextMenuDirectory: (e: React.MouseEvent, nodeId: string, nodeName: string) => void;
  onContextMenuPage: (e: React.MouseEvent, blogId: string) => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
}
