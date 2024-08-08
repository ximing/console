# Directory Preview Filter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在目录预览界面增加本地筛选功能（状态过滤、标签过滤、排序），不影响左侧目录树

**Architecture:** 在 `PageList` 组件内部添加本地 state 管理筛选条件，对传入的 `blogs` 进行过滤和排序后展示

**Tech Stack:** React hooks (useState, useMemo), Tailwind CSS, existing @rabjs/react patterns

---

## Chunk 1: PageList Component Modification

**Files:**
- Modify: `apps/web/src/pages/blogs/components/content/page-list.tsx`

- [ ] **Step 1: Read current PageList component**

Read `apps/web/src/pages/blogs/components/content/page-list.tsx` to understand current structure.

- [ ] **Step 2: Add filter state and availableTags useMemo**

在组件内添加以下 state 和逻辑：

```tsx
import { useState, useMemo } from 'react';
import { view } from '@rabjs/react';
import { ArrowLeft, Loader2, ChevronDown, X } from 'lucide-react';
import { BlogCard } from '../blog-card';
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
    let result = [...props.blogs];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(blog => blog.status === statusFilter);
    }

    // Tag filter (AND logic)
    if (selectedTags.length > 0) {
      result = result.filter(blog =>
        selectedTags.every(tagName =>
          blog.tags.some(tag => tag.name === tagName)
        )
      );
    }

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
```

- [ ] **Step 3: Add FilterBar component JSX**

在 return 语句的 Header 部分下方添加筛选栏：

```tsx
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

      {/* Sort */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortBy)}
        className="px-3 py-1.5 text-sm border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="updatedAt">更新时间↓</option>
        <option value="createdAt">创建时间↓</option>
        <option value="title">标题 A-Z</option>
      </select>

      {/* Clear filters button */}
      {(statusFilter !== 'all' || selectedTags.length > 0) && (
        <button
          onClick={() => {
            setStatusFilter('all');
            setSelectedTags([]);
          }}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <X className="w-3 h-3" />
          清除筛选
        </button>
      )}
    </div>

    {/* Content */}
    ...
```

- [ ] **Step 4: Update Content to use filteredBlogs**

将 `{props.blogs.map((blog) => (` 改为 `{filteredBlogs.map((blog) => (`

- [ ] **Step 5: Add empty state for filtered results**

在 loading 之后添加过滤后无结果的提示：

```tsx
) : filteredBlogs.length === 0 && props.blogs.length > 0 ? (
  <div className="text-center py-12 text-gray-500">
    <p>没有符合条件的博客</p>
    <button
      onClick={() => {
        setStatusFilter('all');
        setSelectedTags([]);
      }}
      className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
    >
      清除筛选
    </button>
  </div>
```

- [ ] **Step 6: Add missing imports**

确认以下 import 存在：
- `useState` — 已添加
- `useMemo` — 已添加
- `useEffect` — 需要添加（用于 reset filters 和 click outside）
- `useRef` — 需要添加（用于 tag dropdown ref）
- `ChevronDown`, `X` from lucide-react — 需要添加

- [ ] **Step 7: Verify typecheck**

Run: `pnpm --filter @x-console/web typecheck`

Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/blogs/components/content/page-list.tsx
git commit -m "feat(web): add filter bar to directory preview

- Status filter: all/published/draft button group
- Tag filter: multi-select dropdown with dynamic tags
- Sort: updatedAt/createdAt/title dropdown
- Clear filters button

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] 点击目录后，筛选栏正确显示
- [ ] 状态过滤按钮切换有效
- [ ] 标签下拉框可以多选，选中的标签显示数量
- [ ] 排序下拉选择后博客列表正确排序
- [ ] 清除筛选按钮可以重置所有过滤条件
- [ ] 切换目录后筛选条件重置
- [ ] 无符合条件时显示空状态提示
- [ ] 暗色模式样式正常
