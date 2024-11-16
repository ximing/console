# Blog Collaboration Editor 重构实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构博客编辑器为单 Editor 实例 + `editable` 切换，实现实时协作功能

**Architecture:**
- 单一 Tiptap Editor 实例，预览/编辑通过 `editor.setEditable()` 切换
- 协作通过 HocuspocusProvider + Y.Doc 实现
- 在线用户头像显示在 Header 中

**Tech Stack:** Tiptap, Y.js, HocuspocusProvider, React

---

## Chunk 1: 创建 CollabAvatars 组件

将 `collab-presence.tsx` 重构并移动到 `blogs/components/collab-avatars.tsx`，改为显示头像而非文字标签。

**Files:**
- Create: `apps/web/src/pages/blogs/components/collab-avatars.tsx`
- Modify: `apps/web/src/pages/blogs/components/blog-editor-page.tsx` (import 路径)
- Delete: `apps/web/src/pages/blogs/editor/components/collab-presence.tsx`

- [ ] **Step 1: 创建 CollabAvatars 组件**

```tsx
// apps/web/src/pages/blogs/components/collab-avatars.tsx
import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';

export interface CollabUser {
  name: string;
  color: string;
  id: string;
}

interface CollabAvatarsProps {
  awareness: Awareness | null;
  currentUserId: string;
}

/**
 * Displays online users as avatar circles in the Header.
 * Shows up to 5 avatars, with "+N" overflow indicator.
 * Current user's avatar has a highlight border.
 * Hover shows user name tooltip.
 */
export function CollabAvatars({ awareness, currentUserId }: CollabAvatarsProps) {
  const [users, setUsers] = useState<CollabUser[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const onlineUsers: CollabUser[] = [];
      states.forEach((state) => {
        if (state.user && state.user.id !== currentUserId) {
          onlineUsers.push(state.user as CollabUser);
        }
      });
      setUsers(onlineUsers);
    };

    updateUsers();
    awareness.on('change', updateUsers);

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [awareness, currentUserId]);

  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, 5);
  const overflowCount = users.length - 5;

  return (
    <div className="flex items-center gap-1">
      {visibleUsers.map((user) => (
        <div
          key={user.id}
          className="relative group"
          title={user.name}
        >
          {/* Avatar circle with user initial */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white dark:border-zinc-800"
            style={{ backgroundColor: user.color }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-zinc-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {user.name}
          </div>
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-zinc-300 border-2 border-white dark:border-zinc-800"
          title={`${overflowCount} more users`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 运行 lint 检查**

Run: `cd apps/web && pnpm lint:fix src/pages/blogs/components/collab-avatars.tsx 2>&1 || true`
Expected: No errors

- [ ] **Step 3: 更新 blog-editor-page.tsx import 路径**

修改 `blog-editor-page.tsx` 第 26 行：
```tsx
// 从
import { CollabPresence } from '../editor/components/collab-presence';
// 改为
import { CollabAvatars } from './collab-avatars';
```

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/pages/blogs/components/collab-avatars.tsx apps/web/src/pages/blogs/components/blog-editor-page.tsx
git rm apps/web/src/pages/blogs/editor/components/collab-presence.tsx
git commit -m "feat(collab): create CollabAvatars component with avatar display

- Replace text labels with avatar circles
- Add tooltip on hover
- Show max 5 avatars with +N overflow
- Current user highlighted with border"

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Chunk 2: 重构为单 Editor 实例

将 `previewEditor` 和 `editEditor` 合并为单一 `editor` 实例，通过 `editor.setEditable()` 切换预览/编辑模式。

**Files:**
- Modify: `apps/web/src/pages/blogs/components/blog-editor-page.tsx`

- [ ] **Step 1: 移除 previewEditor，创建单一 editor 实例**

在 `blog-editor-page.tsx` 中：

1. 移除 `previewExtensions` import（第 20 行）
2. 移除 `previewEditor` 创建（第 237-242 行）
3. 将 `editEditor` 重命名为 `editor`（第 265 行）
4. 更新 `editorExtensions` 依赖和配置

```tsx
// 新的 editor 创建 (替换第 265-275 行)
const editor = useEditor({
  extensions: editExtensions,
  editorProps: {
    attributes: {
      class:
        'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-0 py-3',
    },
  },
  immediatelyRender: false,
});
```

- [ ] **Step 2: 移除 contentLoaded state 和相关逻辑**

1. 移除 `contentLoaded` state（第 71 行）
2. 移除所有 `setContentLoaded` 调用（第 304 行）
3. 移除 `contentLoaded` 条件渲染（第 679 行）

- [ ] **Step 3: 添加 isPreview 变化时的 setEditable 调用**

在 `blog-editor-page.tsx` 中添加新的 useEffect：

```tsx
// 预览/编辑切换时更新 editor editable 状态
useEffect(() => {
  if (!editor) return;
  editor.setEditable(!isPreview);
}, [editor, isPreview]);
```

- [ ] **Step 4: 移除双 editor 渲染逻辑，改为单一 EditorContent**

替换第 661-676 行的双 editor 渲染：

```tsx
{/* Editor Content - single editor with editable controlled by isPreview */}
<div className={isPreview ? 'prose dark:prose-invert max-w-none' : ''}>
  <EditorContent editor={editor} className={isPreview ? '' : 'min-h-[400px]'} />
</div>
```

- [ ] **Step 5: 替换所有 editEditor 引用为 editor**

使用 `replace_all: true` 将 `editEditor` 替换为 `editor`（注意保持 `editExtensions` 变量名不变）

- [ ] **Step 6: 移除 previewEditor 相关的 blog useEffect**

修改第 288-306 行的 blog sync useEffect，移除 previewEditor 相关代码：

```tsx
// Sync state when blog changes
useEffect(() => {
  if (blog) {
    setTitle(blog.title);
    titleRef.current = blog.title;
    setSelectedTagIds(blog.tags.map((t) => t.id));
    contentJsonRef.current = blog.content;
  }
}, [blog]);
```

- [ ] **Step 7: 提交**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-page.tsx
git commit -m "refactor(editor): merge dual editors into single editor with setEditable

- Remove previewEditor, keep only editor instance
- Use editor.setEditable(!isPreview) for mode switching
- Remove contentLoaded React state
- Update all editEditor references to editor"

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Chunk 3: 修复协作内容初始化

使用 Y.Doc config map 替代 React state 控制内容初始化，确保只在首次同步时写入内容。

**Files:**
- Modify: `apps/web/src/pages/blogs/components/blog-editor-page.tsx`

- [ ] **Step 1: 更新 HocuspocusProvider 的 onSynced 回调**

修改第 115-118 行的 `onSynced` 回调：

```tsx
onSynced() {
  console.log('[Collab] Synced:', docName);
  setConnectionStatus('connected');

  // 内容初始化：如果 Y.Doc 为空且有 blog 内容，写入 Y.Doc
  if (ydoc && editor && blog?.content) {
    // 检查是否已有初始内容（通过 Y.Doc 的 config map）
    if (!ydoc.getMap('config').get('initialContentLoaded')) {
      ydoc.getMap('config').set('initialContentLoaded', true);
      editor.commands.setContent(raw(blog.content));
    }
  }
},
```

- [ ] **Step 2: 添加 blog 作为 useMemo 依赖（如果缺失）**

确保 provider useMemo 中包含 `blog` 依赖：

检查第 134 行的 useMemo 依赖数组，如果缺少 `blog`，需要将 `blog` 添加进去（可能导致不必要的 provider 重建，可以考虑只取 `blog?.id`）

```tsx
// 第 134 行附近
}, [pageId, ydoc, token, blog?.id]);
```

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-page.tsx
git commit -m "fix(collab): use Y.Doc config map for content initialization

- Replace React state contentLoaded with Y.Doc.getMap('config')
- Only write initial content once when Y.Doc is empty
- Fix onSynced callback to properly initialize content"

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Chunk 4: 修复 Awareness 初始化时序

确保 awareness 用户信息在 provider 稳定后才设置，解决 CollaborationCursor 禁用的根本原因。

**Files:**
- Modify: `apps/web/src/pages/blogs/components/blog-editor-page.tsx`

- [ ] **Step 1: 简化 awareness useEffect 依赖**

修改第 172-192 行的 awareness useEffect：

```tsx
// Set awareness user info when awareness becomes available
useEffect(() => {
  if (!awareness || !userId) return;

  // 设置本地用户信息到 awareness
  awareness.setLocalStateField('user', {
    name: userName,
    color: userColor,
    id: userId,
  });

  // 监听 awareness 变化
  const handleAwarenessChange = () => {
    console.log('[Collab] Awareness changed');
  };
  awareness.on('change', handleAwarenessChange);

  return () => {
    awareness.off('change', handleAwarenessChange);
  };
}, [awareness, userId, userName, userColor]);
```

- [ ] **Step 2: 移除 editorKey 相关的复杂逻辑**

移除第 76 行的 `editorKey` state 和第 194-203 行的 provider 监听逻辑：

因为单 editor 实例不再需要 remount editor。

```tsx
// 移除第 76 行:
// const [editorKey, setEditorKey] = useState(0);

// 移除第 194-203 行的 provider 监听:
const prevProviderRef = useRef<any>(null);
useEffect(() => {
  if (provider && !prevProviderRef.current) {
    console.log('[Collab] Provider became available, remounting editor');
    setEditorKey(k => k + 1);
  }
  prevProviderRef.current = provider;
}, [provider]);
```

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-page.tsx
git commit -m "fix(collab): simplify awareness initialization and remove editor remount

- Use awareness directly as dependency
- Remove editorKey and provider remount logic
- Single editor doesn't need remount on provider init"

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Chunk 5: 移动 CollabAvatars 到 Header

将 `CollabAvatars` 从 EditorToolbar 区域移动到 Header 中显示。

**Files:**
- Modify: `apps/web/src/pages/blogs/components/blog-editor-page.tsx`

- [ ] **Step 1: 在 Header 中添加 CollabAvatars**

在第 496-510 行的连接状态后面添加 CollabAvatars：

```tsx
{/* Collaboration avatars - in Header, after connection status */}
{awareness && (
  <div className="mr-2">
    <CollabAvatars awareness={awareness} currentUserId={userId} />
  </div>
)}
```

- [ ] **Step 2: 移除 EditorToolbar 区域的 CollabPresence/CollabAvatars**

移除第 580-586 行的：

```tsx
{/* Editor Toolbar (only in edit mode) */}
{!isPreview && (
  <div className="shrink-0">
    <EditorToolbar editor={editor} blogId={blog.id} />
    <CollabPresence awareness={awareness} currentUserId={userId} />
  </div>
)}
```

替换为：

```tsx
{/* Editor Toolbar (only in edit mode) */}
{!isPreview && (
  <div className="shrink-0">
    <EditorToolbar editor={editor} blogId={blog.id} />
  </div>
)}
```

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/pages/blogs/components/blog-editor-page.tsx
git commit -m "feat(collab): move CollabAvatars to Header

- Display online user avatars in Header after connection status
- Remove CollabAvatars from EditorToolbar area
- EditorToolbar now only shows formatting tools"

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Chunk 6: 最终验证

- [ ] **Step 1: 运行 TypeScript 检查**

Run: `cd apps/web && pnpm typecheck 2>&1`
Expected: No TypeScript errors

- [ ] **Step 2: 运行构建**

Run: `cd apps/web && pnpm build 2>&1`
Expected: Build succeeds

- [ ] **Step 3: 提交所有剩余更改**

```bash
git add -A
git commit -m "chore: complete blog collaboration refactor

- Single editor with editable toggle
- CollabAvatars in Header
- Y.Doc-based content initialization
- Simplified awareness initialization"

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## 验证清单

完成实施后，确认以下功能正常：

- [ ] 单用户编辑和保存正常
- [ ] 预览/编辑模式切换正常
- [ ] 连接状态正确显示（在线/离线/连接中）
- [ ] 在线用户头像在 Header 显示
- [ ] Hover 头像显示用户昵称
- [ ] 多用户协作同步（如有条件测试）
