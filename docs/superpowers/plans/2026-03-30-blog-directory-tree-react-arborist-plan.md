# Blog Directory Tree react-arborist Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom recursive directory tree with react-arborist, enabling drag-drop for both directories (reparent) and blogs (move between directories).

**Architecture:** Use react-arborist's `Tree` component with custom `NodeRenderer` components for directories and blogs. Transform existing service data (DirectoryService.buildTree() + BlogService.blogs) into react-arborist's expected data format. On drop, call existing service methods (updateDirectory with parentId, moveBlog with directoryId).

**Tech Stack:** react-arborist v3, @rabjs/react (view/HOC pattern), lucide-react icons

---

## Chunk 1: Setup - Install react-arborist and Create Type Definitions

### Task 1: Add react-arborist dependency

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add react-arborist to dependencies**

Run: `cd apps/web && pnpm add react-arborist`

Expected: react-arborist added to node_modules and package.json updated

- [ ] **Step 2: Verify installation**

Run: `grep "react-arborist" apps/web/package.json`
Expected: `"react-arborist": "^3.x.x"` in dependencies

### Task 2: Create type definitions

**Files:**
- Create: `apps/web/src/pages/blogs/components/directory-tree/types.ts`

- [ ] **Step 1: Write type definitions**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/package.json apps/web/src/pages/blogs/components/directory-tree/types.ts
git commit -m "feat(web): add react-arborist and type definitions for directory tree"
```

---

## Chunk 2: Tree Data Transformation

### Task 3: Create tree data transformation module

**Files:**
- Create: `apps/web/src/pages/blogs/components/directory-tree/tree-data.ts`

- [ ] **Step 1: Write tree data transformation functions**

```typescript
import type { DirectoryTreeNode } from '../../../../services/directory.service';
import type { BlogDto } from '@x-console/dto';
import type { TreeNodeData, DirectoryTreeNodeData, BlogTreeNodeData } from './types';

/**
 * Transform DirectoryTreeNode to DirectoryTreeNodeData for react-arborist
 */
function transformDirectory(
  node: DirectoryTreeNode,
  blogsByDirectory: Map<string, BlogDto[]>
): DirectoryTreeNodeData {
  const children: TreeNodeData[] = [];

  // Add child directories
  for (const child of node.children) {
    children.push(transformDirectory(child, blogsByDirectory));
  }

  // Add blogs belonging to this directory
  const dirBlogs = blogsByDirectory.get(node.id) || [];
  for (const blog of dirBlogs) {
    children.push(transformBlog(blog));
  }

  return {
    id: node.id,
    type: 'directory',
    name: node.name,
    children,
  };
}

/**
 * Transform BlogDto to BlogTreeNodeData
 */
function transformBlog(blog: BlogDto): BlogTreeNodeData {
  return {
    id: blog.id,
    type: 'blog',
    title: blog.title,
    directoryId: blog.directoryId,
  };
}

/**
 * Build unified tree data from directories and blogs for react-arborist
 */
export function buildTreeData(
  directoryTree: DirectoryTreeNode[],
  blogs: BlogDto[]
): TreeNodeData[] {
  // Group blogs by directoryId
  const blogsByDirectory = new Map<string, BlogDto[]>();
  for (const blog of blogs) {
    if (blog.directoryId) {
      const existing = blogsByDirectory.get(blog.directoryId) || [];
      existing.push(blog);
      blogsByDirectory.set(blog.directoryId, existing);
    }
  }

  // Transform directory tree with nested blogs
  const result: TreeNodeData[] = [];
  for (const node of directoryTree) {
    result.push(transformDirectory(node, blogsByDirectory));
  }

  return result;
}

/**
 * Get root-level blogs (blogs without directoryId)
 */
export function getRootBlogs(blogs: BlogDto[]): BlogTreeNodeData[] {
  return blogs
    .filter((b) => !b.directoryId)
    .map((b) => transformBlog(b));
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/components/directory-tree/tree-data.ts
git commit -m "feat(web): add tree data transformation for react-arborist"
```

---

## Chunk 3: Custom Node Renderers

### Task 4: Create directory node renderer

**Files:**
- Create: `apps/web/src/pages/blogs/components/directory-tree/nodes/directory-node.tsx`

- [ ] **Step 1: Write directory node renderer**

```typescript
import { forwardRef } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, FolderPlus } from 'lucide-react';
import type { DirectoryNodeRendererProps } from '../types';

interface Props extends DirectoryNodeRendererProps {
  onHover: (isHovered: boolean) => void;
  onNewBlog: (directoryId: string) => void;
  onNewDirectory: (parentId: string) => void;
}

export const DirectoryNode = forwardRef<HTMLDivElement, Props>(
  ({ node, style, onHover, onNewBlog, onNewDirectory }, ref) => {
    const { data, isOpen, isSelected, isDropTarget } = node;
    const hasChildren = data.children && data.children.length > 0;

    return (
      <div
        ref={ref}
        style={style}
        className={`
          group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
          ${isSelected ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
          ${isDropTarget ? 'bg-green-100 dark:bg-green-900/30' : ''}
        `}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        {/* Expand/Collapse Icon */}
        <span className="w-4 h-4 flex-shrink-0">
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </span>

        {/* Folder Icon */}
        {isOpen && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        )}

        {/* Name */}
        <span className="truncate text-sm flex-1">{data.name}</span>

        {/* Hover Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewBlog(data.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
            title="在当前目录创建博客"
          >
            <Plus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewDirectory(data.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded"
            title="在当前目录下创建子目录"
          >
            <FolderPlus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
    );
  }
);

DirectoryNode.displayName = 'DirectoryNode';
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/components/directory-tree/nodes/directory-node.tsx
git commit -m "feat(web): add directory node renderer for react-arborist"
```

### Task 5: Create blog node renderer

**Files:**
- Create: `apps/web/src/pages/blogs/components/directory-tree/nodes/blog-node.tsx`

- [ ] **Step 1: Write blog node renderer**

```typescript
import { forwardRef } from 'react';
import { FileText } from 'lucide-react';
import type { BlogNodeRendererProps } from '../types';

interface Props extends BlogNodeRendererProps {}

export const BlogNode = forwardRef<HTMLDivElement, Props>(({ node, style }, ref) => {
  const { data, isSelected } = node;

  return (
    <div
      ref={ref}
      style={style}
      className={`
        flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
        ${isSelected ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
      `}
    >
      <span className="w-4 h-4" />
      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <span className="truncate text-sm">{data.title}</span>
    </div>
  );
});

BlogNode.displayName = 'BlogNode';
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/components/directory-tree/nodes/blog-node.tsx
git commit -m "feat(web): add blog node renderer for react-arborist"
```

---

## Chunk 4: Hooks

### Task 6: Create use-drop-handler hook

**Files:**
- Create: `apps/web/src/pages/blogs/components/directory-tree/hooks/use-drop-handler.ts`

- [ ] **Step 1: Write drop handler hook**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/components/directory-tree/hooks/use-drop-handler.ts
git commit -m "feat(web): add drop handler hook for directory tree"
```

### Task 7: Create use-tree-state hook

**Files:**
- Create: `apps/web/src/pages/blogs/components/directory-tree/hooks/use-tree-state.ts`

- [ ] **Step 1: Write tree state hook**

```typescript
import { useState, useMemo, useCallback } from 'react';
import type { TreeNodeData } from '../types';

export function useTreeState(initialOpenIds: string[] = []) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(initialOpenIds));
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const toggleNode = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const openNode = useCallback((id: string) => {
    setOpenIds((prev) => new Set(prev).add(id));
  }, []);

  const closeNode = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const openIdsArray = useMemo(() => Array.from(openIds), [openIds]);

  return {
    openIds,
    openIdsArray,
    setOpenIds,
    toggleNode,
    openNode,
    closeNode,
    hoveredNodeId,
    setHoveredNodeId,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/components/directory-tree/hooks/use-tree-state.ts
git commit -m "feat(web): add tree state hook for directory tree"
```

---

## Chunk 5: Main Component

### Task 8: Create main DirectoryTree component

**Files:**
- Create: `apps/web/src/pages/blogs/components/directory-tree/index.tsx`

- [ ] **Step 1: Write main DirectoryTree component**

```typescript
import { useState, useMemo, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { Tree } from 'react-arborist';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogService } from '../../../../services/blog.service';
import type { DirectoryTreeNode } from '../../../../services/directory.service';
import type { BlogDto } from '@x-console/dto';
import type { TreeNodeData } from './types';
import { buildTreeData, getRootBlogs } from './tree-data';
import { DirectoryNode } from './nodes/directory-node';
import { BlogNode } from './nodes/blog-node';
import { useDropHandler } from './hooks/use-drop-handler';
import { useTreeState } from './hooks/use-tree-state';
import { Loader2 } from 'lucide-react';

interface DirectoryTreeProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onContextMenuDirectory: (e: React.MouseEvent, node: DirectoryTreeNode) => void;
  onContextMenuPage: (e: React.MouseEvent, blog: BlogDto) => void;
  onExpandDirectory?: (directoryId: string) => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
}

function NodeRenderer({
  node,
  style,
  dragHandle,
}: {
  node: any;
  style: React.CSSProperties;
  dragHandle: any;
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (node.data.type === 'directory') {
    return (
      <DirectoryNode
        node={node}
        style={style}
        dragHandle={dragHandle}
        onHover={setIsHovered}
        onNewBlog={() => {}}
        onNewDirectory={() => {}}
      />
    );
  }

  return <BlogNode node={node} style={style} dragHandle={dragHandle} />;
}

export const DirectoryTree = view(
  ({
    selectedDirectoryId,
    selectedPageId,
    onSelectDirectory,
    onSelectPage,
    onContextMenuDirectory,
    onContextMenuPage,
    onExpandDirectory,
    onNewBlog,
    onNewDirectory,
  }: DirectoryTreeProps) => {
    const directoryService = useService(DirectoryService);
    const blogService = useService(BlogService);
    const { handleDrop } = useDropHandler();
    const { openIds, openIdsArray, setOpenIds, setHoveredNodeId } = useTreeState();

    // Build tree data from services
    const treeData = useMemo(() => {
      const dirTree = directoryService.buildTree();
      const blogs = blogService.blogs;
      return buildTreeData(dirTree, blogs);
    }, [directoryService.buildTree, blogService.blogs]);

    // Root-level blogs (outside any directory)
    const rootBlogs = useMemo(() => {
      return getRootBlogs(blogService.blogs);
    }, [blogService.blogs]);

    const handleDropCallback = useCallback(
      (params: any) => {
        handleDrop(params, treeData);
      },
      [handleDrop, treeData]
    );

    const handleNodeClick = useCallback(
      (node: any) => {
        if (node.data.type === 'directory') {
          onSelectDirectory(node.data.id);
        } else {
          onSelectPage(node.data.id);
        }
      },
      [onSelectDirectory, onSelectPage]
    );

    const handleNodeContextMenu = useCallback(
      (e: React.MouseEvent, node: any) => {
        e.preventDefault();
        if (node.data.type === 'directory') {
          // Need to find the original DirectoryTreeNode
          const findDir = (nodes: DirectoryTreeNode[], id: string): DirectoryTreeNode | null => {
            for (const n of nodes) {
              if (n.id === id) return n;
              const found = findDir(n.children, id);
              if (found) return found;
            }
            return null;
          };
          const allDirs = directoryService.buildTree();
          const dirNode = findDir(allDirs, node.data.id);
          if (dirNode) {
            onContextMenuDirectory(e, dirNode);
          }
        } else {
          const blog = blogService.blogs.find((b) => b.id === node.data.id);
          if (blog) {
            onContextMenuPage(e, blog);
          }
        }
      },
      [directoryService, blogService, onContextMenuDirectory, onContextMenuPage]
    );

    if (directoryService.loading) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
        </div>
      );
    }

    return (
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
            {rootBlogs.map((blog) => (
              <div
                key={blog.id}
                className={`
                  flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-2
                  ${selectedPageId === blog.id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
                `}
                style={{ paddingLeft: '24px' }}
                onClick={() => onSelectPage(blog.id)}
                onContextMenu={(e) => handleNodeContextMenu(e, { data: blog })}
              >
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="truncate text-sm">{blog.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Directory Tree */}
        {treeData.length > 0 ? (
          <Tree
            data={treeData}
            openIds={openIdsArray}
            onOpenChange={setOpenIds}
            onDrop={handleDropCallback}
            draggable
            enableFatFingers
            width="100%"
          >
            {NodeRenderer}
          </Tree>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            暂无目录
          </div>
        )}
      </div>
    );
  }
);

// Need to import FileText for the root blogs section
import { Folder } from 'lucide-react';
import { FileText } from 'lucide-react';
```

Note: The import of `FileText` and `Folder` at the bottom is a workaround - in actual implementation, put them at the top of the file.

- [ ] **Step 2: Fix imports at top of file** (move the lucide imports to the top)

```typescript
import { useState, useMemo, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { Tree } from 'react-arborist';
import { Folder, FolderOpen, FileText, Plus, FolderPlus, Loader2 } from 'lucide-react';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogService } from '../../../../services/blog.service';
import type { DirectoryTreeNode } from '../../../../services/directory.service';
import type { BlogDto } from '@x-console/dto';
import type { TreeNodeData } from './types';
import { buildTreeData, getRootBlogs } from './tree-data';
import { DirectoryNode } from './nodes/directory-node';
import { BlogNode } from './nodes/blog-node';
import { useDropHandler } from './hooks/use-drop-handler';
import { useTreeState } from './hooks/use-tree-state';
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/directory-tree/index.tsx
git commit -m "feat(web): add main DirectoryTree component with react-arborist"
```

---

## Chunk 6: Integration

### Task 9: Update existing directory-tree.tsx to use new component

**Files:**
- Modify: `apps/web/src/pages/blogs/components/directory-tree.tsx`

- [ ] **Step 1: Replace file content to re-export from new component**

```typescript
// Re-export the new DirectoryTree component
export { DirectoryTree } from './components/directory-tree';
```

Or alternatively, if keeping the same interface is preferred, modify to import and re-export.

- [ ] **Step 2: Verify the re-export works**

Run: `pnpm typecheck --filter @x-console/web 2>&1 | head -50`

Expected: No errors related to directory-tree

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/directory-tree.tsx
git commit -m "refactor(web): redirect directory-tree.tsx to new component"
```

### Task 10: Update props interface to match existing Sidebar expectations

The existing `Sidebar` passes `onExpandDirectory` and `onNewBlog`/`onNewDirectory` callbacks. Need to verify the new component correctly wires these up.

- [ ] **Step 1: Check Sidebar component props**

Run: `grep -A 20 "interface DirectoryTreeProps" apps/web/src/pages/blogs/components/sidebar/index.tsx`

Expected: Should see all props that Sidebar passes to DirectoryTree

- [ ] **Step 2: Ensure all props are wired in new component**

Check that `onNewBlog` and `onNewDirectory` are properly passed to the hover action buttons in DirectoryNode

- [ ] **Step 3: Commit any fixes**

```bash
git add apps/web/src/pages/blogs/components/directory-tree/nodes/directory-node.tsx
git commit -m "fix(web): wire up onNewBlog and onNewDirectory in DirectoryNode"
```

---

## Chunk 7: Verification

### Task 11: Run typecheck and lint

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck --filter @x-console/web 2>&1 | head -100`

Expected: No TypeScript errors

- [ ] **Step 2: Run lint**

Run: `pnpm lint --filter @x-console/web 2>&1 | head -100`

Expected: No ESLint errors (or only pre-existing ones)

- [ ] **Step 3: Run dev server to verify**

Run: `pnpm dev:web 2>&1 | head -50`

Expected: Dev server starts without errors

### Task 12: Manual testing checklist

- [ ] **Test: Directory reparenting**

1. Create two directories (A and B)
2. Drag A onto B
3. Verify A becomes a child of B in the tree
4. Verify API call: `PUT /api/v1/blogs/directories/:id` with `parentId: B.id`

- [ ] **Test: Blog moving**

1. Create a blog in root
2. Create a directory
3. Drag blog onto directory
4. Verify blog becomes a child of that directory in the tree
5. Verify API call: `PUT /api/v1/blogs/:id` with `directoryId: directory.id`

- [ ] **Test: Blog to root**

1. Move a blog to a directory
2. Drag it out to root area
3. Verify `directoryId` becomes `null`

- [ ] **Test: Invalid directory drop (self)**

1. Try to drag a directory onto itself
2. Verify nothing happens (validation prevents API call)

- [ ] **Test: Invalid directory drop (descendant)**

1. Create parent P with child C
2. Try to drag P onto C
3. Verify nothing happens (cycle detection prevents API call)

- [ ] **Test: Context menu still works**

1. Right-click on directory → context menu appears
2. Right-click on blog → context menu appears

- [ ] **Test: Hover buttons still work**

1. Hover over directory → + and folder+ buttons appear
2. Click + → new blog dialog/creation
3. Click folder+ → new directory dialog/creation

---

## Files Summary

| File | Action |
|------|--------|
| `package.json` | Modify: add react-arborist |
| `directory-tree/types.ts` | Create |
| `directory-tree/tree-data.ts` | Create |
| `directory-tree/nodes/directory-node.tsx` | Create |
| `directory-tree/nodes/blog-node.tsx` | Create |
| `directory-tree/hooks/use-drop-handler.ts` | Create |
| `directory-tree/hooks/use-tree-state.ts` | Create |
| `directory-tree/index.tsx` | Create |
| `directory-tree.tsx` | Modify: re-export from new component |
