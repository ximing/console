import { view } from '@rabjs/react';
import { Clock, FileText, Edit2 } from 'lucide-react';
import type { BlogDto } from '@x-console/dto';
import { formatRelativeTime } from '../../../utils/date';

interface BlogListItemProps {
  blog: BlogDto;
  directoryName?: string;
  onClick?: () => void;
  onEdit?: (blog: BlogDto) => void;
}

export const BlogListItem = view(
  ({ blog, directoryName, onClick, onEdit }: BlogListItemProps) => {
    const handleEditClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(blog);
    };

    const displayTags = blog.tags.slice(0, 3);
    const remainingTagCount = blog.tags.length - 3;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        className="group flex items-start justify-between gap-4 px-4 py-3.5 border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/80 dark:hover:bg-zinc-800/60 cursor-pointer transition-all duration-150"
      >
        {/* Left Section */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-1.5 rounded-lg bg-gray-100/80 dark:bg-zinc-800/40 mt-0.5">
            <FileText className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-50/90 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-150 line-clamp-1 leading-snug">
              {blog.title}
            </h3>
            {/* Excerpt */}
            {blog.excerpt && (
              <p className="text-xs text-gray-500 dark:text-zinc-400/70 line-clamp-1 leading-relaxed">
                {blog.excerpt}
              </p>
            )}
            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-2">
              {directoryName && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-md bg-gray-100/80 dark:bg-zinc-800/50 text-gray-600 dark:text-zinc-400/80">
                  {directoryName}
                </span>
              )}
              <span
                className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full ${
                  blog.status === 'published'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                {blog.status === 'published' ? '已发布' : '草稿'}
              </span>
              {displayTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-md"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {remainingTagCount > 0 && (
                <span className="text-xs text-gray-400 dark:text-zinc-500">
                  +{remainingTagCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(blog.updatedAt)}
          </span>
          {onEdit && (
            <button
              onClick={handleEditClick}
              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-all duration-150 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              aria-label={`编辑 ${blog.title}`}
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
