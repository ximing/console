# Wiki Blog Layout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the blogs page into a Notion-style wiki layout with left sidebar (directory tree + search) and right content area (dynamic: recent blogs list / directory pages list / page preview).

**Architecture:** Refactor monolithic `blogs.tsx` into sidebar + content components. Use @rabjs/react view/useService patterns. Content area manages three states: `recent` | `directory` | `preview`.

**Tech Stack:** React 19, @rabjs/react, Tailwind CSS, Lucide icons, React Router

---

## File Structure

```
apps/web/src/pages/blogs/
├── blogs.tsx                          # [REFACTOR] Main page - state management for content mode
├── index.tsx                          # [KEEP] Entry point
├── components/
│   ├── sidebar/
│   │   ├── index.tsx                 # [CREATE] Sidebar container
│   │   ├── search-button.tsx         # [CREATE] Search icon button
│   │   ├── action-buttons.tsx        # [CREATE] New directory + new blog buttons
│   │   └── directory-tree.tsx        # [MODIFY] Add page nodes + rename context menu
│   ├── content/
│   │   ├── index.tsx                 # [CREATE] Content area container (mode switch)
│   │   ├── recent-list.tsx           # [CREATE] "Recent" tab content
│   │   ├── page-list.tsx            # [CREATE] Directory pages list
│   │   └── page-preview.tsx         # [CREATE] Read-only blog preview
│   ├── search-modal.tsx              # [CREATE] Search popup modal
│   └── context-menu.tsx             # [CREATE] Reusable context menu
├── editor/
│   ├── editor.tsx                    # [KEEP] Existing editor
│   └── index.tsx                     # [KEEP]
└── components/
    ├── blog-card.tsx                 # [MODIFY] Change click to preview, not navigate
    ├── directory-tree.tsx            # [DELETE after sidebar refactor]
    ├── tag-filter.tsx                # [DELETE] Not needed
    └── editor-toolbar.tsx            # [KEEP]

apps/web/src/services/
├── blog.service.ts                   # [MODIFY] Add moveBlog, createBlog with directoryId
└── directory.service.ts              # [MODIFY] Add renameDirectory
```

---

## Chunk 1: BlogService API Updates

**Goal:** Add `moveBlog` method and update `createBlog` to accept optional `directoryId`.

**Files:**
- Modify: `apps/web/src/services/blog.service.ts`

- [ ] **Step 1: Add `moveBlog` method to BlogService**

Add after `unpublishBlog` method (line 248):

```typescript
/**
 * Move a blog to a different directory
 */
async moveBlog(blogId: string, targetDirectoryId: string): Promise<boolean> {
  try {
    const blog = await blogApi.updateBlog(blogId, { directoryId: targetDirectoryId });
    // Update in local state
    const index = this.blogs.findIndex((b) => b.id === blogId);
    if (index !== -1) {
      this.blogs[index] = blog;
    }
    if (this.currentBlog?.id === blogId) {
      this.currentBlog = blog;
    }
    return true;
  } catch (err) {
    console.error('Move blog error:', err);
    const toast = await this.getToastService();
    toast.error('Failed to move blog');
    return false;
  }
}
```

- [ ] **Step 2: Update `createBlog` to accept `directoryId`**

Modify `createBlog` method signature (line 100):

```typescript
async createBlog(data: CreateBlogDto, directoryId?: string): Promise<BlogDto | null> {
  try {
    const blog = await blogApi.createBlog(data);
    // If directoryId provided, update the blog to belong to that directory
    if (directoryId) {
      const updatedBlog = await blogApi.updateBlog(blog.id, { directoryId });
      this.blogs = [updatedBlog, ...this.blogs];
      this.currentBlog = updatedBlog;
      return updatedBlog;
    }
    this.blogs = [blog, ...this.blogs];
    this.currentBlog = blog;
    return blog;
  } catch (err) {
    console.error('Create blog error:', err);
    const toast = await this.getToastService();
    toast.error('Failed to create blog');
    return null;
  }
}
```

Note: The API `createBlog` in `blogApi` needs to support `directoryId` in `CreateBlogDto`. Check if `CreateBlogDto` in `@x-console/dto` has `directoryId`. If not, the backend API may need updating. For now, assume it can be passed or we use `updateBlog` after creation.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/services/blog.service.ts
git commit -m "feat(web): add moveBlog and directoryId param to createBlog"
```

---

## Chunk 2: Create Sidebar Components

**Goal:** Create the sidebar structure with search button, action buttons, and refactored directory tree.

**Files:**
- Create: `apps/web/src/pages/blogs/components/sidebar/search-button.tsx`
- Create: `apps/web/src/pages/blogs/components/sidebar/action-buttons.tsx`
- Create: `apps/web/src/pages/blogs/components/sidebar/index.tsx`

- [ ] **Step 1: Create `search-button.tsx`**

```typescript
import { Search } from 'lucide-react';
import { view } from '@rabjs/react';

interface SearchButtonProps {
  onClick: () => void;
}

export const SearchButton = view(({ onClick }: SearchButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
    >
      <Search className="w-4 h-4" />
      <span>搜索</span>
    </button>
  );
});
```

- [ ] **Step 2: Create `action-buttons.tsx`**

```typescript
import { Plus, FolderPlus } from 'lucide-react';
import { view } from '@rabjs/react';

interface ActionButtonsProps {
  onNewBlog: () => void;
  onNewDirectory: () => void;
  disabled?: boolean;
}

export const ActionButtons = view(({ onNewBlog, onNewDirectory, disabled }: ActionButtonsProps) => {
  return (
    <div className="flex flex-col gap-1 px-2 py-2 border-t border-gray-200 dark:border-dark-700">
      <button
        onClick={onNewBlog}
        disabled={disabled}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        新建博客
      </button>
      <button
        onClick={onNewDirectory}
        disabled={disabled}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FolderPlus className="w-4 h-4" />
        新建目录
      </button>
    </div>
  );
});
```

- [ ] **Step 3: Create `sidebar/index.tsx`**

```typescript
import { view, useService } from '@rabjs/react';
import { DirectoryService } from '../../../services/directory.service';
import { BlogService } from '../../../services/blog.service';
import { ToastService } from '../../../services/toast.service';
import { SearchButton } from './search-button';
import { ActionButtons } from './action-buttons';
import { DirectoryTree } from '../directory-tree';

interface SidebarProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onSearchClick: () => void;
  onNewBlog: () => void;
  onNewDirectory: () => void;
  onContextMenuDirectory: (e: React.MouseEvent, node: any) => void;
  onContextMenuPage: (e: React.MouseEvent, blog: any) => void;
}

export const Sidebar = view((props: SidebarProps) => {
  const directoryService = useService(DirectoryService);
  const blogService = useService(BlogService);
  const toastService = useService(ToastService);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700">
      {/* Search Button */}
      <div className="px-2 py-2 border-b border-gray-200 dark:border-dark-700">
        <SearchButton onClick={props.onSearchClick} />
      </div>

      {/* Directory Tree */}
      <div className="flex-1 overflow-auto py-1">
        <DirectoryTree
          selectedDirectoryId={props.selectedDirectoryId}
          selectedPageId={props.selectedPageId}
          onSelectDirectory={props.onSelectDirectory}
          onSelectPage={props.onSelectPage}
          onContextMenuDirectory={props.onContextMenuDirectory}
          onContextMenuPage={props.onContextMenuPage}
        />
      </div>

      {/* Action Buttons */}
      <ActionButtons
        onNewBlog={props.onNewBlog}
        onNewDirectory={props.onNewDirectory}
        disabled={blogService.loading || directoryService.loading}
      />
    </div>
  );
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/blogs/components/sidebar/
git commit -m "feat(web): create sidebar components structure"
```

---

## Chunk 3: Refactor DirectoryTree with Page Nodes

**Goal:** Extend DirectoryTree to show page nodes (blogs) under directories and add context menus for both directory and page nodes.

**Files:**
- Create: `apps/web/src/pages/blogs/components/directory-tree.tsx` (replaces existing)

- [ ] **Step 1: Read existing directory-tree.tsx to understand current structure**

The existing `directory-tree.tsx` at lines 1-320 shows the current implementation. We need to extend it significantly.

- [ ] **Step 2: Create new `directory-tree.tsx` with page nodes support**

The new component should:
1. Keep the tree structure for directories
2. Add page/blog nodes as children under directories
3. Handle `selectedPageId` to highlight the selected page
4. Support `onContextMenuPage` callback for page right-click

Key changes from existing:
- Add `selectedPageId` prop
- Add `onSelectPage` callback
- Add `onContextMenuPage` callback
- Modify tree rendering to show blog pages under directories
- Load blogs per directory when expanded

```typescript
// New imports and interface additions
import { useState, useEffect, useRef } from 'react';
import { view, useService, Service } from '@rabjs/react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Loader2,
} from 'lucide-react';
import { DirectoryService, type DirectoryTreeNode } from '../../../services/directory.service';
import { BlogService } from '../../../services/blog.service';
import { ToastService } from '../../../services/toast.service';

// Add BlogDto to imports from @x-console/dto

interface DirectoryTreeProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onContextMenuDirectory: (e: React.MouseEvent, node: DirectoryTreeNode) => void;
  onContextMenuPage: (e: React.MouseEvent, blog: BlogDto) => void;
}

interface ExpandedState {
  directories: Set<string>;
  blogs: Set<string>; // Track which directories have loaded their blogs
}
```

- [ ] **Step 3: Add directory blog loading when expanding a directory**

In the component, when a directory is expanded and its blogs haven't been loaded, call `blogService.loadBlogs({ directoryId, pageSize: 1000 })`.

- [ ] **Step 4: Add page node rendering**

Render blog pages as children under directories with:
- FileText icon
- Page title
- Click → `onSelectPage(blog.id)`
- Right-click → `onContextMenuPage(e, blog)`

- [ ] **Step 5: Add selected state styling for page nodes**

Similar styling to directory nodes but with `bg-primary-100` variant.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/blogs/components/directory-tree.tsx
git commit -m "feat(web): extend directory tree with page nodes and context menus"
```

---

## Chunk 4: Create Content Area Components

**Goal:** Create the three content area states: recent list, directory page list, and page preview.

**Files:**
- Create: `apps/web/src/pages/blogs/components/content/recent-list.tsx`
- Create: `apps/web/src/pages/blogs/components/content/page-list.tsx`
- Create: `apps/web/src/pages/blogs/components/content/page-preview.tsx`
- Create: `apps/web/src/pages/blogs/components/content/index.tsx`

- [ ] **Step 1: Create `recent-list.tsx`**

```typescript
import { view, useService } from '@rabjs/react';
import { FileText, Loader2 } from 'lucide-react';
import { BlogService } from '../../../services/blog.service';
import { DirectoryService } from '../../../services/directory.service';
import { BlogCard } from '../blog-card';

interface RecentListProps {
  onSelectPage: (pageId: string) => void;
}

export const RecentList = view(({ onSelectPage }: RecentListProps) => {
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
        />
      ))}
    </div>
  );
});
```

- [ ] **Step 2: Create `page-list.tsx`**

Similar to `recent-list.tsx` but:
- Receives `blogs` array as prop
- Receives `directoryName` as prop
- Displays "返回" button header

```typescript
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
```

- [ ] **Step 3: Create `page-preview.tsx`**

```typescript
import { view, useService } from '@rabjs/react';
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { BlogService } from '../../../services/blog.service';
import { DirectoryService } from '../../../services/directory.service';

interface PagePreviewProps {
  pageId: string;
  onBack: () => void;
}

export const PagePreview = view(({ pageId, onBack }: PagePreviewProps) => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const navigate = useNavigate();

  const blog = blogService.currentBlog;

  const getDirectoryPath = (): string => {
    if (!blog?.directoryId) return '';
    const dir = directoryService.directories.find((d) => d.id === blog.directoryId);
    return dir?.name || '';
  };

  const handleEdit = () => {
    navigate(`/blogs/${pageId}/editor`);
  };

  if (blogService.loading || !blog) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-dark-700">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{blog.title}</h1>
          {getDirectoryPath() && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getDirectoryPath()} / {blog.title}
            </p>
          )}
        </div>
        <button
          onClick={handleEdit}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          编辑
        </button>
      </div>

      {/* Content - Read-only rendering */}
      <div className="flex-1 overflow-auto prose dark:prose-invert max-w-none">
        {/* Render blog.content as HTML - using dangerouslySetInnerHTML or a safe HTML renderer */}
        <div dangerouslySetInnerHTML={{ __html: blog.content || '' }} />
      </div>
    </div>
  );
});
```

- [ ] **Step 4: Create `content/index.tsx`**

```typescript
import { view, useService } from '@rabjs/react';
import { BlogService } from '../../../services/blog.service';
import { RecentList } from './recent-list';
import { PageList } from './page-list';
import { PagePreview } from './page-preview';

type ContentMode = 'recent' | 'directory' | 'preview';

interface ContentAreaProps {
  mode: ContentMode;
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  directoryBlogs: any[];
  directoryLoading: boolean;
  onBackToRecent: () => void;
  onBackToDirectory: () => void;
  onSelectPage: (pageId: string) => void;
}

export const ContentArea = view((props: ContentAreaProps) => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);

  const getDirectoryName = (): string => {
    if (!props.selectedDirectoryId) return '';
    const dir = directoryService.directories.find((d) => d.id === props.selectedDirectoryId);
    return dir?.name || '';
  };

  if (props.mode === 'preview' && props.selectedPageId) {
    return <PagePreview pageId={props.selectedPageId} onBack={props.onBackToDirectory} />;
  }

  if (props.mode === 'directory') {
    return (
      <PageList
        directoryId={props.selectedDirectoryId!}
        directoryName={getDirectoryName()}
        blogs={props.directoryBlogs}
        loading={props.directoryLoading}
        onBack={props.onBackToRecent}
        onSelectPage={props.onSelectPage}
      />
    );
  }

  return <RecentList onSelectPage={props.onSelectPage} />;
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/blogs/components/content/
git commit -m "feat(web): create content area components"
```

---

## Chunk 5: Create Search Modal

**Goal:** Create the search popup modal with debounced search and result selection.

**Files:**
- Create: `apps/web/src/pages/blogs/components/search-modal.tsx`

- [ ] **Step 1: Create `search-modal.tsx`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/components/search-modal.tsx
git commit -m "feat(web): create search modal component"
```

---

## Chunk 6: Create Context Menu Component

**Goal:** Create a reusable context menu component for directory and page right-click actions.

**Files:**
- Create: `apps/web/src/pages/blogs/components/context-menu.tsx`

- [ ] **Step 1: Create `context-menu.tsx`**

```typescript
import { useEffect, useRef } from 'react';
import { view } from '@rabjs/react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu = view(({ visible, x, y, items, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 40 - 20);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg py-1 min-w-[140px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors ${
            item.danger
              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
          }`}
        >
          {item.icon && <span className="w-4 h-4">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/components/context-menu.tsx
git commit -m "feat(web): create reusable context menu component"
```

---

## Chunk 7: Refactor Main blogs.tsx

**Goal:** Refactor `blogs.tsx` to use the new sidebar + content components and manage the three-state UI.

**Files:**
- Modify: `apps/web/src/pages/blogs/blogs.tsx`

- [ ] **Step 1: Read the current `blogs.tsx` structure**

Current structure at lines 1-260 shows:
- Uses `TagFilter`, status tabs, pagination
- `BlogCard` click navigates to editor
- Single column layout with sidebar

- [ ] **Step 2: Rewrite `blogs.tsx` with new state management**

Key changes:
1. Remove TagFilter, status tabs, pagination
2. Add state: `contentMode` ('recent' | 'directory' | 'preview')
3. Add state: `selectedPageId`, `selectedDirectoryId`
4. Add state: `searchModalVisible`
5. Add state: `directoryBlogs` (blogs in selected directory)
6. Update `BlogCard` to accept `onClick` prop instead of navigating directly
7. Integrate all new components

```typescript
import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { BlogService } from '../../services/blog.service';
import { DirectoryService } from '../../services/directory.service';
import { ToastService } from '../../services/toast.service';
import { Sidebar } from './components/sidebar';
import { ContentArea } from './components/content';
import { SearchModal } from './components/search-modal';
import { ContextMenu } from './components/context-menu';

type ContentMode = 'recent' | 'directory' | 'preview';

export const BlogListPage = view(() => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const toastService = useService(ToastService);

  // UI State
  const [contentMode, setContentMode] = useState<ContentMode>('recent');
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [directoryBlogs, setDirectoryBlogs] = useState<any[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: 'directory' | 'page';
    data: any;
  }>({ visible: false, x: 0, y: 0, type: 'directory', data: null });

  // Expanded directories for tree
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Load recent blogs on mount
  useEffect(() => {
    directoryService.loadDirectories();
    blogService.loadBlogs({ pageSize: 1000 }); // Load all for recent
  }, []);

  // Load blogs when directory is selected
  useEffect(() => {
    if (selectedDirectoryId) {
      setDirectoryLoading(true);
      blogService
        .loadBlogs({ directoryId: selectedDirectoryId, pageSize: 1000 })
        .finally(() => setDirectoryLoading(false));
    }
  }, [selectedDirectoryId]);

  // Load full blog content when entering preview
  useEffect(() => {
    if (selectedPageId) {
      blogService.loadBlog(selectedPageId);
    }
  }, [selectedPageId]);

  // Create new blog
  const handleCreateBlog = async (directoryId?: string) => {
    setIsCreating(true);
    try {
      const blog = await blogService.createBlog(
        { title: '未命名博客', excerpt: '' },
        directoryId
      );
      if (blog) {
        toastService.success('博客创建成功');
        // Navigate to editor
        window.location.href = `/blogs/${blog.id}/editor`;
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Create new directory
  const handleCreateDirectory = async (parentId?: string | null) => {
    const name = prompt('请输入目录名称：');
    if (!name?.trim()) return;

    const result = await directoryService.createDirectory({
      name: name.trim(),
      parentId: parentId || undefined,
    });

    if (result) {
      toastService.success('目录创建成功');
      if (parentId) {
        setExpandedDirs((prev) => new Set([...prev, parentId]));
      }
    }
  };

  // Rename directory
  const handleRenameDirectory = async (directoryId: string, currentName: string) => {
    const name = prompt('请输入新名称：', currentName);
    if (!name?.trim() || name === currentName) return;

    await directoryService.updateDirectory(directoryId, { name: name.trim() });
    toastService.success('目录已重命名');
  };

  // Delete directory
  const handleDeleteDirectory = async (directoryId: string) => {
    if (!confirm('确定要删除该目录吗？')) return;

    const success = await directoryService.deleteDirectory(directoryId);
    if (success) {
      toastService.success('目录已删除');
      if (selectedDirectoryId === directoryId) {
        setSelectedDirectoryId(null);
        setContentMode('recent');
      }
    }
  };

  // Delete blog
  const handleDeleteBlog = async (blogId: string) => {
    if (!confirm('确定要删除该博客吗？')) return;

    const success = await blogService.deleteBlog(blogId);
    if (success) {
      toastService.success('博客已删除');
      if (selectedPageId === blogId) {
        setSelectedPageId(null);
        setContentMode('recent');
      }
    }
  };

  // Move blog
  const handleMoveBlog = async (blogId: string, targetDirectoryId: string) => {
    const success = await blogService.moveBlog(blogId, targetDirectoryId);
    if (success) {
      toastService.success('博客已移动');
    }
  };

  // Handle directory selection
  const handleSelectDirectory = (directoryId: string | null) => {
    setSelectedDirectoryId(directoryId);
    setSelectedPageId(null);
    setContentMode(directoryId ? 'directory' : 'recent');
  };

  // Handle page selection (enter preview)
  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
    setContentMode('preview');
  };

  // Handle back navigation
  const handleBackToRecent = () => {
    setSelectedDirectoryId(null);
    setSelectedPageId(null);
    setContentMode('recent');
  };

  const handleBackToDirectory = () => {
    setSelectedPageId(null);
    setContentMode(selectedDirectoryId ? 'directory' : 'recent');
  };

  // Expand directory in tree and load blogs
  const handleExpandDirectory = (directoryId: string) => {
    setExpandedDirs((prev) => new Set([...prev, directoryId]));
    // Load blogs for this directory if not already loaded
    if (!expandedDirs.has(directoryId)) {
      // The directory tree component will handle loading
    }
  };

  // Context menu handlers
  const handleContextMenuDirectory = (e: React.MouseEvent, node: any) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'directory',
      data: node,
    });
  };

  const handleContextMenuPage = (e: React.MouseEvent, blog: any) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'page',
      data: blog,
    });
  };

  // Context menu items
  const getDirectoryContextMenuItems = () => [
    {
      label: '新建博客',
      onClick: () => handleCreateBlog(contextMenu.data?.id),
    },
    {
      label: '新建子目录',
      onClick: () => handleCreateDirectory(contextMenu.data?.id),
    },
    {
      label: '重命名',
      onClick: () => handleRenameDirectory(contextMenu.data?.id, contextMenu.data?.name),
    },
    {
      label: '删除',
      danger: true,
      onClick: () => handleDeleteDirectory(contextMenu.data?.id),
    },
  ];

  const getPageContextMenuItems = () => [
    {
      label: '在编辑器中打开',
      onClick: () => {
        window.location.href = `/blogs/${contextMenu.data?.id}/editor`;
      },
    },
    {
      label: '移动到',
      onClick: () => {
        const targetId = prompt('请输入目标目录ID：');
        if (targetId) {
          handleMoveBlog(contextMenu.data?.id, targetId);
        }
      },
    },
    {
      label: '删除',
      danger: true,
      onClick: () => handleDeleteBlog(contextMenu.data?.id),
    },
  ];

  return (
    <Layout>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <div className="w-[240px] flex-shrink-0">
          <Sidebar
            selectedDirectoryId={selectedDirectoryId}
            selectedPageId={selectedPageId}
            onSelectDirectory={handleSelectDirectory}
            onSelectPage={handleSelectPage}
            onSearchClick={() => setSearchModalVisible(true)}
            onNewBlog={() => handleCreateBlog(selectedDirectoryId)}
            onNewDirectory={() => handleCreateDirectory(null)}
            onContextMenuDirectory={handleContextMenuDirectory}
            onContextMenuPage={handleContextMenuPage}
          />
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-dark-900 p-6">
          <ContentArea
            mode={contentMode}
            selectedDirectoryId={selectedDirectoryId}
            selectedPageId={selectedPageId}
            directoryBlogs={blogService.blogs}
            directoryLoading={directoryLoading}
            onBackToRecent={handleBackToRecent}
            onBackToDirectory={handleBackToDirectory}
            onSelectPage={handleSelectPage}
          />
        </div>

        {/* Search Modal */}
        <SearchModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
          onSelectPage={handleSelectPage}
          onExpandDirectory={handleExpandDirectory}
        />

        {/* Context Menu */}
        <ContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.type === 'directory' ? getDirectoryContextMenuItems() : getPageContextMenuItems()}
          onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        />
      </div>
    </Layout>
  );
});
```

- [ ] **Step 2: Modify `BlogCard` to accept `onClick` prop**

Update `apps/web/src/pages/blogs/components/blog-card.tsx` to accept optional `onClick` prop instead of always navigating:

```typescript
interface BlogCardProps {
  blog: BlogDto;
  directoryName?: string;
  onClick?: () => void;  // Add this
}

// In the component, replace navigate call with onClick:
const handleClick = () => {
  if (onClick) {
    onClick();
  } else {
    navigate(`/blogs/${blog.id}/editor`);
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/blogs.tsx apps/web/src/pages/blogs/components/blog-card.tsx
git commit -m "refactor(web): rewrite blogs page with wiki layout"
```

---

## Chunk 8: Cleanup

**Goal:** Remove deprecated components (TagFilter, old directory-tree) and clean up imports.

**Files to delete:**
- `apps/web/src/pages/blogs/components/tag-filter.tsx` (DELETE)
- `apps/web/src/pages/blogs/components/directory-tree.tsx` should already be replaced

- [ ] **Step 1: Delete `tag-filter.tsx`**

```bash
rm apps/web/src/pages/blogs/components/tag-filter.tsx
```

- [ ] **Step 2: Verify no broken imports**

Check if `tag-filter.tsx` is imported anywhere:
```bash
grep -r "tag-filter" apps/web/src/
```

- [ ] **Step 3: Commit cleanup**

```bash
git add -A
git commit -m "chore(web): remove deprecated tag-filter component"
```

---

## Chunk 9: Verification

**Goal:** Verify the implementation compiles and works correctly.

- [ ] **Step 1: Run TypeScript check**

```bash
cd apps/web && pnpm typecheck
```

Expected: No TypeScript errors

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: No lint errors (or only pre-existing ones)

- [ ] **Step 3: Test the app**

Start the dev server and verify:
1. Sidebar shows search button, directory tree, and action buttons
2. Clicking directory shows page list in content area
3. Clicking page shows preview
4. Search modal opens and works
5. Right-click context menus work on directories and pages

- [ ] **Step 4: Commit final verification**

```bash
git add -A
git commit -m "verify: wiki blog layout implementation"
```

---

## Summary

| Chunk | Description | Files Changed |
|-------|-------------|---------------|
| 1 | BlogService API updates | `blog.service.ts` |
| 2 | Sidebar components | `components/sidebar/*` |
| 3 | DirectoryTree with page nodes | `directory-tree.tsx` |
| 4 | Content area components | `components/content/*` |
| 5 | Search modal | `search-modal.tsx` |
| 6 | Context menu | `context-menu.tsx` |
| 7 | Main blogs.tsx refactor | `blogs.tsx`, `blog-card.tsx` |
| 8 | Cleanup | Delete `tag-filter.tsx` |
| 9 | Verification | - |

Total: ~9 commits
