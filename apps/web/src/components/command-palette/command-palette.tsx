import { useState, useEffect, useRef, useCallback } from 'react';
import { isElectron } from '../../electron/isElectron';

/**
 * CommandPalette component - a modal command palette similar to uTools
 * Triggered by global hotkey (Option+Space on macOS, Alt+Space on Windows/Linux)
 */
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      setInputValue('');
    }
  }, [isOpen]);

  // Listen for global keyboard events
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Listen for command palette toggle from Electron main process
  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    const toggleHandler = () => {
      setIsOpen((prev) => !prev);
      if (!isOpen) {
        setInputValue('');
      }
    };

    window.electronAPI?.onCommandPaletteToggle?.(toggleHandler);

    return () => {
      window.electronAPI?.removeCommandPaletteToggleListener?.(toggleHandler);
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
      setInputValue('');
    }
  };

  // Don't render in browser environment
  if (!isElectron()) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-[600px] max-h-[70vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {/* Search icon */}
          <svg
            className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入命令或搜索..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-lg"
          />
          {/* Keyboard shortcut hint */}
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results area - placeholder for now */}
        <div className="max-h-[50vh] overflow-y-auto">
          {inputValue ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              输入 "{inputValue}" 将通过 AI 路由到对应工具
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              开始输入以搜索工具...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
