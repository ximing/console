# Blog 编辑器统一实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `PagePreview` 和 `InlineBlogEditor` 合并为单一 `BlogEditorPage` 组件，通过 `isPreview` 状态切换预览/编辑模式

**Architecture:** 创建统一的 BlogEditorPage 组件，整合编辑和预览功能。Header 包含面包屑、时间信息、button group 切换、subdued 风格操作按钮。内容区域根据模式渲染编辑器或预览。

**Tech Stack:** React, Tiptap, @rabjs/react, Tailwind CSS

---

## 文件结构

```
修改: apps/web/src/pages/blogs/components/content/page-preview.tsx       -> 删除
修改: apps/web/src/pages/blogs/components/content/inline-blog-editor.tsx -> 删除
创建: apps/web/src/pages/blogs/components/blog-editor-page.tsx           -> 统一组件
修改: apps/web/src/pages/blogs/blogs.tsx                                -> 更新路由
```

---

## Chunk 1: 创建 BlogEditorPage 基础结构

**目标:** 创建 BlogEditorPage 组件，整合 PagePreview 和 InlineBlogEditor 的状态管理

**文件:**
- 创建: `apps/web/src/pages/blogs/components/blog-editor-page.tsx`

- [ ] **Step 1: 创建基础组件结构**

```tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { view, useService, raw } from '@rabjs/react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Loader2, Save, Send, ArrowLeft, Eye, Edit2 } from 'lucide-react';
import slugify from 'slugify';
import { BlogService } from '../../../services/blog.service';
import { DirectoryService } from '../../../services/directory.service';
import { TagService } from '../../../services/tag.service';
import { ToastService } from '../../../services/toast.service';
import { EditorToolbar } from '../editor-toolbar';
import { previewExtensions, inlineEditableExtensions, MAX_EXCERPT_LENGTH } from '../../editor/tiptap.config';
import type { BlogDto } from '@x-console/dto';

interface BlogEditorPageProps {
  pageId: string;
  onBack: () => void;
}

export const BlogEditorPage = view(({ pageId, onBack }: BlogEditorPageProps) => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const tagService = useService(TagService);
  const toastService = useService(ToastService);

  // 模式状态: true = 预览模式, false = 编辑模式
  const [isPreview, setIsPreview] = useState(true);

  // ... 后续步骤补充完整代码
```

- [ ] **Step 2: 运行 typecheck 验证**

Run: `cd apps/web && pnpm typecheck 2>&1 | head -50`
Expected: 无 import 错误

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-page.tsx
git commit -m "feat(blogs): create BlogEditorPage base structure"
```

---

## Chunk 2: 实现 Header 和预览/编辑切换

**目标:** 实现统一 Header，包含面包屑、时间信息、button group 切换、subdued 操作按钮

**文件:**
- 修改: `apps/web/src/pages/blogs/components/blog-editor-page.tsx`

- [ ] **Step 1: 添加 Header 组件代码**

在 BlogEditorPage 中添加 Header JSX:

```tsx
{/* Header */}
<div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-dark-700 shrink-0">
  <div className="flex items-center gap-3">
    <button
      onClick={onBack}
      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
      title="返回列表"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>

    {/* 面包屑 */}
    <div className="flex flex-col">
      {getDirectoryPath() && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getDirectoryPath()} / {blog.title}
        </span>
      )}
    </div>

    {/* 时间信息 */}
    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 ml-4">
      <span>创建于 {formatDate(blog.createdAt)}</span>
      <span>修改于 {formatDate(blog.updatedAt)}</span>
    </div>
  </div>

  <div className="flex items-center gap-2">
    {/* Button Group: 预览/编辑切换 */}
    <div className="flex items-center">
      <button
        onClick={() => setIsPreview(true)}
        className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-l-lg border border-gray-300 dark:border-dark-600
          ${isPreview
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
          }`}
      >
        <Eye className="w-4 h-4 inline mr-1" />
        预览
      </button>
      <button
        onClick={() => setIsPreview(false)}
        className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-r-lg border-t border-b border-r border-gray-300 dark:border-dark-600 -ml-px
          ${!isPreview
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
          }`}
      >
        <Edit2 className="w-4 h-4 inline mr-1" />
        编辑
      </button>
    </div>

    {/* 操作按钮 */}
    <ActionButtons />
  </div>
</div>
```

- [ ] **Step 2: 添加 ActionButtons 组件和辅助函数**

```tsx
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getDirectoryPath = (): string => {
  if (!blog?.directoryId) return '';
  const dir = directoryService.directories.find((d) => d.id === blog.directoryId);
  return dir?.name || '';
};

const ActionButtons = () => {
  const handleSaveDraft = async () => { /* 实现保存草稿 */ };
  const handlePublish = async () => { /* 实现发布 */ };
  const handleDelete = () => { /* 实现删除 */ };

  return (
    <div className="flex items-center gap-1">
      {!isPreview && (
        <button
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
          title="保存草稿"
        >
          <Save className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={handlePublish}
        disabled={isPublishing}
        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
        title={blog?.status === 'published' ? '取消发布' : '发布'}
      >
        {blog?.status === 'published' ? <Loader2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
      </button>
      <button
        onClick={handleDelete}
        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-colors"
        title="删除"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
```

- [ ] **Step 3: 运行验证**

Run: `cd apps/web && pnpm typecheck 2>&1 | head -50`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-page.tsx
git commit -m "feat(blogs): add unified header with preview/edit toggle"
```

---

## Chunk 3: 实现内容区域

**目标:** 实现标题、字数/标签行、预览/编辑正文内容

**文件:**
- 修改: `apps/web/src/pages/blogs/components/blog-editor-page.tsx`

- [ ] **Step 1: 添加内容区域代码**

```tsx
{/* Toolbar - 仅编辑模式 */}
{!isPreview && editor && (
  <div className="shrink-0">
    <EditorToolbar editor={editor} blogId={blog.id} toastService={toastService} />
  </div>
)}

/* Scrollable Content Area */}
<div className="flex-1 overflow-auto">
  <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
    {/* 标题 */}
    {isPreview ? (
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {blog.title}
      </h1>
    ) : (
      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="博客标题"
        className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
      />
    )}

    {/* 元信息行: 字数 | 标签 */}
    <div className="flex flex-wrap items-center gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {editor?.getText().length || 0} 字
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">标签:</span>
        {tagService.tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => !isPreview && toggleTag(tag.id)}
            disabled={isPreview}
            className={`
              px-2 py-1 text-xs font-medium rounded-full transition-colors
              ${selectedTagIds.includes(tag.id)
                ? 'text-white'
                : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600'
              }
              ${isPreview ? 'cursor-default' : 'cursor-pointer'}
            `}
            style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
          >
            {tag.name}
          </button>
        ))}
        {!isPreview && tagService.tags.length > 0 && (
          <button
            onClick={() => { /* 显示添加标签输入框 */ }}
            className="px-2 py-1 text-xs font-medium rounded-full border border-dashed border-gray-300 dark:border-dark-600 text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors"
          >
            + 添加
          </button>
        )}
      </div>
    </div>

    {/* 正文区域 */}
    <div className="min-h-[400px]">
      <EditorContent editor={editor} className="min-h-[400px]" />
    </div>
  </div>
</div>
```

- [ ] **Step 2: 运行验证**

Run: `cd apps/web && pnpm typecheck 2>&1 | head -50`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-page.tsx
git commit -m "feat(blogs): add content area with title, meta info, and body"
```

---

## Chunk 4: 整合 PagePreview 和 InlineBlogEditor 的逻辑

**目标:** 将两个组件的所有功能（编辑器初始化、自动保存、标签操作、发布/保存等）整合到 BlogEditorPage

**文件:**
- 修改: `apps/web/src/pages/blogs/components/blog-editor-page.tsx`

- [ ] **Step 1: 添加编辑器初始化和内容加载逻辑**

参考 InlineBlogEditor 的 useEditor 和内容加载逻辑

- [ ] **Step 2: 添加自动保存逻辑**

参考 InlineBlogEditor 的 debouncedSave 逻辑

- [ ] **Step 3: 添加标签切换和保存逻辑**

- [ ] **Step 4: 添加发布和保存草稿逻辑**

- [ ] **Step 5: 运行验证并测试功能**

Run: `cd apps/web && pnpm typecheck 2>&1 | head -50`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-page.tsx
git commit -m "feat(blogs): integrate all editor functionality into BlogEditorPage"
```

---

## Chunk 5: 更新路由并移除旧组件

**目标:** 更新 blogs.tsx 路由使用新组件，删除旧组件

**文件:**
- 修改: `apps/web/src/pages/blogs/blogs.tsx`
- 删除: `apps/web/src/pages/blogs/components/content/page-preview.tsx`
- 删除: `apps/web/src/pages/blogs/components/content/inline-blog-editor.tsx`

- [ ] **Step 1: 更新路由**

```tsx
// 在 blogs.tsx 中
import { BlogEditorPage } from './components/blog-editor-page';

// 将
<Route path="preview/:id" element={<PagePreview ... />} />

// 替换为使用 BlogEditorPage
<Route path="editor/:id" element={<BlogEditorPage ... />} />
```

- [ ] **Step 2: 删除旧组件文件**

```bash
rm apps/web/src/pages/blogs/components/content/page-preview.tsx
rm apps/web/src/pages/blogs/components/content/inline-blog-editor.tsx
```

- [ ] **Step 3: 运行验证**

Run: `cd apps/web && pnpm typecheck 2>&1 | head -100`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(blogs): remove old PagePreview and InlineBlogEditor, use unified BlogEditorPage"
```

---

## 验证步骤

1. 启动开发服务器: `pnpm dev:web`
2. 导航到博客详情页
3. 验证 Header 显示面包屑、创建/修改时间
4. 点击"编辑"按钮，验证 toolbar 显示、内容可编辑
5. 点击"预览"按钮，验证切换回只读模式
6. 验证字数实时更新
7. 验证标签点击切换
8. 验证保存草稿、发布功能正常
