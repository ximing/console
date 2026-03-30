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
