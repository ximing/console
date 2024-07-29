import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { useNavigate } from 'react-router';
import { Plus, Loader2, FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Layout } from '../../components/layout';
import { BlogService } from '../../services/blog.service';
import { DirectoryService } from '../../services/directory.service';
import { TagService } from '../../services/tag.service';
import { ToastService } from '../../services/toast.service';
import { DirectoryTree } from './components/directory-tree';
import { TagFilter } from './components/tag-filter';
import { BlogCard } from './components/blog-card';

type StatusFilter = 'all' | 'published' | 'draft';

/**
 * Blog List Page
 * Displays blog posts with directory tree, tag filter, and status tabs
 */
export const BlogListPage = view(() => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const tagService = useService(TagService);
  const toastService = useService(ToastService);
  const navigate = useNavigate();

  // Local state
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  useEffect(() => {
    directoryService.loadDirectories();
    tagService.loadTags();
    blogService.loadBlogs({
      directoryId: selectedDirectoryId || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      tagId: selectedTagId || undefined,
      search: searchQuery || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload blogs when filters change
  useEffect(() => {
    blogService.loadBlogs({
      directoryId: selectedDirectoryId || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      tagId: selectedTagId || undefined,
      search: searchQuery || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDirectoryId, statusFilter, selectedTagId, searchQuery]);

  // Create new blog
  const handleCreateBlog = async () => {
    setIsCreating(true);
    try {
      const blog = await blogService.createBlog({
        title: '未命名博客',
        excerpt: '',
      });

      if (blog) {
        toastService.success('博客创建成功');
        navigate(`/blogs/${blog.id}/editor`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Get directory name by ID
  const getDirectoryName = (directoryId: string | undefined): string | undefined => {
    if (!directoryId) return undefined;
    const dir = directoryService.directories.find((d) => d.id === directoryId);
    return dir?.name;
  };

  // Use server-filtered blogs directly (tagId and search are now passed to loadBlogs)
  const filteredBlogs = blogService.blogs;

  return (
    <Layout>
      <div className="flex h-full">
        {/* Left Sidebar - Directory Tree */}
        <div className="w-[240px] flex-shrink-0">
          <DirectoryTree
            selectedDirectoryId={selectedDirectoryId}
            onSelectDirectory={setSelectedDirectoryId}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-dark-900">
          {/* Header with Tag Filter */}
          <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-4 py-3">
            {/* Tag Filter */}
            <div className="mb-3">
              <TagFilter
                tags={tagService.tags}
                selectedTagId={selectedTagId}
                onSelectTag={setSelectedTagId}
              />
            </div>

            {/* Status Tabs and Create Button */}
            <div className="flex items-center justify-between gap-4">
              {/* Status Tabs */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setStatusFilter('published')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === 'published'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  已发布
                </button>
                <button
                  onClick={() => setStatusFilter('draft')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === 'draft'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  草稿
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索博客..."
                  className="pl-9 pr-4 py-1.5 w-48 text-sm bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white dark:placeholder:text-gray-400"
                />
              </div>

              {/* Create Blog Button */}
              <button
                onClick={handleCreateBlog}
                disabled={isCreating}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                新建博客
              </button>
            </div>
          </div>

          {/* Blog Cards List */}
          <div className="flex-1 overflow-auto p-4">
            {/* Loading State */}
            {blogService.loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-gray-400" />
              </div>
            )}

            {/* Empty State */}
            {!blogService.loading && filteredBlogs.length === 0 && (
              <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无博客</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">创建您的第一篇博客开始写作吧</p>
                <button
                  onClick={handleCreateBlog}
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  新建博客
                </button>
              </div>
            )}

            {/* Blog Cards Grid */}
            {!blogService.loading && filteredBlogs.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBlogs.map((blog) => (
                  <BlogCard
                    key={blog.id}
                    blog={blog}
                    directoryName={getDirectoryName(blog.directoryId)}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {!blogService.loading && blogService.total > 0 && (
              <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-dark-700">
                <button
                  onClick={() => blogService.loadBlogs({
                    directoryId: selectedDirectoryId || undefined,
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    tagId: selectedTagId || undefined,
                    search: searchQuery || undefined,
                    page: blogService.page - 1,
                  })}
                  disabled={blogService.page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  第 {blogService.page} / {Math.ceil(blogService.total / blogService.pageSize)} 页
                </span>
                <button
                  onClick={() => blogService.loadBlogs({
                    directoryId: selectedDirectoryId || undefined,
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    tagId: selectedTagId || undefined,
                    search: searchQuery || undefined,
                    page: blogService.page + 1,
                  })}
                  disabled={blogService.page >= Math.ceil(blogService.total / blogService.pageSize)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
});
