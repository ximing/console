import { useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { DirectoryService, type DirectoryTreeNode } from '../../../services/directory.service';
import { ToastService } from '../../../services/toast.service';

interface DirectoryTreeProps {
  selectedDirectoryId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: DirectoryTreeNode | null;
}

interface NewDirectoryInput {
  visible: boolean;
  parentId: string | null;
  name: string;
}

/**
 * Directory Tree Component
 * Displays hierarchical directory structure with expand/collapse and context menu
 */
export const DirectoryTree = view(
  ({ selectedDirectoryId, onSelectDirectory }: DirectoryTreeProps) => {
    const directoryService = useService(DirectoryService);
    const toastService = useService(ToastService);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
      visible: false,
      x: 0,
      y: 0,
      node: null,
    });
    const [newDirectoryInput, setNewDirectoryInput] = useState<NewDirectoryInput>({
      visible: false,
      parentId: null,
      name: '',
    });

    // Build tree from flat directory list
    const tree = directoryService.buildTree();

    // Close context menu on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
          setContextMenu((prev) => ({ ...prev, visible: false }));
        }
      };

      if (contextMenu.visible) {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
      }
    }, [contextMenu.visible]);

    // Focus input when new directory input becomes visible
    useEffect(() => {
      if (newDirectoryInput.visible && inputRef.current) {
        inputRef.current.focus();
      }
    }, [newDirectoryInput.visible]);

    // Toggle directory expand/collapse
    const toggleDir = (dirId: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(dirId)) {
          next.delete(dirId);
        } else {
          next.add(dirId);
        }
        return next;
      });
    };

    // Handle directory click - toggle expand if has children, otherwise select
    const handleDirectoryClick = (dir: DirectoryTreeNode) => {
      if (dir.children.length > 0) {
        toggleDir(dir.id);
      }
      onSelectDirectory(dir.id);
    };

    // Handle right-click context menu
    const handleContextMenu = (e: React.MouseEvent, node: DirectoryTreeNode) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        node,
      });
    };

    // Show new directory input
    const handleNewDirectory = (parentId: string | null = null) => {
      setNewDirectoryInput({ visible: true, parentId, name: '' });
      setContextMenu((prev) => ({ ...prev, visible: false }));
    };

    // Create new directory
    const handleCreateDirectory = async () => {
      const name = newDirectoryInput.name.trim();
      if (!name) return;

      try {
        const result = await directoryService.createDirectory({
          name,
          parentId: newDirectoryInput.parentId || undefined,
        });

        if (result) {
          toastService.success('目录创建成功');
          // Expand parent if creating child directory
          if (newDirectoryInput.parentId) {
            setExpandedDirs((prev) => new Set([...prev, newDirectoryInput.parentId!]));
          }
        }
      } finally {
        setNewDirectoryInput({ visible: false, parentId: null, name: '' });
      }
    };

    // Delete directory
    const handleDeleteDirectory = async () => {
      if (!contextMenu.node) return;

      const dirName = contextMenu.node.name;
      if (!confirm(`确定要删除目录 "${dirName}" 吗？`)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
        return;
      }

      const success = await directoryService.deleteDirectory(contextMenu.node.id);
      if (success) {
        toastService.success('目录已删除');
        if (selectedDirectoryId === contextMenu.node.id) {
          onSelectDirectory(null);
        }
      }

      setContextMenu((prev) => ({ ...prev, visible: false }));
    };

    // Render directory node recursively
    const renderNode = (node: DirectoryTreeNode, depth: number = 0): React.ReactNode => {
      const isExpanded = expandedDirs.has(node.id);
      const isActive = selectedDirectoryId === node.id;
      const hasChildren = node.children.length > 0;

      return (
        <div key={node.id}>
          <div
            className={`
              flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded
              ${isActive ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
            `}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => handleDirectoryClick(node)}
            onContextMenu={(e) => handleContextMenu(e, node)}
          >
            {/* Expand/Collapse Icon */}
            <span className="w-4 h-4 flex-shrink-0">
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )
              ) : (
                <span className="w-4 h-4" />
              )}
            </span>

            {/* Folder Icon */}
            {isExpanded && hasChildren ? (
              <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )}

            {/* Name */}
            <span className="truncate text-sm">{node.name}</span>
          </div>

          {/* Children */}
          {hasChildren && isExpanded && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="flex flex-col h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700">
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-dark-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">目录</span>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-auto py-1">
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

          {/* Directory Tree */}
          {directoryService.loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
            </div>
          ) : tree.length > 0 ? (
            <div>{tree.map((node) => renderNode(node))}</div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              暂无目录
            </div>
          )}

          {/* New Directory Input */}
          {newDirectoryInput.visible && (
            <div className="flex items-center gap-1 px-2 py-1.5 mx-2">
              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={newDirectoryInput.name}
                onChange={(e) =>
                  setNewDirectoryInput((prev) => ({ ...prev, name: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateDirectory();
                  } else if (e.key === 'Escape') {
                    setNewDirectoryInput({ visible: false, parentId: null, name: '' });
                  }
                }}
                onBlur={() => {
                  if (newDirectoryInput.name.trim()) {
                    handleCreateDirectory();
                  } else {
                    setNewDirectoryInput({ visible: false, parentId: null, name: '' });
                  }
                }}
                placeholder="目录名称"
                className="flex-1 px-2 py-0.5 text-sm border border-primary-500 rounded focus:outline-none bg-white dark:bg-dark-700"
              />
            </div>
          )}
        </div>

        {/* Footer - New Directory Button */}
        <div className="px-2 py-2 border-t border-gray-200 dark:border-dark-700">
          <button
            onClick={() => handleNewDirectory(null)}
            disabled={newDirectoryInput.visible}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            新建目录
          </button>
        </div>

        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                handleNewDirectory(contextMenu.node?.id || null);
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-dark-800 text-left text-gray-700 dark:text-gray-300"
            >
              <Plus className="w-4 h-4" />
              新建子目录
            </button>
            <button
              onClick={handleDeleteDirectory}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-dark-800 text-left text-red-500"
            >
              <Trash2 className="w-4 h-4" />
              删除目录
            </button>
          </div>
        )}
      </div>
    );
  }
);
