import { view } from '@rabjs/react';
import { Clock, FileText, Edit2 } from 'lucide-react';
import type { BlogDto } from '@x-console/dto';
import { formatRelativeTime } from '../../../../utils/date';

interface BlogCardProps {
  blog: BlogDto;
  directoryName?: string;
  onClick?: () => void;
  onEdit?: (blog: BlogDto) => void;
}

/**
 * Blog Card Component
 * Displays a single blog post with title, excerpt, directory, tags, status, and update time
 */
export const BlogCard = view(({ blog, directoryName, onClick, onEdit }: BlogCardProps) => {
  // Handle click to view preview
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Handle edit button click
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(blog);
    }
  };

  // Display tags (up to 3, then "+N")
  const displayTags = blog.tags.slice(0, 3);
  const remainingTagCount = blog.tags.length - 3;

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 p-5 hover:border-primary-300/60 dark:hover:border-primary-700/50 hover:shadow-md dark:hover:shadow-md-dark transition-all duration-200 ease-out cursor-pointer h-full"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Title Row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800/60 shrink-0">
          <FileText className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200 line-clamp-1 flex-1 leading-snug">
          {blog.title}
        </h3>
        {/* Edit Button - visible on hover */}
        {onEdit && (
          <button
            onClick={handleEditClick}
            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-all duration-150 focus:opacity-100 focus:outline-none shrink-0"
            title="编辑"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
          </button>
        )}
      </div>

      {/* Excerpt */}
      {blog.excerpt && (
        <p className="text-sm text-gray-600 dark:text-zinc-400/80 mb-4 line-clamp-2 leading-relaxed flex-1">
          {blog.excerpt}
        </p>
      )}
      {!blog.excerpt && <div className="flex-1" />}

      {/* Meta Info Row */}
      <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
        {/* Directory Badge */}
        {directoryName && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-zinc-800/60 text-gray-600 dark:text-zinc-400/80">
            {directoryName}
          </span>
        )}

        {/* Status Badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
            blog.status === 'published'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          {blog.status === 'published' ? '已发布' : '草稿'}
        </span>

        {/* Tags */}
        {displayTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md"
            style={{
              backgroundColor: `${tag.color}15`,
              color: tag.color,
            }}
          >
            {tag.name}
          </span>
        ))}
        {remainingTagCount > 0 && (
          <span className="text-xs text-gray-400 dark:text-zinc-500">+{remainingTagCount}</span>
        )}

        {/* Updated Time */}
        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 ml-auto">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(blog.updatedAt)}
        </span>
      </div>
    </div>
  );
});
