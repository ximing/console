import { useEffect, useRef } from 'react';
import { view } from '@rabjs/react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu = view(({ visible, x, y, items, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 40 - 20);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg py-1 min-w-[140px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors ${
            item.danger
              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
          }`}
        >
          {item.icon && <span className="w-4 h-4">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
});
