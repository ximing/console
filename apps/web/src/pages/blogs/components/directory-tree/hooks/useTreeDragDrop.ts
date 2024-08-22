import { useCallback } from 'react';
import { useService } from '@rabjs/react';
import { BlogService } from '../../../../../services/blog.service';
import { DirectoryService } from '../../../../../services/directory.service';
import type { TreeNodeData } from '../types';

interface DropResult {
  dragNode: TreeNodeData;
  dropTarget: TreeNodeData | null;
  isRootLevel: boolean;
}

interface UseTreeDragDropProps {
  treeData: TreeNodeData[];
  onDataChange?: (newData: TreeNodeData[]) => void;
}

export function useTreeDragDrop({ treeData, onDataChange }: UseTreeDragDropProps) {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);

  // Check if targetId is descendant of ancestorId
  const isDescendant = useCallback((targetId: string, ancestorId: string): boolean => {
    function check(nodes: TreeNodeData[], depth = 0): boolean {
      for (const node of nodes) {
        if (node.id === ancestorId && depth > 0) return true;
        if (node.children && check(node.children, depth + 1)) return true;
      }
      return false;
    }
    return check(treeData);
  }, [treeData]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { dragNode, dropTarget, isRootLevel } = result;

    if (dragNode.type === 'blog') {
      // Moving a blog
      if (dropTarget?.type === 'directory') {
        // Move into directory
        blogService.moveBlog(dragNode.id, dropTarget.id);
      } else {
        // Move to root
        blogService.moveBlog(dragNode.id, null);
      }
    } else if (dragNode.type === 'directory') {
      // Moving a directory
      if (dropTarget?.type === 'directory' && !isDescendant(dragNode.id, dropTarget.id)) {
        // Move into another directory (not allowed if it would create cycle)
        directoryService.updateDirectory(dragNode.id, { parentId: dropTarget.id });
      } else if (isRootLevel) {
        // Move to root
        directoryService.updateDirectory(dragNode.id, { parentId: null });
      }
    }
  }, [blogService, directoryService, isDescendant]);

  return {
    handleDragEnd,
    isDescendant,
  };
}
