import { view, useService } from '@rabjs/react';
import { FileText, Loader2, LayoutGrid } from 'lucide-react';
import { BlogService } from '../../../../services/blog.service';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogCard } from '../blog-card';
import { ViewToggle, type ViewMode } from '../view-toggle';
import { BlogListItem } from '../blog-list-item';
import type { BlogDto } from '@x-console/dto';

interface RecentListProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectPage: (pageId: string) => void;
  onEditPage?: (blog: BlogDto) => void;
}

export const RecentList = view((props: RecentListProps) => {
  const { onSelectPage, onEditPage } = props;
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);

  const getDirectoryName = (directoryId: string | undefined): string | undefined => {
    if (!directoryId) return undefined;
    const dir = directoryService.directories.find((d) => d.id === directoryId);
    return dir?.name;
  };

  return (
    <div className="flex flex-col h-full px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">最近博客</h2>
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-dark-700">
            {blogService.blogs.length === 1 ? '1 篇' : `${blogService.blogs.length} 篇`}
          </span>
        </div>
        <ViewToggle value={props.viewMode} onChange={props.onViewModeChange} />
      </div>

      {/* Content */}
      {blogService.loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : blogService.blogs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无博客</p>
        </div>
      ) : props.viewMode === 'list' ? (
        <div className="flex-1 overflow-auto -mx-6 -mb-4">
          {blogService.blogs.map((blog) => (
            <BlogListItem
              key={blog.id}
              blog={blog}
              directoryName={getDirectoryName(blog.directoryId)}
              onClick={() => props.onSelectPage(blog.id)}
              onEdit={props.onEditPage}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blogService.blogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              directoryName={getDirectoryName(blog.directoryId)}
              onClick={() => props.onSelectPage(blog.id)}
              onEdit={props.onEditPage}
            />
          ))}
        </div>
      )}
    </div>
  );
});
