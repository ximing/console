# Blog Editor Page Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 665-line `blog-editor-page.tsx` into focused hooks and UI components by responsibility.

**Architecture:** Extract `useCollaboration` hook for Y.Doc/Provider/Awareness, `useBlogEditor` hook for blog state/handlers, `BlogEditorHeader` and `BlogEditorContent` UI components, then simplify `blog-editor-page.tsx` to a composition layer.

**Tech Stack:** React hooks, @rabjs/react (useService), @hocuspocus/provider, y-indexeddb, @tiptap/react

---

## Chunk 1: useCollaboration.ts

Extract all collaboration-related logic into a dedicated hook.

**Files:**
- Create: `apps/web/src/pages/blogs/hooks/useCollaboration.ts`
- Reference: `apps/web/src/pages/blogs/components/blog-editor-page.tsx:76-182` (Y.Doc, Provider, IndexedDB, awareness, cleanup)
- Reference: `apps/web/src/pages/blogs/editor/collaboration-provider.ts` (getUserColor)

- [ ] **Step 1: Create hooks directory and useCollaboration.ts skeleton**

```ts
import { useMemo, useEffect, useState } from 'react';
import { useService } from '@rabjs/react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import Collaboration from '@tiptap/extension-collaboration';
import { inlineEditableExtensions } from '../../editor/tiptap.config';
import { getUserColor } from '../../editor/collaboration-provider';
import { authService } from '../../../services/auth.service';
import type { Awareness } from 'y-protocols/awareness';
import type { Editor } from '@tiptap/react';
import type { Extension } from '@tiptap/core';

interface UseCollaborationOptions {
  pageId: string | undefined;
  blogUserId?: string;
}

export function useCollaboration({ pageId, blogUserId }: UseCollaborationOptions) {
  const token = authService.token || localStorage.getItem('aimo_token') || '';

  // Y.Doc - stable across renders
  const ydoc = useMemo(() => new Y.Doc(), []);

  // HocuspocusProvider
  const provider = useMemo(() => {
    if (!pageId) return null;
    const isHttp = location.origin.includes('http://');
    const wsUrl = isHttp
      ? `ws://localhost:3100/collaboration`
      : `${location.origin.replace(/^http/, 'ws')}/collaboration`;
    return new HocuspocusProvider({
      url: wsUrl,
      name: `blog:${pageId}`,
      document: ydoc,
      token,
      onAuthenticationFailed: () => setConnectionStatus('disconnected'),
      onSynced: () => setConnectionStatus('connected'),
      onDisconnect: () => setConnectionStatus('disconnected'),
      onConnect: () => setConnectionStatus('connecting'),
    });
  }, [pageId, ydoc, token]);

  // IndexedDB persistence
  const indexeddbProvider = useMemo(() => {
    if (!pageId) return null;
    return new IndexeddbPersistence(`blog-${pageId}`, ydoc);
  }, [pageId, ydoc]);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Awareness
  const awareness = provider?.awareness ?? null;

  // User info
  const userId = blogUserId || '';
  const userName = userId ? `User ${userId.slice(0, 6)}` : 'Guest';
  const userColor = getUserColor(userId);

  // Listen to provider status/error events
  useEffect(() => {
    if (!provider) return;
    const handleStatus = ({ status }: { status: string }) => {
      setConnectionStatus(status as 'connected' | 'disconnected' | 'connecting');
    };
    const handleError = () => setConnectionStatus('disconnected');
    provider.on('status', handleStatus);
    provider.on('error', handleError);
    return () => {
      provider.off('status', handleStatus);
      provider.off('error', handleError);
    };
  }, [provider]);

  // Set awareness user info
  useEffect(() => {
    if (!awareness || !userId) return;
    awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
      id: userId,
    });
  }, [awareness, userId, userName, userColor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      provider?.destroy();
      indexeddbProvider?.destroy();
      ydoc.destroy();
    };
  }, []);

  // Editor extensions
  const editorExtensions = useMemo((): Extension[] => {
    if (!provider) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return [...(inlineEditableExtensions as any)];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseExtensions = [...(inlineEditableExtensions as any)];
    baseExtensions.push(
      Collaboration.configure({ document: ydoc, provider })
    );
    return baseExtensions;
  }, [ydoc, provider]);

  return {
    ydoc,
    provider,
    indexeddbProvider,
    awareness,
    connectionStatus,
    editorExtensions,
    userId,
    userName,
    userColor,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm typecheck --filter @x-console/web 2>&1 | head -30`
Expected: No new errors related to useCollaboration

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/hooks/useCollaboration.ts
git commit -m "feat(web): extract useCollaboration hook

- Y.Doc, HocuspocusProvider, IndexedDB persistence
- Awareness user info and connection status
- Editor extensions with Collaboration support
- Proper cleanup on unmount

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: useBlogEditor.ts

Extract blog loading, state management, and action handlers.

**Files:**
- Create: `apps/web/src/pages/blogs/hooks/useBlogEditor.ts`
- Reference: `apps/web/src/pages/blogs/components/blog-editor-page.tsx:244-455` (blog loading, state, handlers)
- Reference: `apps/web/src/pages/blogs/editor/tiptap.config.ts` (MAX_EXCERPT_LENGTH, slugify)

- [ ] **Step 1: Create useBlogEditor.ts**

```ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useService } from '@rabjs/react';
import { useNavigate } from 'react-router';
import slugify from 'slugify';
import { MAX_EXCERPT_LENGTH } from '../../editor/tiptap.config';
import type { Editor } from '@tiptap/react';
import type { BlogDto } from '@x-console/dto';

interface UseBlogEditorOptions {
  pageId: string | undefined;
  editor: Editor | null | undefined;
}

export function useBlogEditor({ pageId, editor }: UseBlogEditorOptions) {
  const blogService = useService(BlogService);
  const tagService = useService(TagService);
  const toastService = useService(ToastService);
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);

  const blog = blogService.currentBlog;
  const wordCount = editor?.getText().length || 0;

  // Refs for debounce
  const titleRef = useRef('');
  const contentJsonRef = useRef<unknown>(undefined);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load blog on mount
  useEffect(() => {
    if (pageId) {
      setLoading(true);
      blogService.loadBlog(pageId).finally(() => setLoading(false));
    }
    tagService.loadTags();
  }, [pageId, blogService, tagService]);

  // Sync state when blog changes
  useEffect(() => {
    if (blog) {
      setTitle(blog.title);
      titleRef.current = blog.title;
      setSelectedTagIds(blog.tags.map((t) => t.id));
      contentJsonRef.current = blog.content;
    }
  }, [blog]);

  // Re-load when pageId changes to different blog
  useEffect(() => {
    if (pageId && blog && blog.id !== pageId) {
      setLoading(true);
      blogService.loadBlog(pageId).finally(() => setLoading(false));
    }
  }, [pageId, blog, blogService]);

  // Debounced save
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setLocalSaving(true);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await blogService.saveBlog(blog!.id, {
          title: titleRef.current,
          content: contentJsonRef.current,
          excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
          slug: slugify(titleRef.current, { lower: true, locale: 'zh', strict: false }),
        });
      } catch {
        toastService.error('保存失败');
      } finally {
        setLocalSaving(false);
      }
    }, 1000);
  }, [blog, blogService, editor, toastService]);

  // Handle title change
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      titleRef.current = newTitle;
      debouncedSave();
    },
    [debouncedSave]
  );

  // Sync content on editor update
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      contentJsonRef.current = editor.getJSON();
      debouncedSave();
    };
    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor, debouncedSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Toggle tag
  const toggleTag = useCallback(
    (tagId: string) => {
      const newTags = selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId];
      setSelectedTagIds(newTags);
      if (blog) blogService.updateBlog(blog.id, { tagIds: newTags });
    },
    [selectedTagIds, blog, blogService]
  );

  // Save as draft
  const handleSaveDraft = useCallback(async () => {
    if (!editor || !blog) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setLocalSaving(true);
    try {
      await blogService.saveBlog(blog.id, {
        title,
        content: editor.getJSON(),
        excerpt: editor.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'draft',
      });
      toastService.success('草稿保存成功');
    } finally {
      setLocalSaving(false);
    }
  }, [blog, title, editor, blogService, toastService]);

  // Publish blog
  const handlePublish = useCallback(async () => {
    if (!editor || !blog) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setIsPublishing(true);
    try {
      await blogService.saveBlog(blog.id, {
        title,
        content: editor.getJSON(),
        excerpt: editor.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'published',
      });
      const publishedBlog = await blogService.publishBlog(blog.id);
      if (publishedBlog) toastService.success('博客发布成功');
    } finally {
      setIsPublishing(false);
    }
  }, [blog, title, editor, blogService, toastService]);

  // Delete blog
  const handleDelete = useCallback(() => {
    if (!blog) return;
    if (window.confirm(`确定要删除博客 "${blog.title}" 吗？此操作不可撤销。`)) {
      blogService
        .deleteBlog(blog.id)
        .then(() => {
          toastService.success('博客已删除');
          navigate('/blogs');
        })
        .catch(() => toastService.error('删除失败'));
    }
  }, [blog, blogService, toastService, navigate]);

  return {
    blog,
    loading,
    title,
    selectedTagIds,
    isPreview,
    isPublishing,
    localSaving,
    wordCount,
    handleTitleChange,
    toggleTag,
    handleSaveDraft,
    handlePublish,
    handleDelete,
    setIsPreview,
  };
}
```

Note: The hook references `BlogService`, `TagService`, `ToastService` via `useService`. Ensure these imports are added.

- [ ] **Step 2: Verify build**

Run: `pnpm typecheck --filter @x-console/web 2>&1 | head -30`
Expected: No new errors related to useBlogEditor (may have missing import issues - fix those)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/hooks/useBlogEditor.ts
git commit -m "feat(web): extract useBlogEditor hook

- Blog loading, title/tag state management
- Debounced auto-save, manual save draft/publish
- Tag toggle, blog delete
- Editor update sync via ref

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: BlogEditorHeader.tsx

Extract the header UI section.

**Files:**
- Create: `apps/web/src/pages/blogs/components/blog-editor-header.tsx`
- Reference: `apps/web/src/pages/blogs/components/blog-editor-page.tsx:476-577` (header JSX)
- Reference: `apps/web/src/pages/blogs/components/blog-editor-page.tsx:30-49` (formatDate, getDirectoryPath helpers)
- Import: `apps/web/src/pages/blogs/components/collab-avatars.tsx` (CollabAvatars)

- [ ] **Step 1: Create BlogEditorHeader.tsx**

```tsx
import { Eye, Edit2, Trash2, Save, Send, Loader2 } from 'lucide-react';
import { Awareness } from 'y-protocols/awareness';
import { CollabAvatars } from './collab-avatars';
import type { BlogDto } from '@x-console/dto';

interface BlogEditorHeaderProps {
  blog: BlogDto;
  directories: { id: string; name: string }[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  awareness: Awareness | null;
  currentUserId: string;
  isPreview: boolean;
  localSaving: boolean;
  isPublishing: boolean;
  onTogglePreview: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDelete: () => void;
}

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDirectoryPath = (
  blog: BlogDto,
  directories: { id: string; name: string }[]
): string => {
  if (!blog.directoryId) return '';
  const dir = directories.find((d) => d.id === blog.directoryId);
  return dir?.name || '';
};

export function BlogEditorHeader({
  blog,
  directories,
  connectionStatus,
  awareness,
  currentUserId,
  isPreview,
  localSaving,
  isPublishing,
  onTogglePreview,
  onSaveDraft,
  onPublish,
  onDelete,
}: BlogEditorHeaderProps) {
  const directoryPath = getDirectoryPath(blog, directories);

  return (
    <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-zinc-700 shrink-0">
      <div className="flex items-center gap-2">
        {directoryPath && (
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            {directoryPath} / {blog.title}
          </span>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500">
          <span>创建于 {formatDate(blog.createdAt)}</span>
          <span>修改于 {formatDate(blog.updatedAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Collaboration status */}
        {awareness && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : connectionStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400'
            }`}
          >
            {connectionStatus === 'connected' ? '在线' : connectionStatus === 'connecting' ? '连接中...' : '离线'}
          </span>
        )}

        {/* Collaboration avatars */}
        {awareness && (
          <div className="mr-2">
            <CollabAvatars awareness={awareness} currentUserId={currentUserId} />
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded transition-colors"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Preview/Edit toggle */}
        <div className="flex items-center rounded overflow-hidden border border-gray-200 dark:border-zinc-600">
          <button
            onClick={onTogglePreview}
            className={`px-2 py-1 text-xs font-medium transition-colors ${
              isPreview
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-50 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-600'
            }`}
          >
            <Eye className="w-3.5 h-3.5 inline mr-0.5" />
            预览
          </button>
          <button
            onClick={onTogglePreview}
            className={`px-2 py-1 text-xs font-medium transition-colors border-l border-gray-200 dark:border-zinc-600 ${
              !isPreview
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-50 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-600'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5 inline mr-0.5" />
            编辑
          </button>
        </div>

        {/* Save draft button */}
        {!isPreview && (
          <button
            onClick={onSaveDraft}
            disabled={localSaving || isPublishing}
            className="p-1 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
            title="保存草稿"
          >
            {localSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Publish button */}
        <button
          onClick={onPublish}
          disabled={localSaving || isPublishing}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublishing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          发布
        </button>
      </div>
    </div>
  );
}
```

Note: `onTogglePreview` toggles isPreview state - when isPreview is true, clicking Edit button should set to false, and vice versa. Pass `() => setIsPreview(!isPreview)`.

- [ ] **Step 2: Verify build**

Run: `pnpm typecheck --filter @x-console/web 2>&1 | head -30`
Expected: No errors related to BlogEditorHeader

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-header.tsx
git commit -m "feat(web): extract BlogEditorHeader component

- Directory path, timestamps, connection status badge
- CollabAvatars, preview/edit toggle
- Save draft, publish, delete buttons

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: BlogEditorContent.tsx

Extract the scrollable content area.

**Files:**
- Create: `apps/web/src/pages/blogs/components/blog-editor-content.tsx`
- Reference: `apps/web/src/pages/blogs/components/blog-editor-page.tsx:587-661` (content JSX)
- Import: `EditorContent` from `@tiptap/react`

- [ ] **Step 1: Create BlogEditorContent.tsx**

```tsx
import { EditorContent, Editor } from '@tiptap/react';
import type { TagDto } from '@x-console/dto';

interface BlogEditorContentProps {
  title: string;
  isPreview: boolean;
  wordCount: number;
  tags: TagDto[];
  selectedTagIds: string[];
  onTitleChange: (title: string) => void;
  toggleTag: (tagId: string) => void;
  editor: Editor | null;
}

export function BlogEditorContent({
  title,
  isPreview,
  wordCount,
  tags,
  selectedTagIds,
  onTitleChange,
  toggleTag,
  editor,
}: BlogEditorContentProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mt-6">
      {/* Title */}
      {isPreview ? (
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-50">{title}</h1>
      ) : (
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="博客标题"
          className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 text-gray-900 dark:text-zinc-50"
        />
      )}

      {/* Meta info row */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-zinc-400">{wordCount} 字</span>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-zinc-400">标签:</span>
          {tags.map((tag) =>
            isPreview ? (
              <span
                key={tag.id}
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  selectedTagIds.includes(tag.id)
                    ? 'text-white'
                    : 'text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700'
                }`}
                style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
              >
                {tag.name}
              </span>
            ) : (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                  selectedTagIds.includes(tag.id)
                    ? 'text-white'
                    : 'text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600'
                }`}
                style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
              >
                {tag.name}
              </button>
            )
          )}
          {tags.length === 0 && (
            <span className="text-sm text-gray-400 dark:text-zinc-600">暂无标签</span>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className={isPreview ? 'prose dark:prose-invert max-w-none' : ''}>
        <EditorContent editor={editor} className={isPreview ? '' : 'min-h-[400px]'} />
      </div>

      {/* Empty state placeholder */}
      {!isPreview && !editor?.getText() && (
        <div className="text-center py-12 text-gray-400 dark:text-zinc-600 pointer-events-none">
          开始写作...
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm typecheck --filter @x-console/web 2>&1 | head -30`
Expected: No errors related to BlogEditorContent

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-content.tsx
git commit -m "feat(web): extract BlogEditorContent component

- Title input/h1, word count, tag list
- EditorContent rendering with preview/edit styling
- Empty placeholder state

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Simplify blog-editor-page.tsx

Refactor the main page to use the extracted hooks and components.

**Files:**
- Modify: `apps/web/src/pages/blogs/components/blog-editor-page.tsx`
- Reference: `apps/web/src/pages/blogs/hooks/useCollaboration.ts`
- Reference: `apps/web/src/pages/blogs/hooks/useBlogEditor.ts`
- Reference: `apps/web/src/pages/blogs/components/blog-editor-header.tsx`
- Reference: `apps/web/src/pages/blogs/components/blog-editor-content.tsx`

- [ ] **Step 1: Rewrite blog-editor-page.tsx**

The file should:
1. Import `useCollaboration` from `../hooks/useCollaboration`
2. Import `useBlogEditor` from `../hooks/useBlogEditor`
3. Import `BlogEditorHeader` and `BlogEditorContent` from same directory
4. Remove all extracted logic (Y.Doc, provider, awareness, state, handlers)
5. Keep: `useEditor` call, `isPreview` effect, snapshot timer, loading/not-found UI, JSX composition

Key changes:
- `const { ydoc, provider, indexeddbProvider, awareness, connectionStatus, editorExtensions, userId } = useCollaboration({ pageId, blogUserId: blog?.userId })`
- `const { blog, loading, title, selectedTagIds, isPreview, isPublishing, localSaving, wordCount, handleTitleChange, toggleTag, handleSaveDraft, handlePublish, handleDelete, setIsPreview } = useBlogEditor({ pageId, editor })`
- Replace header JSX with `<BlogEditorHeader ... />`
- Replace content JSX with `<BlogEditorContent ... />`
- Snapshot timer (30s) stays in page component since it needs `editor`
- `isPreview` effect (setEditable) stays in page component

- [ ] **Step 2: Verify build**

Run: `pnpm typecheck --filter @x-console/web 2>&1 | head -50`
Expected: No errors in blog-editor-page or related files

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-page.tsx
git commit -m "refactor(web): simplify BlogEditorPage to composition layer

- Use useCollaboration hook for Y.Doc/Provider/Awareness
- Use useBlogEditor hook for blog state and handlers
- Extract header and content to separate components
- Page now ~100 lines, focused on composition

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification

After all chunks:

1. Run `pnpm typecheck --filter @x-console/web` - no errors
2. Run `pnpm lint --filter @x-console/web` - no new lint errors
3. Manually test the blog editor page loads correctly, editor works, preview/edit toggle works, tags can be toggled
