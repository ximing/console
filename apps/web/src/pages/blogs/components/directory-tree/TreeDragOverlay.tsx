import { Folder, FileText } from 'lucide-react';
import type { TreeNodeData } from './types';

interface TreeDragOverlayProps {
  node: TreeNodeData | null;
}

export function TreeDragOverlay({ node }: TreeDragOverlayProps) {
  if (!node) return null;

  const isDirectory = node.type === 'directory';

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-dark-800 border border-primary-300 dark:border-primary-700 rounded-lg shadow-lg opacity-80">
      {isDirectory ? (
        <Folder className="w-4 h-4 text-yellow-500" />
      ) : (
        <FileText className="w-4 h-4 text-blue-500" />
      )}
      <span className="text-sm font-medium truncate">
        {isDirectory ? node.name : node.title}
      </span>
    </div>
  );
}
