import { view, useService } from '@rabjs/react';
import { Clock, FileText } from 'lucide-react';
import { BlogService } from '../../../../services/blog.service';
import { DirectoryService } from '../../../../services/directory.service';
import { formatRelativeTime } from '../../../../utils/date';

interface RecentBlogListProps {
  selectedBlogId: string | null;
  onSelectBlog: (blogId: string) => void;
}

export const RecentBlogList = view(
  ({ selectedBlogId, onSelectBlog }: RecentBlogListProps) => {
    const blogService = useService(BlogService);
    const directoryService = useService(DirectoryService);

    const getDirectoryName = (directoryId: string | undefined): string | undefined => {
      if (!directoryId) return undefined;
      const dir = directoryService.directories.find((d) => d.id === directoryId);
      return dir?.name;
    };

    // Only show loading spinner on initial load when no blogs exist yet
    if (blogService.blogs.length === 0 && blogService.loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (blogService.blogs.length === 0) {
      return (
        <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-zinc-500">
          暂无博客
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto py-1">
        {blogService.blogs.map((blog) => {
          const dirName = getDirectoryName(blog.directoryId);
          return (
            <button
              key={blog.id}
              type="button"
              onClick={() => onSelectBlog(blog.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectBlog(blog.id)}
              aria-label={blog.title}
              className={`group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-all duration-150 w-full text-left rounded-none ${
                selectedBlogId === blog.id
                  ? 'bg-green-50/60 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'hover:bg-green-50/80 dark:hover:bg-green-900/20 text-gray-700 dark:text-zinc-300'
              }`}
            >
              <FileText className="w-4 h-4 flex-shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <div className="line-clamp-1 font-medium text-xs">{blog.title}</div>
                <div className="flex items-center gap-2 text-xs opacity-50 mt-0.5">
                  {dirName && (
                    <span className="truncate">{dirName}</span>
                  )}
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(blog.updatedAt)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);
