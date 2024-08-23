import { useMemo, useState, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { Folder, Loader2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogService } from '../../../../services/blog.service';
import { DraggableTreeNode } from './TreeNode';
import { TreeDragOverlay } from './TreeDragOverlay';
import { useTreeState } from './hooks/useTreeState';
import { useTreeDragDrop } from './hooks/useTreeDragDrop';
import type { TreeNodeData, DirectoryTreeProps } from './types';

export const DirectoryTree = view(
  ({
    selectedDirectoryId,
    selectedPageId,
    onSelectDirectory,
    onSelectPage,
    onContextMenuDirectory,
    onContextMenuPage,
    onNewBlog,
    onNewDirectory,
  }: DirectoryTreeProps) => {
    const directoryService = useService(DirectoryService);
    const blogService = useService(BlogService);
    const { expandedIds, toggleNode } = useTreeState();
    const [activeNode, setActiveNode] = useState<TreeNodeData | null>(null);

    // Build tree data from services
    const treeData = useMemo(() => {
      const buildTree = (nodes: ReturnType<DirectoryService['buildTree']>): TreeNodeData[] => {
        return nodes.map(node => ({
          id: node.id,
          type: 'directory' as const,
          name: node.name,
          children: [
            ...buildTree(node.children),
            ...blogService.blogs
              .filter(b => b.directoryId === node.id)
              .map(b => ({
                id: b.id,
                type: 'blog' as const,
                name: b.title,
                title: b.title,
                directoryId: b.directoryId,
              })),
          ],
        }));
      };

      const dirTree = directoryService.buildTree();
      return buildTree(dirTree);
    }, [directoryService, blogService.blogs]);

    // Root-level blogs (outside any directory)
    const rootBlogs = useMemo(() => {
      return blogService.blogs
        .filter(b => !b.directoryId)
        .map(b => ({
          id: b.id,
          type: 'blog' as const,
          name: b.title,
          title: b.title,
          directoryId: b.directoryId,
        }));
    }, [blogService.blogs]);

    // All blogs combined with root blogs
    const allData: TreeNodeData[] = [
      ...rootBlogs,
      ...treeData,
    ];

    const { handleDragEnd } = useTreeDragDrop({ treeData: allData });

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      })
    );

    // Helper to find node by ID
    const findNodeById = useCallback(
      (id: string): TreeNodeData | null => {
        function search(nodes: TreeNodeData[]): TreeNodeData | null {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
              const found = search(node.children);
              if (found) return found;
            }
          }
          return null;
        }
        return search(allData);
      },
      [allData]
    );

    const handleDragStart = useCallback(
      (event: DragStartEvent) => {
        const { active } = event;
        const node = findNodeById(active.id as string);
        setActiveNode(node);
      },
      [findNodeById]
    );

    const onDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveNode(null);

        if (!over) return;

        const dragNode = findNodeById(active.id as string);
        if (!dragNode) return;

        const isRootDropZone = over.id === 'root-drop-zone';
        const dropTarget = isRootDropZone ? null : findNodeById(over.id as string);

        handleDragEnd({
          dragNode,
          dropTarget,
          isRootLevel: isRootDropZone,
        });
      },
      [findNodeById, handleDragEnd]
    );

    if (directoryService.loading) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
        </div>
      );
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
      >
        <div>
        {/* All Blogs option */}
        <div
          className={`
            flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-2 mb-1
            ${selectedDirectoryId === null ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
          `}
          onClick={() => onSelectDirectory(null)}
        >
          <Folder className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span className="text-sm">全部博客</span>
        </div>

        {/* Root-level Blogs */}
        {rootBlogs.length > 0 && (
          <div>
            {rootBlogs.map(blog => (
              <DraggableTreeNode
                key={blog.id}
                node={blog}
                depth={0}
                expandedIds={expandedIds}
                selectedDirectoryId={selectedDirectoryId}
                selectedPageId={selectedPageId}
                onToggle={toggleNode}
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

        {/* Directory Tree */}
        {treeData.length > 0 ? (
          <div>
            {treeData.map(node => (
              <DraggableTreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                selectedDirectoryId={selectedDirectoryId}
                selectedPageId={selectedPageId}
                onToggle={toggleNode}
                onSelectDirectory={onSelectDirectory}
                onSelectPage={onSelectPage}
                onContextMenuDirectory={onContextMenuDirectory}
                onContextMenuPage={onContextMenuPage}
                onNewBlog={onNewBlog}
                onNewDirectory={onNewDirectory}
              />
            ))}
          </div>
        ) : rootBlogs.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            暂无目录
          </div>
        ) : null}

        {/* Root Drop Zone - for dropping items at root level */}
        <div
          id="root-drop-zone"
          className="h-2"
          data-empty={treeData.length === 0 && rootBlogs.length === 0 ? true : undefined}
        />
        </div>
        <DragOverlay>
          <TreeDragOverlay node={activeNode} />
        </DragOverlay>
      </DndContext>
    );
  }
);
