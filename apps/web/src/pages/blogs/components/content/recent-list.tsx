import { view, useService } from '@rabjs/react';
import { FileText, Loader2 } from 'lucide-react';
import { BlogService } from '../../../../services/blog.service';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogCard } from '../blog-card';
import type { BlogDto } from '@x-console/dto';

interface RecentListProps {
  onSelectPage: (pageId: string) => void;
  onEditPage?: (blog: BlogDto) => void;
}

export const RecentList = view(({ onSelectPage, onEditPage }: RecentListProps) => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);

  const getDirectoryName = (directoryId: string | undefined): string | undefined => {
    if (!directoryId) return undefined;
    const dir = directoryService.directories.find((d) => d.id === directoryId);
    return dir?.name;
  };

  if (blogService.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (blogService.blogs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>暂无博客</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {blogService.blogs.map((blog) => (
        <BlogCard
          key={blog.id}
          blog={blog}
          directoryName={getDirectoryName(blog.directoryId)}
          onClick={() => onSelectPage(blog.id)}
          onEdit={onEditPage}
        />
      ))}
    </div>
  );
});
