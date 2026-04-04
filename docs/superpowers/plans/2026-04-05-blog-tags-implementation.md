# Blog Tags Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete tag management to the blog system: sidebar tag tab, inline editor tag selector, and tag-based filtering.

**Architecture:** This feature introduces a new sidebar tab ("标签") and refactors the inline tag display in the blog editor. The TagService already exists with basic CRUD - we extend it with search/filter methods. Tag selection in the editor moves from a simple list to a proper popover selector. The main blogs page gains tag filtering via URL params.

**Tech Stack:** React 19, @rabjs/react (Service pattern), Tailwind CSS, TipTap Editor, Lucide icons

---

## Chunk 1: TagService Enhancement

Extend TagService with search and filter capabilities, plus helper methods for computing tag usage counts.

**Files:**
- Modify: `apps/web/src/services/tag.service.ts`

- [ ] **Step 1: Add searchTags method to TagService**

Locate the class definition around line 10. Add these methods after the existing `deleteTag` method (after line 78):

```typescript
/**
 * Search tags by name (case-insensitive contains match)
 */
searchTags(query: string): TagDto[] {
  if (!query.trim()) return this.tags;
  const lowerQuery = query.toLowerCase();
  return this.tags.filter(tag =>
    tag.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get tag by ID
 */
getTagById(id: string): TagDto | undefined {
  return this.tags.find(t => t.id === id);
}

/**
 * Check if tag name already exists (for validation)
 */
isTagNameTaken(name: string, excludeId?: string): boolean {
  const lowerName = name.toLowerCase().trim();
  return this.tags.some(t =>
    t.name.toLowerCase() === lowerName && t.id !== excludeId
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/web && pnpm typecheck 2>&1 | head -30`
Expected: No errors related to tag.service.ts

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/services/tag.service.ts
git commit -m "feat(web): add search and filter methods to TagService"
```

---

## Chunk 2: SidebarTabs - Add Tags Tab

Add the "标签" tab button alongside existing "目录" and "最近" tabs.

**Files:**
- Modify: `apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx`

- [ ] **Step 1: Update SidebarTabs type and add Tags button**

Replace the entire file content:

```tsx
import { Folder, Clock, Tag } from 'lucide-react';

type SidebarTab = 'directory' | 'recent' | 'tags';

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export const SidebarTabs = ({ activeTab, onTabChange }: SidebarTabsProps) => {
  return (
    <div role="tablist" className="flex px-3 border-b border-gray-100 dark:border-zinc-800">
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'directory'}
        onClick={() => onTabChange('directory')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-150 cursor-pointer ${
          activeTab === 'directory'
            ? 'border-green-500 text-green-600 dark:text-green-400'
            : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
        }`}
      >
        <Folder className="w-4 h-4" />
        目录
      </button>
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'recent'}
        onClick={() => onTabChange('recent')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-150 cursor-pointer ${
          activeTab === 'recent'
            ? 'border-green-500 text-green-600 dark:text-green-400'
            : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
        }`}
      >
        <Clock className="w-4 h-4" />
        最近
      </button>
      <button
        role="tab"
        type="button"
        aria-selected={activeTab === 'tags'}
        onClick={() => onTabChange('tags')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-150 cursor-pointer ${
          activeTab === 'tags'
            ? 'border-green-500 text-green-600 dark:text-green-400'
            : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
        }`}
      >
        <Tag className="w-4 h-4" />
        标签
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Verify type compatibility with parent components**

The parent `Sidebar` component uses `activeTab: 'directory' | 'recent'`. This change requires updating the parent type as well. We'll do that in Chunk 3.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx
git commit -m "feat(web): add tags tab to sidebar"
```

---

## Chunk 3: TagPanel Component (New)

Create the TagPanel component that displays in the sidebar when the Tags tab is active.

**Files:**
- Create: `apps/web/src/pages/blogs/components/sidebar/tag-panel.tsx`
- Create: `apps/web/src/pages/blogs/components/sidebar/tag-modal.tsx`
- Create: `apps/web/src/pages/blogs/components/sidebar/tag-item.tsx`

### Step 1: Create TagItem component

**Files:**
- Create: `apps/web/src/pages/blogs/components/sidebar/tag-item.tsx`

```tsx
import { view } from '@rabjs/react';
import { Pencil, Trash2 } from 'lucide-react';
import type { TagDto } from '@x-console/dto';

interface TagItemProps {
  tag: TagDto;
  blogCount: number;
  isSelected: boolean;
  onSelect: (tagId: string) => void;
  onEdit: (tag: TagDto) => void;
  onDelete: (tagId: string) => void;
}

export const TagItem = view(({
  tag,
  blogCount,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: TagItemProps) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(tag.id)}
      className={`group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-all duration-150 w-full text-left rounded-lg ${
        isSelected
          ? 'bg-green-50/60 dark:bg-green-900/20 text-green-600 dark:text-green-400'
          : 'hover:bg-green-50/80 dark:hover:bg-green-900/20 text-gray-700 dark:text-zinc-300'
      }`}
    >
      {/* Color dot */}
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: tag.color }}
      />

      {/* Tag name */}
      <span className="flex-1 truncate text-xs">{tag.name}</span>

      {/* Blog count */}
      <span className="text-xs opacity-50">({blogCount})</span>

      {/* Hover actions */}
      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(tag); }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded"
          title="编辑标签"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(tag.id); }}
          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded"
          title="删除标签"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </button>
  );
});
```

### Step 2: Create TagModal component

**Files:**
- Create: `apps/web/src/pages/blogs/components/sidebar/tag-modal.tsx`

```tsx
import { useState, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { X } from 'lucide-react';
import type { TagDto, CreateTagDto } from '@x-console/dto';
import { TagService } from '../../../../services/tag.service';

const PRESET_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#ef4444', // red
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
  '#14b8a6', // teal
];

interface TagModalProps {
  visible: boolean;
  tag?: TagDto | null;
  onClose: () => void;
  onSave: (data: CreateTagDto) => void;
}

export const TagModal = view(({ visible, tag, onClose, onSave }: TagModalProps) => {
  const tagService = useService(TagService);

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or tag changes
  useEffect(() => {
    if (visible) {
      setName(tag?.name || '');
      setColor(tag?.color || PRESET_COLORS[0]);
      setError(null);
    }
  }, [visible, tag]);

  const handleSave = () => {
    const trimmedName = name.trim();

    // Validation
    if (!trimmedName) {
      setError('标签名称不能为空');
      return;
    }
    if (trimmedName.length > 20) {
      setError('标签名称不能超过20个字符');
      return;
    }
    if (tagService.isTagNameTaken(trimmedName, tag?.id)) {
      setError('该标签名称已存在');
      return;
    }

    onSave({ name: trimmedName, color });
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {tag ? '编辑标签' : '新建标签'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1.5">
              名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="输入标签名称"
              maxLength={20}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400"
            />
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* Preset colors */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1.5">
              颜色
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === presetColor
                      ? 'ring-2 ring-offset-2 ring-green-500 scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>

          {/* Custom color */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">自定义:</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 px-2 py-1 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-green-500/50 text-gray-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:shadow-[0_4px_12px_rgba(34,197,94,0.4)] hover:-translate-y-0.5 transition-all"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
});
```

### Step 3: Create TagPanel component

**Files:**
- Create: `apps/web/src/pages/blogs/components/sidebar/tag-panel.tsx`

```tsx
import { useState, useMemo } from 'react';
import { view, useService } from '@rabjs/react';
import { Search, Plus } from 'lucide-react';
import { TagService } from '../../../../services/tag.service';
import { BlogService } from '../../../../services/blog.service';
import type { TagDto, CreateTagDto } from '@x-console/dto';
import { TagItem } from './tag-item';
import { TagModal } from './tag-modal';

interface TagPanelProps {
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
}

export const TagPanel = view(({ selectedTagId, onSelectTag }: TagPanelProps) => {
  const tagService = useService(TagService);
  const blogService = useService(BlogService);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDto | null>(null);

  // Compute blog count per tag
  const tagBlogCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    blogService.blogs.forEach((blog) => {
      blog.tags?.forEach((tag) => {
        counts[tag.id] = (counts[tag.id] || 0) + 1;
      });
    });
    return counts;
  }, [blogService.blogs]);

  // Filter tags by search
  const filteredTags = useMemo(() => {
    return tagService.searchTags(searchQuery);
  }, [tagService.tags, searchQuery]);

  // Total blog count (for "All" option)
  const totalBlogCount = blogService.blogs.length;

  const handleCreateTag = async (data: CreateTagDto) => {
    if (editingTag) {
      await tagService.updateTag(editingTag.id, data);
    } else {
      await tagService.createTag(data);
    }
    setEditingTag(null);
  };

  const handleEditTag = (tag: TagDto) => {
    setEditingTag(tag);
    setModalVisible(true);
  };

  const handleDeleteTag = async (tagId: string) => {
    const blogCount = tagBlogCounts[tagId] || 0;
    const confirmed = window.confirm(
      blogCount > 0
        ? `该标签被 ${blogCount} 篇博客使用，删除后将从这些博客中移除。确定删除吗？`
        : `确定要删除该标签吗？`
    );
    if (confirmed) {
      await tagService.deleteTag(tagId);
      if (selectedTagId === tagId) {
        onSelectTag(null);
      }
    }
  };

  const handleSelectTag = (tagId: string) => {
    if (selectedTagId === tagId) {
      onSelectTag(null); // Deselect
    } else {
      onSelectTag(tagId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Tag list */}
      <div className="flex-1 overflow-auto py-1 px-2">
        {/* All blogs option */}
        <button
          type="button"
          onClick={() => onSelectTag(null)}
          className={`group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-all duration-150 w-full text-left rounded-lg mb-1 ${
            selectedTagId === null
              ? 'bg-green-50/60 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              : 'hover:bg-green-50/80 dark:hover:bg-green-900/20 text-gray-700 dark:text-zinc-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 dark:border-zinc-600 flex-shrink-0" />
          <span className="flex-1 text-xs font-medium">全部</span>
          <span className="text-xs opacity-50">({totalBlogCount})</span>
        </button>

        {/* Tags */}
        {filteredTags.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-zinc-500">
            {searchQuery ? '未找到匹配的标签' : '暂无标签'}
          </div>
        ) : (
          filteredTags.map((tag) => (
            <TagItem
              key={tag.id}
              tag={tag}
              blogCount={tagBlogCounts[tag.id] || 0}
              isSelected={selectedTagId === tag.id}
              onSelect={handleSelectTag}
              onEdit={handleEditTag}
              onDelete={handleDeleteTag}
            />
          ))
        )}
      </div>

      {/* Create button */}
      <div className="px-2 py-2 border-t border-gray-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => { setEditingTag(null); setModalVisible(true); }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-green-50/80 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          新建标签
        </button>
      </div>

      {/* Modal */}
      <TagModal
        visible={modalVisible}
        tag={editingTag}
        onClose={() => { setModalVisible(false); setEditingTag(null); }}
        onSave={handleCreateTag}
      />
    </div>
  );
});
```

- [ ] **Step 4: Commit all new files**

```bash
git add apps/web/src/pages/blogs/components/sidebar/tag-item.tsx \
        apps/web/src/pages/blogs/components/sidebar/tag-modal.tsx \
        apps/web/src/pages/blogs/components/sidebar/tag-panel.tsx
git commit -m "feat(web): add TagPanel, TagModal, and TagItem components"
```

---

## Chunk 4: Integrate TagPanel into Sidebar

Wire the TagPanel into the Sidebar component and update the activeTab type.

**Files:**
- Modify: `apps/web/src/pages/blogs/components/sidebar/index.tsx`

- [ ] **Step 1: Update Sidebar component to support tags tab**

Replace the SidebarProps interface and the activeTab conditional rendering:

**Change the interface (around line 9-23):**
```tsx
interface SidebarProps {
  activeTab: 'directory' | 'recent' | 'tags';
  onTabChange: (tab: 'directory' | 'recent' | 'tags') => void;
  selectedDirectoryId: string | null;
  selectedBlogId: string | null;
  selectedTagId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectBlog: (blogId: string) => void;
  onSelectTag: (tagId: string | null) => void;
  onSearchClick: () => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
  onContextMenuDirectory?: (e: React.MouseEvent, nodeId: string, nodeName: string) => void;
  onContextMenuPage?: (e: React.MouseEvent, blogId: string) => void;
  onExpandDirectory?: (directoryId: string) => void;
  initialExpandedIds?: string[];
}
```

**Add TagPanel import:**
```tsx
import { TagPanel } from './tag-panel';
```

**Add to the component props destructuring:**
```tsx
const TagPanelProps = {
  selectedTagId: props.selectedTagId,
  onSelectTag: props.onSelectTag,
};
```

**Add TagPanel import at top of file (keep existing imports, add TagPanel):**
```tsx
import { TagPanel } from './tag-panel';
```

**Add TagPanel to conditional rendering (after RecentBlogList):**
```tsx
) : (
  <TagPanel {...TagPanelProps} />
)}
```

- [ ] **Step 2: Verify component renders without error**

Run: `cd apps/web && pnpm dev 2>&1 | head -20` (then Ctrl+C after confirming no errors)
Expected: Dev server starts without TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/sidebar/index.tsx
git commit -m "feat(web): integrate TagPanel into Sidebar"
```

---

## Chunk 5: Wire Tag Filtering in blogs.tsx

Add selectedTagId state and tag filtering logic to the main blogs page.

**Files:**
- Modify: `apps/web/src/pages/blogs/blogs.tsx`

- [ ] **Step 1: Add tag-related state and handlers**

**Add to state declarations (after line 31):**
```tsx
const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
```

**Add tag selection handler (after handleSelectDirectory ~line 96):**
```tsx
// Select tag for filtering
const handleSelectTag = useCallback((tagId: string | null) => {
  setSelectedTagId(tagId);
}, []);
```

**Update the useEffect for blog loading to handle tag filtering (replace lines 46-57):**
```tsx
// Load blogs when directory or tag selection changes
useEffect(() => {
  if (selectedTagId) {
    // Filter by tag
    blogService.loadBlogs({ tagId: selectedTagId, pageSize: 1000 });
  } else if (selectedDirectoryId) {
    setDirectoryLoading(true);
    blogService
      .loadBlogs({ directoryId: selectedDirectoryId, pageSize: 1000 })
      .finally(() => setDirectoryLoading(false));
  } else {
    // Load all blogs when viewing all
    blogService.loadBlogs({ pageSize: 1000 });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDirectoryId, selectedTagId]);
```

**Update Sidebar props (around line 145):**
```tsx
<Sidebar
  activeTab={activeTab}
  onTabChange={setActiveTab}
  selectedBlogId={selectedBlogId || null}
  selectedTagId={selectedTagId}
  onSelectBlog={handleSelectPage}
  initialExpandedIds={initialExpandedIds}
  selectedDirectoryId={selectedDirectoryId}
  onSelectDirectory={handleSelectDirectory}
  onSelectTag={handleSelectTag}
  onSearchClick={() => setSearchModalVisible(true)}
  onNewBlog={(dirId) => handleCreateBlog(dirId ?? selectedDirectoryId)}
  onNewDirectory={(parentId) => handleCreateDirectory(parentId)}
/>
```

- [ ] **Step 2: Verify build passes**

Run: `cd apps/web && pnpm build 2>&1 | tail -30`
Expected: Build completes without errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/blogs.tsx
git commit -m "feat(web): add tag filtering to blog list page"
```

---

## Chunk 6: Editor Tag Selector (TagSelector)

Refactor the inline tag display in BlogEditorContent into a proper TagSelector component with popover.

**Files:**
- Create: `apps/web/src/pages/blogs/components/blog-editor/tag-selector.tsx`
- Modify: `apps/web/src/pages/blogs/components/blog-editor/blog-editor-content.tsx`

### Step 1: Create TagSelector component

**Files:**
- Create: `apps/web/src/pages/blogs/components/blog-editor/tag-selector.tsx`

```tsx
import { useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { Plus, X, Check } from 'lucide-react';
import { TagService } from '../../../../services/tag.service';
import { BlogEditorService } from './blog-editor.service';
import type { TagDto, CreateTagDto } from '@x-console/dto';

const PRESET_COLORS = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b',
  '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6',
];

export const TagSelector = view(() => {
  const tagService = useService(TagService);
  const blogEditor = useService(BlogEditorService);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedTags = tagService.tags.filter((t) =>
    blogEditor.selectedTagIds.includes(t.id)
  );

  const filteredTags = tagService.searchTags(searchQuery);

  const handleToggleTag = (tagId: string) => {
    blogEditor.toggleTag(tagId);
  };

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed || trimmed.length > 20) return;
    if (tagService.isTagNameTaken(trimmed)) return;

    const tag = await tagService.createTag({ name: trimmed, color: newTagColor });
    if (tag) {
      blogEditor.toggleTag(tag.id);
      setNewTagName('');
      setNewTagColor(PRESET_COLORS[0]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    blogEditor.toggleTag(tagId);
  };

  return (
    <div className="relative inline-flex items-center gap-2 flex-wrap">
      {/* Selected tags display */}
      {selectedTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          <button
            type="button"
            onClick={() => handleRemoveTag(tag.id)}
            className="hover:bg-white/20 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-full transition-colors"
      >
        <Plus className="w-3 h-3" />
        {blogEditor.isPreview ? '添加标签' : '添加'}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 z-50 overflow-hidden"
        >
          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-zinc-800">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标签..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400"
            />
          </div>

          {/* Tag list */}
          <div className="max-h-48 overflow-auto p-1">
            {filteredTags.length === 0 && !searchQuery && (
              <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-zinc-500">
                暂无标签
              </div>
            )}
            {filteredTags.length === 0 && searchQuery && (
              <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-zinc-500">
                未找到匹配的标签
              </div>
            )}
            {filteredTags.map((tag) => {
              const isSelected = blogEditor.selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleTag(tag.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-green-50/60 dark:bg-green-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-left text-xs text-gray-700 dark:text-zinc-300 truncate">
                    {tag.name}
                  </span>
                  {isSelected && (
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick create */}
          <div className="p-2 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                placeholder="新建标签..."
                maxLength={20}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || newTagName.trim().length > 20}
                className="px-2 py-1.5 text-xs font-medium text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
```

### Step 2: Update BlogEditorContent to use TagSelector

**Files:**
- Modify: `apps/web/src/pages/blogs/components/blog-editor/blog-editor-content.tsx`

Replace the entire file content:

```tsx
import { observer, useService } from '@rabjs/react';
import { EditorContent, Editor } from '@tiptap/react';
import { BlogEditorService } from './blog-editor.service';
import { TagSelector } from './tag-selector';

interface BlogEditorContentProps {
  editor: Editor | null;
}

export const BlogEditorContent = observer(({ editor }: BlogEditorContentProps) => {
  const blogEditor = useService(BlogEditorService);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mt-6">
      {/* Title */}
      {blogEditor.isPreview ? (
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-50">{blogEditor.title}</h1>
      ) : (
        <input
          type="text"
          value={blogEditor.title}
          onChange={(e) => blogEditor.handleTitleChange(e.target.value)}
          onBlur={() => blogEditor.saveTitleImmediately()}
          placeholder="博客标题"
          className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 text-gray-900 dark:text-zinc-50"
        />
      )}

      {/* Meta info row */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-zinc-400">{blogEditor.wordCount} 字</span>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-zinc-400">标签:</span>
          <TagSelector />
        </div>
      </div>

      {/* Editor Content */}
      <div className={blogEditor.isPreview ? 'prose dark:prose-invert max-w-none' : ''}>
        <EditorContent editor={editor} className={blogEditor.isPreview ? '' : 'min-h-[400px]'} />
      </div>

      {/* Empty state placeholder */}
      {!blogEditor.isPreview && !editor?.getText() && (
        <div className="text-center py-12 text-gray-400 dark:text-zinc-600 pointer-events-none">
          开始写作...
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 3: Verify build**

Run: `cd apps/web && pnpm build 2>&1 | tail -40`
Expected: Build completes successfully

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-editor/tag-selector.tsx \
        apps/web/src/pages/blogs/components/blog-editor/blog-editor-content.tsx
git commit -m "feat(web): add TagSelector popover to blog editor"
```

---

## Chunk 7: Load Tags on App Start

Ensure TagService is initialized with tags when the app loads.

**Files:**
- Modify: `apps/web/src/pages/blogs/blogs.tsx`

- [ ] **Step 1: Load tags when BlogListPage mounts**

Add tagService.loadTags() to the useEffect that loads directories (around line 38-43):

```tsx
// Load directories and tags on mount
useEffect(() => {
  directoryService.loadDirectories();
  tagService.loadTags(); // Load tags for sidebar
  blogService.loadBlogs({ pageSize: 20 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Make sure to add tagService to the service declarations at the top of the component:
```tsx
const tagService = useService(TagService);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/blogs.tsx
git commit -m "feat(web): load tags on blog list page mount"
```

---

## Final Verification

- [ ] Run full type check: `cd apps/web && pnpm typecheck`
- [ ] Run lint: `pnpm lint`
- [ ] Test the feature manually by running `pnpm dev:web` and:
  1. Click the "标签" tab in the sidebar
  2. Create a new tag
  3. Edit and delete the tag
  4. Click a tag to filter blogs
  5. Open a blog and add/remove tags via the editor
  6. Create a new tag from the editor's tag selector
