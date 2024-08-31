import { useState, useMemo, useEffect, useRef } from 'react';
import { view } from '@rabjs/react';
import { ArrowLeft, Loader2, ChevronDown, X } from 'lucide-react';
import { BlogCard } from '../blog-card';
import { ViewToggle, type ViewMode } from '../view-toggle';
import { BlogListItem } from '../blog-list-item';
import type { BlogDto } from '@x-console/dto';

type StatusFilter = 'all' | 'published' | 'draft';
type SortBy = 'updatedAt' | 'createdAt' | 'title';

interface PageListProps {
  directoryId: string;
  directoryName: string;
  blogs: BlogDto[];
  loading: boolean;
  onBack: () => void;
  onSelectPage: (pageId: string) => void;
  onEditPage?: (blog: BlogDto) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const PageList = view((props: PageListProps) => {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Reset filters when directory changes
  useEffect(() => {
    setStatusFilter('all');
    setSelectedTags([]);
    setSortBy('updatedAt');
  }, [props.directoryId]);

  // Dynamically extract available tags from current blogs
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    props.blogs.forEach(blog => {
      blog.tags.forEach(tag => tagSet.add(tag.name));
    });
    return Array.from(tagSet).sort();
  }, [props.blogs]);

  // Filtered and sorted blogs
  const filteredBlogs = useMemo(() => {
    const result = [...props.blogs].filter(blog => {
      // Status filter
      if (statusFilter !== 'all' && blog.status !== statusFilter) {
        return false;
      }

      // Tag filter (AND logic)
      if (selectedTags.length > 0 && !selectedTags.every(tagName =>
        blog.tags.some(tag => tag.name === tagName)
      )) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'updatedAt':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [props.blogs, statusFilter, selectedTags, sortBy]);

  // Tag dropdown click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center gap-3">
          <button
            onClick={props.onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-semibold">{props.directoryName}</h2>
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-dark-700">
            {props.blogs.length === 1 ? '1 篇' : `${props.blogs.length} 篇`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle value={props.viewMode} onChange={props.onViewModeChange} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="updatedAt">更新时间↓</option>
            <option value="createdAt">创建时间↓</option>
            <option value="title">标题 A-Z</option>
          </select>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-dark-700">
        {/* Status Filter - Button Group */}
        <div className="flex rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
          {(['all', 'published', 'draft'] as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                statusFilter === status
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700'
              }`}
            >
              {status === 'all' ? '全部' : status === 'published' ? '已发布' : '草稿'}
            </button>
          ))}
        </div>

        {/* Tag Filter - Dropdown */}
        {availableTags.length > 0 && (
          <div ref={tagDropdownRef} className="relative">
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700"
            >
              标签 {selectedTags.length > 0 && `(${selectedTags.length})`}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showTagDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 max-h-60 overflow-auto bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg z-10">
                {availableTags.map(tag => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag]);
                        } else {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        }
                      }}
                      className="rounded border-gray-300 dark:border-dark-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{tag}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clear filters button */}
        {(statusFilter !== 'all' || selectedTags.length > 0) && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setSelectedTags([]);
              setSortBy('updatedAt');
            }}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-3 h-3" />
            清除筛选
          </button>
        )}
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
      ) : filteredBlogs.length === 0 && props.blogs.length > 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>没有符合条件的博客</p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setSelectedTags([]);
              setSortBy('updatedAt');
            }}
            className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            清除筛选
          </button>
        </div>
      ) : props.viewMode === 'list' ? (
        <div className="flex-1 overflow-auto -mx-6 -mb-4">
          {filteredBlogs.map((blog) => (
            <BlogListItem
              key={blog.id}
              blog={blog}
              directoryName={props.directoryName}
              onClick={() => props.onSelectPage(blog.id)}
              onEdit={props.onEditPage}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBlogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              directoryName={props.directoryName}
              onClick={() => props.onSelectPage(blog.id)}
              onEdit={props.onEditPage}
            />
          ))}
        </div>
      )}
    </div>
  );
});