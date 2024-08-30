import { view } from '@rabjs/react';
import { Clock, FileText, Edit2 } from 'lucide-react';
import type { BlogDto } from '@x-console/dto';

interface BlogListItemProps {
  blog: BlogDto;
  directoryName?: string;
  onClick?: () => void;
  onEdit?: (blog: BlogDto) => void;
}

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

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
        className="flex items-start justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer group transition-colors"
      >
        {/* Left Section */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-base font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-1">
              {blog.title}
            </h3>
            {/* Excerpt */}
            {blog.excerpt && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {blog.excerpt}
              </p>
            )}
            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-2">
              {directoryName && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400">
                  {directoryName}
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                  blog.status === 'published'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                }`}
              >
                {blog.status === 'published' ? '已发布' : '草稿'}
              </span>
              {displayTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {remainingTagCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{remainingTagCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(blog.updatedAt)}
          </span>
          {onEdit && (
            <button
              onClick={handleEditClick}
              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-all"
              aria-label={`编辑 ${blog.title}`}
            >
              <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
