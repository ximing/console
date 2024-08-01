import { view } from '@rabjs/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BlogCard } from '../blog-card';
import type { BlogDto } from '@x-console/dto';

interface PageListProps {
  directoryId: string;
  directoryName: string;
  blogs: BlogDto[];
  loading: boolean;
  onBack: () => void;
  onSelectPage: (pageId: string) => void;
}

export const PageList = view((props: PageListProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={props.onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold">{props.directoryName}</h2>
      </div>

      {/* Content */}
      {props.loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : props.blogs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>该目录下暂无博客</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {props.blogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              directoryName={props.directoryName}
              onClick={() => props.onSelectPage(blog.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});