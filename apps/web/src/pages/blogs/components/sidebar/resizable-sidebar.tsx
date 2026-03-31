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
