import { view } from '@rabjs/react';
import { useNavigate } from 'react-router';
import { Clock, FileText } from 'lucide-react';
import type { BlogDto } from '@x-console/dto';

interface BlogCardProps {
  blog: BlogDto;
  directoryName?: string;
}

/**
 * Format relative time (e.g., "2小时前", "3天前")
 */
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

/**
 * Blog Card Component
 * Displays a single blog post with title, excerpt, directory, tags, status, and update time
 */
export const BlogCard = view(({ blog, directoryName }: BlogCardProps) => {
  const navigate = useNavigate();

  // Handle click to navigate to editor
  const handleClick = () => {
    navigate(`/blogs/${blog.id}/editor`);
  };

  // Display tags (up to 3, then "+N")
  const displayTags = blog.tags.slice(0, 3);
  const remainingTagCount = blog.tags.length - 3;

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-4 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all cursor-pointer"
    >
      {/* Title */}
      <div className="flex items-start gap-2 mb-2">
        <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-1">
          {blog.title}
        </h3>
      </div>

      {/* Excerpt */}
      {blog.excerpt && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 ml-7">
          {blog.excerpt}
        </p>
      )}

      {/* Meta Info Row */}
      <div className="flex flex-wrap items-center gap-2 ml-7">
        {/* Directory Badge */}
        {directoryName && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400">
            {directoryName}
          </span>
        )}

        {/* Status Badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
            blog.status === 'published'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
          }`}
        >
          {blog.status === 'published' ? '已发布' : '草稿'}
        </span>

        {/* Tags */}
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
          <span className="text-xs text-gray-500 dark:text-gray-400">+{remainingTagCount}</span>
        )}

        {/* Updated Time */}
        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ml-auto">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(blog.updatedAt)}
        </span>
      </div>
    </div>
  );
});
