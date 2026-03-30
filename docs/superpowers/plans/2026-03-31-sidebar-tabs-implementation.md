# Sidebar Tabs Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "目录" and "最近" tabs to sidebar, move RecentList inside sidebar, simplify ContentArea

**Architecture:** Sidebar gains TabHeader with directory/recent toggle, RecentBlogList moves inside sidebar, ContentArea simplifies to directory/preview/edit modes with context-aware empty states

**Tech Stack:** React 19, @rabjs/react, Tailwind CSS, lucide-react

---

## File Structure

```
apps/web/src/pages/blogs/
├── blogs.tsx                                    # MODIFY: Add activeTab state
├── components/
│   ├── sidebar/
│   │   ├── index.tsx                           # MODIFY: Add TabHeader + TabContent switching
│   │   ├── sidebar-tabs.tsx                    # NEW: Tab header component
│   │   └── recent-blog-list.tsx               # NEW: Compact blog list for sidebar
│   ├── content/
│   │   ├── index.tsx                           # MODIFY: Add empty states, remove recent mode
│   │   └── ... (existing)
```

---

## Chunk 1: Create SidebarTabs Component

**Files:**
- Create: `apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx`

### Step 1: Write SidebarTabs component

```tsx
import { Folder, Clock } from 'lucide-react';

type SidebarTab = 'directory' | 'recent';

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export const SidebarTabs = ({ activeTab, onTabChange }: SidebarTabsProps) => {
  return (
    <div className="flex border-b border-gray-200 dark:border-dark-700">
      <button
        onClick={() => onTabChange('directory')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'directory'
            ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        }`}
      >
        <Folder className="w-4 h-4" />
        目录
      </button>
      <button
        onClick={() => onTabChange('recent')}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'recent'
            ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        }`}
      >
        <Clock className="w-4 h-4" />
        最近
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Save file**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx
git commit -m "feat(blogs): add SidebarTabs component for directory/recent switching

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Create RecentBlogList Component (Sidebar Version)

**Files:**
- Create: `apps/web/src/pages/blogs/components/sidebar/recent-blog-list.tsx`

### Step 1: Write RecentBlogList component

```tsx
import { view, useService } from '@rabjs/react';
import { Clock, FileText } from 'lucide-react';
import { BlogService } from '../../../../services/blog.service';
import { DirectoryService } from '../../../../services/directory.service';

interface RecentBlogListProps {
  selectedBlogId: string | null;
  onSelectBlog: (blogId: string) => void;
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

export const RecentBlogList = view(
  ({ selectedBlogId, onSelectBlog }: RecentBlogListProps) => {
    const blogService = useService(BlogService);
    const directoryService = useService(DirectoryService);

    const getDirectoryName = (directoryId: string | undefined): string | undefined => {
      if (!directoryId) return undefined;
      const dir = directoryService.directories.find((d) => d.id === directoryId);
      return dir?.name;
    };

    if (blogService.loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (blogService.blogs.length === 0) {
      return (
        <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          暂无博客
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto py-1">
        {blogService.blogs.map((blog) => (
          <div
            key={blog.id}
            onClick={() => onSelectBlog(blog.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
              selectedBlogId === blog.id
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0 opacity-50" />
            <div className="flex-1 min-w-0">
              <div className="line-clamp-1">{blog.title}</div>
              <div className="flex items-center gap-2 text-xs opacity-50">
                {getDirectoryName(blog.directoryId) && (
                  <span className="truncate">{getDirectoryName(blog.directoryId)}</span>
                )}
                <span className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(blog.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
);
```

- [ ] **Step 2: Save file**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/sidebar/recent-blog-list.tsx
git commit -m "feat(blogs): add RecentBlogList component for sidebar

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Refactor Sidebar Component

**Files:**
- Modify: `apps/web/src/pages/blogs/components/sidebar/index.tsx`

### Changes:

1. **Update Props Interface:**
```tsx
interface SidebarProps {
  activeTab: 'directory' | 'recent';
  onTabChange: (tab: 'directory' | 'recent') => void;
  selectedDirectoryId: string | null;
  selectedBlogId: string | null;  // NEW: for highlighting selected blog in recent list
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectBlog: (blogId: string) => void;  // NEW: for recent tab blog selection
  // ... existing props
}
```

2. **Add SidebarTabs below SearchButton:**
```tsx
<div className="px-2 py-2 border-b border-gray-200 dark:border-dark-700">
  <SearchButton onClick={props.onSearchClick} />
</div>

{/* NEW: Tab Header */}
<SidebarTabs activeTab={props.activeTab} onTabChange={props.onTabChange} />
```

3. **Conditionally render content based on activeTab:**
```tsx
{props.activeTab === 'directory' ? (
  <div className="flex-1 overflow-auto py-1">
    {/* DirectoryTree */}
  </div>
) : (
  <RecentBlogList
    selectedBlogId={props.selectedBlogId}
    onSelectBlog={props.onSelectBlog}
  />
)}
```

4. **Update ActionButtons:**
- Directory tab: show both "新建博客" and "新建目录"
- Recent tab: show only "新建博客" (creates at root level)

### Step 1: Apply changes

Read the file and apply the modifications:
- Add imports for SidebarTabs and RecentBlogList
- Update Props interface
- Restructure JSX with TabHeader and conditional content rendering

- [ ] **Step 2: Verify changes**

Read file to confirm structure

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/sidebar/index.tsx
git commit -m "refactor(blogs): add tabs to sidebar with directory/recent switching

Adds SidebarTabs component, RecentBlogList in sidebar, conditional content
rendering based on active tab

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Update ContentArea Component

**Files:**
- Modify: `apps/web/src/pages/blogs/components/content/index.tsx`

### Changes:

1. **Update Props Interface:**
```tsx
interface ContentAreaProps {
  mode: 'directory' | 'preview' | 'edit';  // Removed 'recent'
  activeTab: 'directory' | 'recent';  // NEW: for empty state text
  // ... existing props
}
```

2. **Remove RecentList rendering:**
- Delete the `if (props.mode === 'directory')` block that renders RecentList
- Remove import of RecentList

3. **Update ContentArea return:**
```tsx
export const ContentArea = view((props: ContentAreaProps) => {
  // ... existing edit/preview mode checks

  if (props.mode === 'preview' && props.selectedPageId) {
    return <PagePreview pageId={props.selectedPageId} onBack={props.onBack} />;
  }

  if (props.mode === 'directory' && props.selectedDirectoryId) {
    return <PageList ... />;
  }

  // Empty state based on activeTab
  if (props.activeTab === 'directory') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Folder className="w-12 h-12 mb-4 opacity-50" />
        <p>请选择一个目录</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <Clock className="w-12 h-12 mb-4 opacity-50" />
      <p>请在侧边栏选择一个博客</p>
    </div>
  );
});
```

4. **Update PagePreview call:**
- Pass `onBack={props.onBack}` instead of `onBack={props.onBackToDirectory}`

### Step 1: Apply changes

- [ ] **Step 2: Verify changes**

Read file to confirm structure

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/content/index.tsx
git commit -m "refactor(blogs): update ContentArea with empty states and simplified mode

Removes 'recent' mode, adds context-aware empty states based on activeTab,
updates PagePreview onBack prop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Update blogs.tsx (Parent Component)

**Files:**
- Modify: `apps/web/src/pages/blogs/blogs.tsx`

### Changes:

1. **Add activeTab state:**
```tsx
const [activeTab, setActiveTab] = useState<'directory' | 'recent'>('directory');
```

2. **Simplify ContentMode type:**
```tsx
type ContentMode = 'directory' | 'preview' | 'edit';
```

3. **Update initial state:**
```tsx
const [contentMode, setContentMode] = useState<ContentMode>('directory');
```

4. **Update URL sync logic:**
- When URL is `/blogs` → set `activeTab = 'directory'`, `contentMode = 'directory'`
- When URL is `/blogs/:blogId` → load blog, determine tab based on `blog.directoryId`:
  - Has directoryId → `activeTab = 'directory'`, expand that directory
  - No directoryId → `activeTab = 'recent'`
- Remove `contentMode === 'recent'` checks

5. **Update handleSelectPage:**
```tsx
const handleSelectPage = (pageId: string) => {
  setSelectedPageId(pageId);
  setContentMode('preview');
  blogService.loadBlog(pageId);
  navigate(`/blogs/${pageId}`);
};
```

6. **Add onBack handler:**
```tsx
const handleBack = () => {
  setSelectedPageId(null);
  setContentMode('directory');
  navigate('/blogs');
};
```

7. **Update Sidebar props:**
```tsx
<Sidebar
  activeTab={activeTab}
  onTabChange={setActiveTab}
  selectedBlogId={selectedPageId}
  onSelectBlog={handleSelectPage}
  // ... existing props
/>
```

8. **Update ContentArea props:**
```tsx
<ContentArea
  mode={contentMode}
  activeTab={activeTab}
  onBack={handleBack}
  // ... existing props
/>
```

### Step 1: Apply changes

- [ ] **Step 2: Verify changes**

Read file to confirm structure

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/blogs.tsx
git commit -m "refactor(blogs): add activeTab state and simplify ContentMode

Adds 'directory' | 'recent' tab state, simplifies ContentMode to remove 'recent',
updates URL sync and navigation handlers

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Cleanup

**Files:**
- Delete: `apps/web/src/pages/blogs/components/content/recent-list.tsx` (optional - check if used elsewhere)

### Step 1: Check if RecentList is used elsewhere

```bash
grep -r "RecentList" apps/web/src --include="*.tsx" --include="*.ts"
```

If only used in content/index.tsx, safe to delete.

- [ ] **Step 2: Delete if unused**

- [ ] **Step 3: Commit cleanup**

```bash
git rm apps/web/src/pages/blogs/components/content/recent-list.tsx
git commit -m "refactor(blogs): remove unused RecentList component

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification

After all chunks:

- [ ] **Step 1: Run type check**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: No TypeScript errors

- [ ] **Step 2: Run lint**

```bash
cd apps/web && pnpm lint
```

Expected: No ESLint errors

- [ ] **Step 3: Manual testing**

1. Navigate to `/blogs`
   - [ ] Sidebar shows "目录" and "最近" tabs
   - [ ] "目录" tab is active by default
   - [ ] ContentArea shows "请选择一个目录" empty state

2. Click "最近" tab
   - [ ] Sidebar shows recent blog list
   - [ ] Click a blog → ContentArea shows preview
   - [ ] ContentArea shows "请在侧边栏选择一个博客" initially

3. Click "目录" tab
   - [ ] Directory tree is displayed
   - [ ] Click a directory → PageList shows
   - [ ] Click a blog → PagePreview shows

4. Test navigation
   - [ ] Click blog from Recent tab, URL updates to `/blogs/:id`
   - [ ] Refresh page, correct tab is selected
   - [ ] Back button returns to empty state

---

## Summary of Commits

1. `feat(blogs): add SidebarTabs component for directory/recent switching`
2. `feat(blogs): add RecentBlogList component for sidebar`
3. `refactor(blogs): add tabs to sidebar with directory/recent switching`
4. `refactor(blogs): update ContentArea with empty states and simplified mode`
5. `refactor(blogs): add activeTab state and simplify ContentMode`
6. `refactor(blogs): remove unused RecentList component` (if applicable)
