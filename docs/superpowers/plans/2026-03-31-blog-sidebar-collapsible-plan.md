# Blog 侧边栏展开/收起 + 拖动宽度 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collapsible sidebar with drag-to-resize width for blog page.

**Architecture:** Hook-based state management (`useSidebarState`) + wrapper component (`ResizableSidebar`) that handles drag interactions and renders children with resize handle.

**Tech Stack:** React hooks, localStorage, native mouse/touch events.

---

## Chunk 1: useSidebarState Hook

**Files:**
- Create: `apps/web/src/pages/blogs/components/sidebar/hooks/useSidebarState.ts`

### Steps

- [ ] **Step 1: Create useSidebarState.ts with type definitions and constants**

```ts
// apps/web/src/pages/blogs/components/sidebar/hooks/useSidebarState.ts

export interface UseSidebarStateReturn {
  isCollapsed: boolean;
  sidebarWidth: number;
  collapsedWidth: number;
  minWidth: number;
  maxWidth: number;
  toggleCollapse: () => void;
  setWidth: (width: number) => void;
}

const STORAGE_KEY = 'blog-sidebar-state';
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const COLLAPSED_WIDTH = 48;

interface StoredState {
  isCollapsed: boolean;
  sidebarWidth: number;
}

function getDefaultState(): StoredState {
  return {
    isCollapsed: false,
    sidebarWidth: DEFAULT_WIDTH,
  };
}

function readFromStorage(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.isCollapsed !== 'boolean' ||
      typeof parsed.sidebarWidth !== 'number' ||
      parsed.sidebarWidth < MIN_WIDTH ||
      parsed.sidebarWidth > MAX_WIDTH
    ) {
      return getDefaultState();
    }
    return parsed;
  } catch {
    return getDefaultState();
  }
}

function writeToStorage(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently fail on storage errors
  }
}
```

- [ ] **Step 2: Add hook implementation with useState and localStorage sync**

```ts
// ... (append to same file after type definitions)

import { useState, useCallback, useEffect } from 'react';

export function useSidebarState(): UseSidebarStateReturn {
  const initialState = readFromStorage();

  const [isCollapsed, setIsCollapsed] = useState(initialState.isCollapsed);
  const [sidebarWidth, setSidebarWidth] = useState(initialState.sidebarWidth);

  // Persist to localStorage on change
  useEffect(() => {
    writeToStorage({ isCollapsed, sidebarWidth });
  }, [isCollapsed, sidebarWidth]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const setWidth = useCallback((width: number) => {
    setSidebarWidth(width);
  }, []);

  return {
    isCollapsed,
    sidebarWidth,
    collapsedWidth: COLLAPSED_WIDTH,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    toggleCollapse,
    setWidth,
  };
}
```

- [ ] **Step 3: Verify file compiles**

Run: `pnpm typecheck --filter @x-console/web`
Expected: No errors in useSidebarState.ts

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/blogs/components/sidebar/hooks/useSidebarState.ts
git commit -m "feat(blogs): add useSidebarState hook with localStorage persistence"
```

---

## Chunk 2: ResizableSidebar Component

**Files:**
- Create: `apps/web/src/pages/blogs/components/sidebar/resizable-sidebar.tsx`

### Steps

- [ ] **Step 1: Create ResizableSidebar.tsx with interface and drag state**

```tsx
// apps/web/src/pages/blogs/components/sidebar/resizable-sidebar.tsx

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSidebarState } from './hooks/useSidebarState';
import { PanelLeftClose, PanelLeft, Search, Plus } from 'lucide-react';

interface ResizableSidebarProps {
  children: React.ReactNode;
  onSearchClick: () => void;
  onNewBlog: () => void;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  collapsedWidth?: number;
}

export function ResizableSidebar({
  children,
  onSearchClick,
  onNewBlog,
}: ResizableSidebarProps) {
  const {
    isCollapsed,
    sidebarWidth,
    collapsedWidth,
    minWidth,
    maxWidth,
    toggleCollapse,
    setWidth,
  } = useSidebarState();

  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle mouse move during drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = e.clientX - dragStartX.current;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, dragStartWidth.current + delta)
      );
      setWidth(newWidth);
    },
    [isDragging, maxWidth, minWidth, setWidth]
  );

  // Handle touch move during drag
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const delta = touch.clientX - dragStartX.current;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, dragStartWidth.current + delta)
      );
      setWidth(newWidth);
    },
    [isDragging, maxWidth, minWidth, setWidth]
  );

  // Stop dragging
  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopDragging);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', stopDragging);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDragging);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDragging);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleTouchMove, stopDragging]);

  // Start dragging
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dragStartX.current = clientX;
      dragStartWidth.current = sidebarWidth;
    },
    [sidebarWidth]
  );

  // Render collapsed state
  if (isCollapsed) {
    return (
      <div
        className="flex flex-col h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 items-center py-2"
        style={{ width: collapsedWidth }}
      >
        <button
          onClick={toggleCollapse}
          aria-label="展开侧边栏"
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
        >
          <PanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={onSearchClick}
          aria-label="搜索"
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors mt-2"
        >
          <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={onNewBlog}
          aria-label="新建博客"
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors mt-2"
        >
          <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    );
  }

  // Render expanded state with drag handle
  return (
    <div
      ref={sidebarRef}
      className="flex h-full relative"
      style={{ width: sidebarWidth }}
    >
      {/* Sidebar content */}
      <div className="flex-shrink-0 h-full">{children}</div>

      {/* Drag handle */}
      <div
        className={`w-1 cursor ew-resize hover:bg-primary-500/50 active:bg-primary-500 transition-colors ${
          isDragging ? 'bg-primary-500' : ''
        }`}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整侧边栏宽度"
      />

      {/* Collapse button (inside sidebar) */}
      <button
        onClick={toggleCollapse}
        aria-label="收起侧边栏"
        className="absolute top-2 right-2 p-1.5 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
      >
        <PanelLeftClose className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify file compiles**

Run: `pnpm typecheck --filter @x-console/web`
Expected: No errors in ResizableSidebar.tsx

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/sidebar/resizable-sidebar.tsx
git commit -m "feat(blogs): add ResizableSidebar component with drag handle"
```

---

## Chunk 3: Integrate into blogs.tsx

**Files:**
- Modify: `apps/web/src/pages/blogs/blogs.tsx`

### Steps

- [ ] **Step 1: Read current blogs.tsx to understand sidebar usage**

Review the current sidebar integration at lines 251-268 to understand props being passed.

- [ ] **Step 2: Import ResizableSidebar and wrap Sidebar**

Add import at top of file:
```tsx
import { ResizableSidebar } from './components/sidebar/resizable-sidebar';
```

- [ ] **Step 3: Replace Sidebar div wrapper with ResizableSidebar**

Replace lines 251-268:
```tsx
        {/* Left Sidebar */}
        <ResizableSidebar
          onSearchClick={() => setSearchModalVisible(true)}
          onNewBlog={() => handleCreateBlog(selectedDirectoryId)}
        >
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectedBlogId={selectedPageId}
            onSelectBlog={handleSelectPage}
            initialExpandedIds={initialExpandedIds}
            selectedDirectoryId={selectedDirectoryId}
            onSelectDirectory={handleSelectDirectory}
            onSearchClick={() => setSearchModalVisible(true)}
            onNewBlog={(dirId) => handleCreateBlog(dirId ?? selectedDirectoryId)}
            onNewDirectory={(parentId) => handleCreateDirectory(parentId)}
            onContextMenuDirectory={() => {}}
            onContextMenuPage={() => {}}
          />
        </ResizableSidebar>
```

- [ ] **Step 4: Verify file compiles**

Run: `pnpm typecheck --filter @x-console/web`
Expected: No errors in blogs.tsx

- [ ] **Step 5: Test manually in browser**

1. Run `pnpm dev:web`
2. Navigate to /blogs
3. Verify sidebar shows resize handle on right edge
4. Drag handle to resize width
5. Click collapse button to collapse sidebar
6. Click expand button to expand sidebar
7. Verify width and collapse state persist after refresh

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/blogs/blogs.tsx
git commit -m "feat(blogs): integrate ResizableSidebar with collapsible and drag-resize"
```

---

## Verification Checklist

- [ ] Sidebar collapses to 48px showing icons only
- [ ] Sidebar expands on click with restored width
- [ ] Drag handle visible on right edge of expanded sidebar
- [ ] Dragging handle resizes sidebar (200-400px range)
- [ ] Width persists after page refresh
- [ ] Collapse state persists after page refresh
- [ ] Touch events work on mobile/tablet
- [ ] No console errors during drag or collapse
