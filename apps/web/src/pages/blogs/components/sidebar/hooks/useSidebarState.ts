import { useState, useCallback, useEffect } from 'react';

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
  isCollapsed?: unknown;
  sidebarWidth?: unknown;
}

function readFromStorage(): { isCollapsed: boolean; sidebarWidth: number } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { isCollapsed: false, sidebarWidth: DEFAULT_WIDTH };
    }

    const parsed = JSON.parse(stored) as StoredState;

    // Validate isCollapsed - must be boolean
    const isCollapsed = typeof parsed.isCollapsed === 'boolean' ? parsed.isCollapsed : false;

    // Validate sidebarWidth - must be number between MIN_WIDTH and MAX_WIDTH
    const sidebarWidth =
      typeof parsed.sidebarWidth === 'number' &&
      parsed.sidebarWidth >= MIN_WIDTH &&
      parsed.sidebarWidth <= MAX_WIDTH
        ? parsed.sidebarWidth
        : DEFAULT_WIDTH;

    return { isCollapsed, sidebarWidth };
  } catch {
    // Silently fail on any error and return defaults
    return { isCollapsed: false, sidebarWidth: DEFAULT_WIDTH };
  }
}

function writeToStorage(state: { isCollapsed: boolean; sidebarWidth: number }): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently fail on write errors
  }
}

export function useSidebarState(): UseSidebarStateReturn {
  const initialState = readFromStorage();
  const [isCollapsed, setIsCollapsed] = useState(initialState.isCollapsed);
  const [sidebarWidth, setSidebarWidthState] = useState(initialState.sidebarWidth);

  // Persist changes to localStorage
  useEffect(() => {
    writeToStorage({ isCollapsed, sidebarWidth });
  }, [isCollapsed, sidebarWidth]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const setWidth = useCallback((width: number) => {
    const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
    setSidebarWidthState(clampedWidth);
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
