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
}

export function useTreeDragDrop({ treeData }: UseTreeDragDropProps) {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);

  // Check if targetId is descendant of ancestorId
  // Returns true if ancestorId is in the subtree rooted at targetId
  const isDescendant = useCallback((targetId: string, ancestorId: string): boolean => {
    // First, find the targetId node, then check if ancestorId exists in its subtree
    function findNodeAndCheckDescendant(nodes: TreeNodeData[]): boolean {
      for (const node of nodes) {
        if (node.id === targetId) {
          // Found targetId, now check if ancestorId is in its subtree
          return containsId(node.children || [], ancestorId);
        }
        if (node.children && findNodeAndCheckDescendant(node.children)) {
          return true;
        }
      }
      return false;
    }

    // Check if a node with given id exists in the subtree
    function containsId(nodes: TreeNodeData[], id: string): boolean {
      for (const node of nodes) {
        if (node.id === id) return true;
        if (node.children && containsId(node.children, id)) return true;
      }
      return false;
    }

    return findNodeAndCheckDescendant(treeData);
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
