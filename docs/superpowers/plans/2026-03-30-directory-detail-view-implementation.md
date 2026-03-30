# Directory Detail View Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add card/list view toggle to directory detail view, fix padding and alignment issues

**Architecture:** Add ViewToggle component and BlogListItem component, refactor PageList and RecentList to use shared viewMode state, fix BlogCard alignment

**Tech Stack:** React 19, @rabjs/react, Tailwind CSS, lucide-react

---

## File Structure

```
apps/web/src/pages/blogs/components/
├── view-toggle.tsx          # NEW: View mode toggle (card/list)
├── blog-list-item.tsx       # NEW: List view item component
├── blog-card.tsx            # MODIFY: Fix ml-7 alignment issue
├── content/
│   ├── index.tsx            # MODIFY: Pass viewMode state
│   ├── page-list.tsx        # MODIFY: Add Header, ViewToggle, padding
│   └── recent-list.tsx      # MODIFY: Add Header, ViewToggle, padding
```

---

## Chunk 1: Create ViewToggle Component

**Files:**
- Create: `apps/web/src/pages/blogs/components/view-toggle.tsx`

### Step 1: Write ViewToggle component

```tsx
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'card' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewToggle = ({ value, onChange }: ViewToggleProps) => {
  return (
    <div className="flex rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
      <button
        onClick={() => onChange('card')}
        aria-label="卡片视图"
        aria-pressed={value === 'card'}
        className={`p-2 transition-colors ${
          value === 'card'
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        aria-label="列表视图"
        aria-pressed={value === 'list'}
        className={`p-2 transition-colors ${
          value === 'list'
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700'
        }`}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Save file**

Run: None (Write tool)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/view-toggle.tsx
git commit -m "feat(blogs): add ViewToggle component for card/list switch

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Create BlogListItem Component

**Files:**
- Create: `apps/web/src/pages/blogs/components/blog-list-item.tsx`

### Step 1: Write BlogListItem component

```tsx
import { view } from '@rabjs/react';
import { Clock, FileText, Edit2 } from 'lucide-react';
import type { BlogDto } from '@x-console/dto';

interface BlogListItemProps {
  blog: BlogDto;
  directoryName?: string;
  onClick?: () => void;
  onEdit?: (blog: BlogDto) => void;
}

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

export const BlogListItem = view(
  ({ blog, directoryName, onClick, onEdit }: BlogListItemProps) => {
    const handleEditClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onEdit) {
        onEdit(blog);
      }
    };

    const displayTags = blog.tags.slice(0, 3);
    const remainingTagCount = blog.tags.length - 3;

    return (
      <div
        onClick={onClick}
        className="flex items-start justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer group transition-colors"
      >
        {/* Left Section */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-base font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-1">
              {blog.title}
            </h3>
            {/* Excerpt */}
            {blog.excerpt && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {blog.excerpt}
              </p>
            )}
            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-2">
              {directoryName && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400">
                  {directoryName}
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                  blog.status === 'published'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                }`}
              >
                {blog.status === 'published' ? '已发布' : '草稿'}
              </span>
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
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{remainingTagCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(blog.updatedAt)}
          </span>
          {onEdit && (
            <button
              onClick={handleEditClick}
              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-all"
              aria-label={`编辑 ${blog.title}`}
            >
              <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
```

- [ ] **Step 2: Save file**

Run: None (Write tool)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-list-item.tsx
git commit -m "feat(blogs): add BlogListItem component for list view

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Refactor BlogCard (Fix Alignment)

**Files:**
- Modify: `apps/web/src/pages/blogs/components/blog-card.tsx`

### Step 1: Fix ml-7 alignment issue

The current BlogCard uses `ml-7` hardcoded values which causes alignment issues. Replace with proper flex layout.

**Old structure (lines 66-91):**
```tsx
      {/* Title Row */}
      <div className="flex items-start gap-2 mb-2">
        <FileText className="w-5 h-5 text-gray-400 ..." />
        <h3 className="text-lg font-semibold ... ml-7">  {/* PROBLEM */}
          {blog.title}
        </h3>
        ...
      </div>

      {/* Excerpt */}
      {blog.excerpt && (
        <p className="text-sm ... ml-7">  {/* PROBLEM */}
          {blog.excerpt}
        </p>
      )}

      {/* Meta Info Row */}
      <div className="flex flex-wrap items-center gap-2 ml-7">  {/* PROBLEM */}
```

**New structure:**
```tsx
      {/* Title Row */}
      <div className="flex items-start gap-2 mb-2">
        <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-1 flex-1">
          {blog.title}
        </h3>
        ...
      </div>

      {/* Excerpt */}
      {blog.excerpt && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {blog.excerpt}
        </p>
      )}

      {/* Meta Info Row */}
      <div className="flex flex-wrap items-center gap-2">
```

- [ ] **Step 2: Apply fix**

Run: Edit `apps/web/src/pages/blogs/components/blog-card.tsx`

Replace the problematic sections:
1. Line 66-81: Title Row div (remove ml-7 from h3)
2. Line 84-88: Excerpt p (remove ml-7)
3. Line 91: Meta Info Row div (remove ml-7)

- [ ] **Step 3: Verify file looks correct**

Run: Read the file to confirm changes

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-card.tsx
git commit -m "fix(blogs): fix BlogCard alignment by removing hardcoded ml-7

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Refactor PageList

**Files:**
- Modify: `apps/web/src/pages/blogs/components/content/page-list.tsx`

### Step 1: Add imports

Add to top of file:
```tsx
import { ViewToggle, type ViewMode } from '../view-toggle';
import { BlogListItem } from '../blog-list-item';
```

### Step 2: Update PageListProps interface

Add `viewMode` and `onViewModeChange`:
```tsx
interface PageListProps {
  directoryId: string;
  directoryName: string;
  blogs: BlogDto[];
  loading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onBack: () => void;
  onSelectPage: (pageId: string) => void;
  onEditPage?: (blog: BlogDto) => void;
}
```

### Step 3: Restructure the component

**New structure:**
```tsx
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
      {/* ... existing filter buttons ... */}
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
        <button ...>清除筛选</button>
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
```

**Note:** The list view uses `-mx-6 -mb-4` to extend full width and compensate for parent padding.

- [ ] **Step 4: Apply changes**

Run: Edit `apps/web/src/pages/blogs/components/content/page-list.tsx`

Key changes:
1. Add imports for ViewToggle and BlogListItem
2. Update PageListProps interface
3. Restructure return statement with new Header layout and viewMode conditional rendering

- [ ] **Step 5: Verify changes**

Run: Read file to confirm structure

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/blogs/components/content/page-list.tsx
git commit -m "refactor(blogs): refactor PageList with Header, ViewToggle, and list view

Adds px-6 py-4 container padding, proper Header with back button/title/count
and ViewToggle, filters in separate row, card/list view conditional rendering

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Refactor RecentList

**Files:**
- Modify: `apps/web/src/pages/blogs/components/content/recent-list.tsx`

### Step 1: Add imports

Add to top of file:
```tsx
import { ViewToggle, type ViewMode } from '../view-toggle';
import { BlogListItem } from '../blog-list-item';
```

Add LayoutGrid import if not present:
```tsx
import { FileText, LayoutGrid } from 'lucide-react';  // Add LayoutGrid
```

### Step 2: Update RecentListProps interface

```tsx
interface RecentListProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectPage: (pageId: string) => void;
  onEditPage?: (blog: BlogDto) => void;
}
```

### Step 3: Restructure the component

**New structure:**
```tsx
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
```

- [ ] **Step 4: Apply changes**

Run: Edit `apps/web/src/pages/blogs/components/content/recent-list.tsx`

Key changes:
1. Add imports
2. Update RecentListProps interface
3. Restructure with Header + px-6 py-4 container + viewMode conditional

- [ ] **Step 5: Verify changes**

Run: Read file to confirm

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/blogs/components/content/recent-list.tsx
git commit -m "refactor(blogs): refactor RecentList with Header, ViewToggle, and list view

Adds px-6 py-4 container padding, proper Header with title/count and ViewToggle,
card/list view conditional rendering

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Update ContentArea (ViewMode State)

**Files:**
- Modify: `apps/web/src/pages/blogs/components/content/index.tsx`

### Step 1: Add imports

```tsx
import { useState } from 'react';
import { ViewToggle, type ViewMode } from '../view-toggle';
```

### Step 2: Update ContentArea

Add `viewMode` state and pass to children:

```tsx
export const ContentArea = view((props: ContentAreaProps) => {
  const directoryService = useService(DirectoryService);
  const blogService = useService(BlogService);
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // ... existing getDirectoryName ...

  // ... existing mode checks (edit, preview) ...

  if (props.mode === 'directory') {
    return (
      <PageList
        directoryId={props.selectedDirectoryId!}
        directoryName={getDirectoryName()}
        blogs={props.directoryBlogs}
        loading={props.directoryLoading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onBack={props.onBackToRecent}
        onSelectPage={props.onSelectPage}
        onEditPage={props.onEditPage}
      />
    );
  }

  return (
    <RecentList
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSelectPage={props.onSelectPage}
      onEditPage={props.onEditPage}
  />
});
```

- [ ] **Step 3: Apply changes**

Run: Edit `apps/web/src/pages/blogs/components/content/index.tsx`

- [ ] **Step 4: Verify changes**

Run: Read file to confirm

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/blogs/components/content/index.tsx
git commit -m "feat(blogs): add viewMode state to ContentArea for card/list toggle

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification

After all chunks:

- [ ] **Step 1: Run type check**

```bash
cd apps/web && pnpm typecheck
```

Expected: No TypeScript errors

- [ ] **Step 2: Run lint**

```bash
cd apps/web && pnpm lint
```

Expected: No ESLint errors

- [ ] **Step 3: Test manually**

1. Navigate to blogs page
2. Check RecentList shows with proper padding and ViewToggle
3. Click a directory, check PageList shows with Header and ViewToggle
4. Click list view toggle, verify list items render correctly
5. Click card view toggle, verify card grid renders
6. Test dark mode

---

## Summary of Commits

1. `feat(blogs): add ViewToggle component for card/list switch`
2. `feat(blogs): add BlogListItem component for list view`
3. `fix(blogs): fix BlogCard alignment by removing hardcoded ml-7`
4. `refactor(blogs): refactor PageList with Header, ViewToggle, and list view`
5. `refactor(blogs): refactor RecentList with Header, ViewToggle, and list view`
6. `feat(blogs): add viewMode state to ContentArea for card/list toggle`
