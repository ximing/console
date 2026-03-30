import { useCallback } from 'react';
import { useService } from '@rabjs/react';
import { BlogService } from '../../../../services/blog.service';
import { DirectoryService } from '../../../../services/directory.service';
import type { TreeNodeData } from '../types';

interface DropParams {
  dragNode: { data: TreeNodeData };
  dropNode: { data: TreeNodeData } | null;
  dropTargetId: string | null;
}

/**
 * Check if targetId is a descendant of dragId in the directory tree
 */
function isDescendant(
  directoryTree: TreeNodeData[],
  targetId: string,
  dragId: string
): boolean {
  for (const node of directoryTree) {
    if (node.type !== 'directory') continue;

    // If this node is the drag node, check its children
    if (node.id === dragId) {
      if (node.children?.some((child) => child.id === targetId)) {
        return true;
      }
      // Recursively check children
      if (isDescendant(node.children || [], targetId, dragId)) {
        return true;
      }
    }

    // Check children
    if (isDescendant(node.children || [], targetId, dragId)) {
      return true;
    }
  }
  return false;
}

export function useDropHandler() {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);

  const handleDrop = useCallback(
    (params: DropParams, treeData: TreeNodeData[]) => {
      const { dragNode, dropNode } = params;
      const dragData = dragNode.data;
      const dropTarget = dropNode?.data;

      if (dragData.type === 'blog') {
        // Move blog to target directory (or root if no dropTarget or dropTarget is blog)
        const targetDirId =
          dropTarget?.type === 'directory' ? dropTarget.id : undefined;
        blogService.moveBlog(dragData.id, targetDirId || null);
      } else if (dragData.type === 'directory') {
        // Validate: can't drop directory into itself
        if (dropTarget?.id === dragData.id) {
          return;
        }

        // Validate: can't drop directory into its descendant
        if (dropTarget && isDescendant(treeData, dropTarget.id, dragData.id)) {
          return;
        }

        // Reparent directory to target (or root if dropped on blog or no target)
        const newParentId =
          dropTarget?.type === 'directory' ? dropTarget.id : null;
        directoryService.updateDirectory(dragData.id, { parentId: newParentId });
      }
    },
    [blogService, directoryService]
  );

  return { handleDrop };
}
