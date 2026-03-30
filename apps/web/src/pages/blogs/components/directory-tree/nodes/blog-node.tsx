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
