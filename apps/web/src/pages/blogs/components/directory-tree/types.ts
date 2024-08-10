// Unified tree node data for react-arborist
export interface DirectoryTreeNodeData {
  id: string;
  type: 'directory';
  name: string;
  children?: TreeNodeData[];
}

export interface BlogTreeNodeData {
  id: string;
  type: 'blog';
  title: string;
  directoryId?: string;
}

export type TreeNodeData = DirectoryTreeNodeData | BlogTreeNodeData;

// Props for directory node renderer
export interface DirectoryNodeRendererProps {
  node: {
    data: DirectoryTreeNodeData;
    isOpen: boolean;
    isSelected: boolean;
    isDropTarget: boolean;
  };
  style: React.CSSProperties;
  dragHandle?: React.Ref<HTMLDivElement>;
}

// Props for blog node renderer
export interface BlogNodeRendererProps {
  node: {
    data: BlogTreeNodeData;
    isSelected: boolean;
  };
  style: React.CSSProperties;
  dragHandle?: React.Ref<HTMLDivElement>;
}
