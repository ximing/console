import { useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { GithubService, type FileTreeNode } from '../github.service';
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Trash2,
  Loader2,
} from 'lucide-react';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: FileTreeNode | null;
}

interface NewItemInput {
  visible: boolean;
  parentPath: string;
  type: 'file' | 'directory';
}

export const FileTree = view(() => {
  const githubService = useService(GithubService);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });
  const [newItemInput, setNewItemInput] = useState<NewItemInput>({
    visible: false,
    parentPath: '',
    type: 'file',
  });
  const [newItemName, setNewItemName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input when new item input becomes visible
  useEffect(() => {
    if (newItemInput.visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [newItemInput.visible]);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = (node: FileTreeNode) => {
    if (node.type === 'tree') {
      toggleDir(node.path);
    } else {
      githubService.openFile(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileTreeNode) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const handleNewFile = () => {
    if (!contextMenu.node) return;
    const parentPath = contextMenu.node.type === 'tree' ? contextMenu.node.path : '';
    setNewItemInput({ visible: true, parentPath, type: 'file' });
    setContextMenu((prev) => ({ ...prev, visible: false }));
    setNewItemName('');
  };

  const handleNewDirectory = () => {
    if (!contextMenu.node) return;
    const parentPath = contextMenu.node.type === 'tree' ? contextMenu.node.path : '';
    setNewItemInput({ visible: true, parentPath, type: 'directory' });
    setContextMenu((prev) => ({ ...prev, visible: false }));
    setNewItemName('');
  };

  const handleDeleteFile = () => {
    if (!contextMenu.node || contextMenu.node.type !== 'blob') return;
    const fileName = contextMenu.node.name;
    if (confirm(`确定要删除文件 "${fileName}" 吗？`)) {
      githubService.deleteFile(contextMenu.node.path);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleCreateItem = () => {
    if (!newItemName.trim()) return;

    const fullPath = newItemInput.parentPath
      ? `${newItemInput.parentPath}/${newItemName.trim()}`
      : newItemName.trim();

    if (newItemInput.type === 'file') {
      githubService.createFile(fullPath);
    } else {
      githubService.createDirectory(fullPath);
    }

    setNewItemInput({ visible: false, parentPath: '', type: 'file' });
    setNewItemName('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateItem();
    } else if (e.key === 'Escape') {
      setNewItemInput({ visible: false, parentPath: '', type: 'file' });
      setNewItemName('');
    }
  };

  const getItemStatus = (path: string): 'modified' | 'new' | 'deleted' | null => {
    const change = githubService.pendingChanges.get(path);
    if (!change) return null;
    if (change.type === 'delete') return 'deleted';
    if (change.type === 'create') return 'new';
    return 'modified';
  };

  const renderNode = (node: FileTreeNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isActive = githubService.activeTabPath === node.path;
    const status = getItemStatus(node.path);

    return (
      <div key={node.path}>
        <div
          className={`
            flex items-center gap-1 px-2 py-1 cursor-pointer rounded
            ${isActive ? 'bg-primary-100 dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-dark-800'}
            ${status === 'deleted' ? 'line-through text-red-500' : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {/* Expand/Collapse Icon */}
          {node.type === 'tree' ? (
            <span className="w-4 h-4 flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </span>
          ) : (
            <span className="w-4 h-4" />
          )}

          {/* Icon */}
          {node.type === 'tree' ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )
          ) : (
            <File className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          )}

          {/* Name */}
          <span className="truncate text-sm">{node.name}</span>

          {/* Status Marker */}
          {status === 'modified' && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-auto">M</span>
          )}
          {status === 'new' && (
            <span className="text-xs text-green-600 dark:text-green-400 ml-auto">+</span>
          )}
          {status === 'deleted' && (
            <span className="text-xs text-red-600 dark:text-red-400 ml-auto">-</span>
          )}
        </div>

        {/* Children */}
        {node.type === 'tree' && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render inline input for new file/directory
  const renderNewItemInput = () => {
    if (!newItemInput.visible) return null;

    return (
      <div
        className="flex items-center gap-1 px-2 py-1"
        style={{ paddingLeft: `${newItemInput.parentPath.split('/').length * 16 + 8}px` }}
      >
        <span className="w-4 h-4" />
        {newItemInput.type === 'directory' ? (
          <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        ) : (
          <File className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={() => {
            if (newItemName.trim()) {
              handleCreateItem();
            } else {
              setNewItemInput({ visible: false, parentPath: '', type: 'file' });
            }
          }}
          placeholder={newItemInput.type === 'file' ? '文件名' : '目录名'}
          className="flex-1 px-2 py-0.5 text-sm border border-primary-500 rounded focus:outline-none"
        />
      </div>
    );
  };

  return (
    <div className="w-64 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm shadow-[2px_0_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
        <span className="text-sm font-medium">文件</span>
        <button
          onClick={() => {
            setNewItemInput({ visible: true, parentPath: '', type: 'file' });
            setNewItemName('');
          }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-dark-800 rounded"
          title="新建文件"
        >
          <FilePlus className="w-4 h-4" />
        </button>
      </div>

      {/* Loading State */}
      {githubService.isLoadingFileTree && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
        </div>
      )}

      {/* Empty State */}
      {!githubService.isLoadingFileTree && githubService.fileTree.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          {githubService.selectedRepo ? '暂无文件' : '请先选择仓库'}
        </div>
      )}

      {/* File Tree */}
      {!githubService.isLoadingFileTree && githubService.fileTree.length > 0 && (
        <div className="py-1">
          {githubService.fileTree.map((node) => renderNode(node))}
          {renderNewItemInput()}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node?.type === 'tree' && (
            <>
              <button
                onClick={handleNewFile}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-dark-800 text-left"
              >
                <FilePlus className="w-4 h-4" />
                新建文件
              </button>
              <button
                onClick={handleNewDirectory}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-dark-800 text-left"
              >
                <FolderPlus className="w-4 h-4" />
                新建目录
              </button>
            </>
          )}
          {contextMenu.node?.type === 'blob' && (
            <button
              onClick={handleDeleteFile}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-dark-800 text-left text-red-500"
            >
              <Trash2 className="w-4 h-4" />
              删除文件
            </button>
          )}
        </div>
      )}
    </div>
  );
});
