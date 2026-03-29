import { useState, useEffect, useRef } from 'react';
import { view, useService } from '@rabjs/react';
import { Search, X, FileText } from 'lucide-react';
import { BlogService } from '../../services/blog.service';
import { DirectoryService } from '../../services/directory.service';
import type { BlogDto } from '@x-console/dto';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPage: (pageId: string) => void;
  onExpandDirectory: (directoryId: string) => void;
}

interface SearchResult extends BlogDto {
  directoryName?: string;
}

export const SearchModal = view((props: SearchModalProps) => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input when modal opens
  useEffect(() => {
    if (props.visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [props.visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!props.visible) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [props.visible]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        await blogService.loadBlogs({ search: query, pageSize: 20 });
        const searchResults: SearchResult[] = blogService.blogs.map((blog) => {
          const dir = directoryService.directories.find((d) => d.id === blog.directoryId);
          return {
            ...blog,
            directoryName: dir?.name,
          };
        });
        setResults(searchResults);
        setSelectedIndex(0);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelectResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      props.onClose();
    }
  };

  const handleSelectResult = (blog: SearchResult) => {
    // Expand the directory tree to show this blog's location
    if (blog.directoryId) {
      props.onExpandDirectory(blog.directoryId);
    }
    props.onSelectPage(blog.id);
    props.onClose();
  };

  if (!props.visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={props.onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-dark-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索博客..."
            className="flex-1 bg-transparent text-lg outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          <button
            onClick={props.onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-dark-700 rounded"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto py-2">
          {loading && (
            <div className="text-center py-4 text-gray-500">搜索中...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="text-center py-4 text-gray-500">未找到结果</div>
          )}

          {!loading && results.length > 0 && (
            <div className="px-2">
              {results.map((blog, index) => (
                <button
                  key={blog.id}
                  onClick={() => handleSelectResult(blog)}
                  className={`flex items-start gap-3 w-full px-3 py-2 rounded-lg text-left ${
                    index === selectedIndex
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {blog.title}
                    </p>
                    {blog.directoryName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {blog.directoryName}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
