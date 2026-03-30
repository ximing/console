# Directory Tree 重构实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用自定义递归组件 + @dnd-kit 重构目录树，替代 react-arborist

**Architecture:** 自定义递归组件渲染树形结构，@dnd-kit/core 处理拖拽交互，内部状态管理展开/收起，外部状态由父组件通过 props 传入

**Tech Stack:** @dnd-kit/core, @dnd-kit/utilities, React hooks

---

## Chunk 1: 安装依赖 & 创建基础组件结构

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/pages/blogs/components/directory-tree/types.ts`
- Create: `apps/web/src/pages/blogs/components/directory-tree/hooks/useTreeState.ts`
- Create: `apps/web/src/pages/blogs/components/directory-tree/index.tsx` (基础版本，无拖拽)

- [ ] **Step 1: 安装 @dnd-kit 依赖**

Run: `pnpm --filter @x-console/web add @dnd-kit/core @dnd-kit/utilities @dnd-kit/css`

- [ ] **Step 2: 创建 types.ts**

```typescript
// apps/web/src/pages/blogs/components/directory-tree/types.ts

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
```

- [ ] **Step 3: 创建 useTreeState.ts**

```typescript
// apps/web/src/pages/blogs/components/directory-tree/hooks/useTreeState.ts

import { useState, useCallback } from 'react';

export function useTreeState(initialExpandedIds: string[] = []) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(initialExpandedIds));

  const toggleNode = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandNode = useCallback((id: string) => {
    setExpandedIds(prev => new Set(prev).add(id));
  }, []);

  const collapseNode = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const expandMultiple = useCallback((ids: string[]) => {
    setExpandedIds(prev => new Set([...prev, ...ids]));
  }, []);

  return {
    expandedIds,
    setExpandedIds,
    toggleNode,
    expandNode,
    collapseNode,
    expandMultiple,
  };
}
```

- [ ] **Step 4: 创建 TreeNode.tsx（无拖拽版本）**

```typescript
// apps/web/src/pages/blogs/components/directory-tree/TreeNode.tsx

import { forwardRef } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, FolderPlus } from 'lucide-react';
import type { TreeNodeProps } from './types';

export const TreeNode = forwardRef<HTMLDivElement, TreeNodeProps>(
  ({ node, depth, expandedIds, selectedDirectoryId, selectedPageId, onToggle, onSelectDirectory, onSelectPage, onContextMenuDirectory, onContextMenuPage, onNewBlog, onNewDirectory }, ref) => {
    const isDirectory = node.type === 'directory';
    const isExpanded = expandedIds.has(node.id);
    const isSelected = isDirectory ? selectedDirectoryId === node.id : selectedPageId === node.id;
    const hasChildren = isDirectory && node.children && node.children.length > 0;

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
      if (isDirectory) {
        onContextMenuDirectory(e, node.id, node.name);
      } else {
        onContextMenuPage(e, node.id);
      }
    };

    return (
      <div ref={ref}>
        <div
          className={`
            group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
            ${isSelected ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          {/* Expand/Collapse Icon */}
          <span
            className="w-4 h-4 flex-shrink-0 cursor-pointer"
            onClick={handleToggle}
          >
            {isDirectory && hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            ) : isDirectory ? (
              <span className="w-4 h-4" />
            ) : (
              <span className="w-4 h-4" />
            )}
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
          <span className="truncate text-sm flex-1">{isDirectory ? node.name : node.title}</span>

          {/* Hover Actions for Directory */}
          {isDirectory && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNewBlog(node.id);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
                title="在当前目录创建博客"
              >
                <Plus className="w-3 h-3 text-gray-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNewDirectory(node.id);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
                title="在当前目录下创建子目录"
              >
                <FolderPlus className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {isDirectory && isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => (
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
```

- [ ] **Step 5: 创建 index.tsx（基础版本）**

```typescript
// apps/web/src/pages/blogs/components/directory-tree/index.tsx

import { useMemo } from 'react';
import { view, useService } from '@rabjs/react';
import { Folder, FileText, Loader2 } from 'lucide-react';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogService } from '../../../../services/blog.service';
import { TreeNode } from './TreeNode';
import { useTreeState } from './hooks/useTreeState';
import type { DirectoryTreeProps, TreeNodeData } from './types';

export const DirectoryTree = view((props: DirectoryTreeProps) => {
  const directoryService = useService(DirectoryService);
  const blogService = useService(BlogService);
  const { expandedIds, toggleNode, expandMultiple } = useTreeState();

  // Build tree data
  const treeData = useMemo(() => {
    const dirTree = directoryService.buildTree();
    const blogs = blogService.blogs;
    return buildTreeData(dirTree, blogs);
  }, [directoryService.buildTree, blogService.blogs]);

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

  if (directoryService.loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      {/* All Blogs option */}
      <div
        className={`
          flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-2 mb-1
          ${props.selectedDirectoryId === null ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
        `}
        onClick={() => props.onSelectDirectory(null)}
      >
        <Folder className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="text-sm">全部博客</span>
      </div>

      {/* Root-level Blogs */}
      {rootBlogs.map(blog => (
        <div
          key={blog.id}
          className={`
            flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-2
            ${props.selectedPageId === blog.id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
          `}
          style={{ paddingLeft: '24px' }}
          onClick={() => props.onSelectPage(blog.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            props.onContextMenuPage(e, blog.id);
          }}
        >
          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="truncate text-sm">{blog.title}</span>
        </div>
      ))}

      {/* Directory Tree */}
      {treeData.length > 0 ? (
        treeData.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            expandedIds={expandedIds}
            selectedDirectoryId={props.selectedDirectoryId}
            selectedPageId={props.selectedPageId}
            onToggle={toggleNode}
            onSelectDirectory={props.onSelectDirectory}
            onSelectPage={props.onSelectPage}
            onContextMenuDirectory={props.onContextMenuDirectory}
            onContextMenuPage={props.onContextMenuPage}
            onNewBlog={props.onNewBlog}
            onNewDirectory={props.onNewDirectory}
          />
        ))
      ) : (
        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
          暂无目录
        </div>
      )}
    </div>
  );
});

// Helper to build tree data
function buildTreeData(
  directoryTree: Array<{ id: string; name: string; children: any[] }>,
  blogs: Array<{ id: string; title: string; directoryId?: string }>
): TreeNodeData[] {
  const blogsByDir = new Map<string, typeof blogs>();
  for (const blog of blogs) {
    if (blog.directoryId) {
      const existing = blogsByDir.get(blog.directoryId) || [];
      existing.push(blog);
      blogsByDir.set(blog.directoryId, existing);
    }
  }

  function transform(node: typeof directoryTree[0]): TreeNodeData {
    const children: TreeNodeData[] = [];

    // Child directories
    for (const child of node.children) {
      children.push(transform(child));
    }

    // Blogs in this directory
    const dirBlogs = blogsByDir.get(node.id) || [];
    for (const blog of dirBlogs) {
      children.push({
        id: blog.id,
        type: 'blog',
        name: blog.title,
        title: blog.title,
        directoryId: blog.directoryId,
      });
    }

    return {
      id: node.id,
      type: 'directory',
      name: node.name,
      children: children.length > 0 ? children : undefined,
    };
  }

  return directoryTree.map(transform);
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @x-console/web typecheck`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/src/pages/blogs/components/directory-tree/
git commit -m "feat(web): create directory-tree component structure with custom recursive TreeNode

- Add @dnd-kit/core and @dnd-kit/utilities
- Create types.ts with TreeNodeData, TreeNodeProps, DirectoryTreeProps
- Create useTreeState hook for expand/collapse state
- Create TreeNode recursive component with hover actions
- Create DirectoryTree index with tree data building
- Support directory/blog selection and context menu props

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: 集成 @dnd-kit 拖拽

**Files:**
- Create: `apps/web/src/pages/blogs/components/directory-tree/hooks/useTreeDragDrop.ts`
- Modify: `apps/web/src/pages/blogs/components/directory-tree/index.tsx`
- Modify: `apps/web/src/pages/blogs/components/directory-tree/TreeNode.tsx`
- Create: `apps/web/src/pages/blogs/components/directory-tree/DragOverlay.tsx`

- [ ] **Step 1: 创建 useTreeDragDrop.ts**

```typescript
// apps/web/src/pages/blogs/components/directory-tree/hooks/useTreeDragDrop.ts

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
```

- [ ] **Step 2: 创建 DragOverlay.tsx**

```typescript
// apps/web/src/pages/blogs/components/directory-tree/DragOverlay.tsx

import { Folder, FileText } from 'lucide-react';
import type { TreeNodeData } from './types';

interface DragOverlayProps {
  node: TreeNodeData | null;
}

export function DragOverlay({ node }: DragOverlayProps) {
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
```

- [ ] **Step 3: 修改 index.tsx 添加 DndContext**

```typescript
// apps/web/src/pages/blogs/components/directory-tree/index.tsx (修改版)

// 在 import 部分添加
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { DragOverlay } from './DragOverlay';

// 添加 state
const [activeNode, setActiveNode] = useState<TreeNodeData | null>(null);

// 添加 sensors
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  })
);

// 添加 drag handlers
const handleDragStart = (event: DragStartEvent) => {
  const { active } = event;
  const nodeData = active.data.current as TreeNodeData;
  setActiveNode(nodeData);
};

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  setActiveNode(null);

  if (!over) return;

  const dragNode = active.data.current as TreeNodeData;
  const overId = over.id as string;

  // Determine drop target
  let dropTarget: TreeNodeData | null = null;
  let isRootLevel = false;

  if (overId === 'root-drop-zone') {
    isRootLevel = true;
  } else {
    // Find the over node in tree data
    dropTarget = findNodeById(treeData, overId);
  }

  // Call handleDragEnd from hook
  handleTreeDragEnd({ dragNode, dropTarget, isRootLevel });
};

// 在 JSX 中添加 DndContext
return (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    <div>
      {/* All Blogs */}
      <div
        id="root-drop-zone"
        onClick={() => props.onSelectDirectory(null)}
        className={...}
      >
        ...
      </div>

      {/* Tree nodes with draggable */}
      {treeData.map(node => (
        <DraggableTreeNode
          key={node.id}
          node={node}
          ...
        />
      ))}
    </div>

    <DragOverlay>
      <DragOverlayContent node={activeNode} />
    </DragOverlay>
  </DndContext>
);
```

- [ ] **Step 4: 修改 TreeNode.tsx 添加 DraggableTreeNode**

在 TreeNode.tsx 中添加 `DraggableTreeNode` 组件，使用 `@dnd-kit/core` 的 `useDraggable` 和 `useDroppable`。

```typescript
// 添加到 TreeNode.tsx

import { useDraggable, useDroppable } from '@dnd-kit/core';

interface DraggableTreeNodeProps extends TreeNodeProps {
  isDropTarget?: boolean;
}

export const DraggableTreeNode = forwardRef<HTMLDivElement, DraggableTreeNodeProps>(
  (props, ref) => {
    const { node, isDropTarget } = props;

    const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
      id: node.id,
      data: node,
    });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: node.id,
      data: node,
      disabled: node.type !== 'directory', // Only directories are drop targets
    });

    // Merge refs
    const setRefs = useCallback((el: HTMLDivElement | null) => {
      setDragRef(el);
      setDropRef(el);
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    }, [setDragRef, setDropRef, ref]);

    return (
      <div ref={setRefs} {...attributes} {...listeners}>
        <TreeNodeContent
          {...props}
          isDragging={isDragging}
          isDropTarget={isOver || isDropTarget}
        />
      </div>
    );
  }
);
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @x-console/web typecheck`
Expected: No errors (可能会有一些类型调整)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/blogs/components/directory-tree/
git commit -m "feat(web): integrate @dnd-kit for drag and drop in directory tree

- Add useTreeDragDrop hook for drag end handling
- Add DragOverlay component for visual feedback during drag
- Add DraggableTreeNode with useDraggable and useDroppable
- Support drag blogs into directories to move
- Support drag directories into other directories to reparent

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: 实现右键菜单

**Files:**
- Modify: `apps/web/src/pages/blogs/components/context-menu.tsx` (如果需要增强)
- Modify: `apps/web/src/pages/blogs/components/directory-tree/index.tsx`

- [ ] **Step 1: 在 index.tsx 中集成右键菜单**

在 DirectoryTree 的根容器上添加 ContextMenu 组件，处理 onContextMenuDirectory 和 onContextMenuPage 回调。

```typescript
// 在 DirectoryTree index.tsx 中添加

const [contextMenu, setContextMenu] = useState<{
  visible: boolean;
  x: number;
  y: number;
  type: 'directory' | 'page';
  data: { id: string; name?: string } | null;
}>({ visible: false, x: 0, y: 0, type: 'directory', data: null });

const handleContextMenuDirectory = (e: React.MouseEvent, nodeId: string, nodeName: string) => {
  setContextMenu({
    visible: true,
    x: e.clientX,
    y: e.clientY,
    type: 'directory',
    data: { id: nodeId, name: nodeName },
  });
};

const handleContextMenuPage = (e: React.MouseEvent, blogId: string) => {
  setContextMenu({
    visible: true,
    x: e.clientX,
    y: e.clientY,
    type: 'page',
    data: { id: blogId },
  });
};

// 在 JSX 中添加 ContextMenu 组件
// ...

<ContextMenu
  visible={contextMenu.visible}
  x={contextMenu.x}
  y={contextMenu.y}
  items={getContextMenuItems(contextMenu)}
  onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
/>
```

- [ ] **Step 2: 实现 getContextMenuItems**

```typescript
// 在 index.tsx 中添加

const getContextMenuItems = (menu: typeof contextMenu): ContextMenuItem[] => {
  if (!menu.data) return [];

  if (menu.type === 'directory') {
    return [
      {
        label: '新建博客',
        onClick: () => props.onNewBlog(menu.data!.id),
      },
      {
        label: '新建子目录',
        onClick: () => props.onNewDirectory(menu.data!.id),
      },
      {
        label: '重命名',
        onClick: () => {
          const newName = prompt('请输入新名称：', menu.data!.name);
          if (newName && newName !== menu.data!.name) {
            directoryService.updateDirectory(menu.data!.id, { name: newName });
          }
        },
      },
      {
        label: '删除',
        danger: true,
        onClick: () => {
          if (confirm('确定要删除这个目录吗？目录下的博客不会被删除。')) {
            directoryService.deleteDirectory(menu.data!.id);
          }
        },
      },
    ];
  } else {
    return [
      {
        label: '编辑',
        onClick: () => navigate(`/blogs/${menu.data!.id}/edit`),
      },
      {
        label: '移动到...',
        onClick: () => {
          const dirId = prompt('请输入目标目录ID（留空移到根目录）：');
          blogService.updateBlog(menu.data!.id, { directoryId: dirId || undefined });
        },
      },
      {
        label: '删除',
        danger: true,
        onClick: () => {
          if (confirm('确定要删除这篇博客吗？')) {
            blogService.deleteBlog(menu.data!.id);
          }
        },
      },
    ];
  }
};
```

- [ ] **Step 3: Typecheck 和 Commit**

Run: `pnpm --filter @x-console/web typecheck`
Commit: `feat(web): add right-click context menu to directory tree`

---

## Chunk 4: URL 初始化定位

**Files:**
- Modify: `apps/web/src/pages/blogs/blogs.tsx`
- Modify: `apps/web/src/pages/blogs/components/directory-tree/index.tsx`

- [ ] **Step 1: 修改 blogs.tsx 添加 URL 解析逻辑**

在 blogs.tsx 中，当 URL 是 `/blogs/:blogId` 时，需要：
1. 调用 `blogService.loadBlog(blogId)` 获取博客数据
2. 从博客数据中获取 `directoryId`
3. 展开该目录并设置选中博客

```typescript
// 在 blogs.tsx useEffect 中添加

// Sync URL to state on mount and URL change
useEffect(() => {
  const pathParts = location.pathname.split('/').filter(Boolean);

  if (pathParts[0] === 'blogs' && pathParts.length >= 2) {
    const pageId = pathParts[1];
    const isEditMode = pathParts[2] === 'edit';

    if (selectedPageId !== pageId || contentMode === 'recent') {
      setSelectedPageId(pageId);
      blogService.loadBlog(pageId).then((blog) => {
        setContentMode(isEditMode ? 'edit' : 'preview');
        // Expand the blog's directory if it belongs to one
        if (blog?.directoryId) {
          // Trigger directory tree to expand this directory
          setInitialExpandedIds(new Set([blog.directoryId]));
        }
      });
    }
  } else if (pathParts.length === 1 && pathParts[0] === 'blogs') {
    // Check for ?dir= query param
    const dirId = new URLSearchParams(location.search).get('dir');
    if (dirId) {
      setSelectedDirectoryId(dirId);
      setContentMode('directory');
    } else if (contentMode !== 'recent') {
      setContentMode('recent');
      setSelectedDirectoryId(null);
      setSelectedPageId(null);
    }
  }
}, [location.pathname, location.search]);
```

- [ ] **Step 2: 修改 DirectoryTree 支持初始展开 IDs**

```typescript
// DirectoryTree 添加 initialExpandedIds prop

interface DirectoryTreeProps {
  // ... existing props
  initialExpandedIds?: string[];
}

// 在 useTreeState 调用时
const { expandedIds, setExpandedIds, toggleNode, expandMultiple } = useTreeState(props.initialExpandedIds || []);
```

- [ ] **Step 3: Typecheck 和 Commit**

Run: `pnpm --filter @x-console/web typecheck`
Commit: `feat(web): add URL initialization and directory expansion on refresh`

---

## Chunk 5: 移除旧代码 (react-arborist)

**Files:**
- Delete: `apps/web/src/pages/blogs/components/directory-tree/hooks/use-drop-handler.ts`
- Delete: `apps/web/src/pages/blogs/components/directory-tree/hooks/use-tree-state.ts` (被新的 useTreeState 替代)
- Delete: `apps/web/src/pages/blogs/components/directory-tree/nodes/` 目录
- Delete: `apps/web/src/pages/blogs/components/directory-tree/types.ts` (被新的 types.ts 替代)
- Delete: `apps/web/src/pages/blogs/components/directory-tree/tree-data.ts`
- Modify: `apps/web/package.json` - 移除 react-arborist

- [ ] **Step 1: 移除旧文件**

```bash
rm -rf apps/web/src/pages/blogs/components/directory-tree/hooks/use-drop-handler.ts
rm -rf apps/web/src/pages/blogs/components/directory-tree/hooks/use-tree-state.ts
rm -rf apps/web/src/pages/blogs/components/directory-tree/nodes/
rm -rf apps/web/src/pages/blogs/components/directory-tree/types.ts
rm -rf apps/web/src/pages/blogs/components/directory-tree/tree-data.ts
```

- [ ] **Step 2: 移除 react-arborist 依赖**

Run: `pnpm --filter @x-console/web remove react-arborist`

- [ ] **Step 3: Typecheck 和 Commit**

Run: `pnpm --filter @x-console/web typecheck`
Expected: No errors
Commit: `refactor(web): remove react-arborist, use custom tree implementation`

---

## Verification Checklist

- [ ] 点击目录目录高亮，右侧显示目录预览
- [ ] 点击博客博客高亮，右侧显示博客预览
- [ ] 点击"全部博客"恢复默认状态
- [ ] 展开/收起目录正常工作
- [ ] 拖拽博客到目录移动博客
- [ ] 拖拽博客到根级移动到根目录
- [ ] 拖拽目录到其他目录重新排序
- [ ] 右键目录显示菜单（新建博客、新建子目录、重命名、删除）
- [ ] 右键博客显示菜单（编辑、移动到、删除）
- [ ] 刷新页面定位到正确的目录/博客
- [ ] Hover 目录显示快捷操作按钮
- [ ] 暗色模式样式正常
