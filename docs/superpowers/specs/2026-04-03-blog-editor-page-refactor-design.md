# Blog Editor Page 重构设计

## 背景

`blog-editor-page.tsx` 当前约 665 行，混合了多种职责：协作文档初始化、编辑器配置、博客加载/保存、UI 渲染等。难以维护和测试。

## 目标

按职责分层，将组件拆分为独立的 hook 和 UI 组件，提升可维护性和可测试性。

## 拆分结构

```
apps/web/src/pages/blogs/
├── components/
│   ├── blog-editor-page.tsx      # 主页面（精简为组合层，约 50-80 行）
│   ├── blog-editor-header.tsx    # 新：头部 UI
│   └── blog-editor-content.tsx   # 新：内容区 UI
├── hooks/
│   ├── useCollaboration.ts       # 新：Y.Doc / Provider / Awareness / 快照
│   └── useBlogEditor.ts          # 新：博客加载 / 保存 / 状态管理
```

## 模块职责

### useCollaboration.ts

**职责**：协作相关逻辑

- Y.Doc 创建（useMemo）
- HocuspocusProvider 初始化（useMemo）
- IndexedDB persistence 初始化（useMemo）
- Awareness 设置（useEffect）
- 连接状态管理
- Provider cleanup（useEffect return destroy）

**注意**：30 秒快照定时器不在此 hook 内，因为需要访问 `editor`。快照逻辑保留在主组件或 `useBlogEditor` 中。

**返回**：
```ts
{
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  indexeddbProvider: IndexeddbPersistence | null;
  awareness: Awareness | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  editorExtensions: Extension[];
  userId: string;
  userName: string;
  userColor: string;
}
```

**依赖**：pageId, token（blog?.userId 用于 awareness userInfo，但 awareness 初始化在 useEffect 内）

### useBlogEditor.ts

**职责**：博客业务逻辑

- 博客加载（loadBlog on mount / pageId change）
- title / selectedTagIds state
- isPreview / isPublishing / localSaving state
- debounced save（1s）
- content 同步到 ref（内部 handleUpdate 监听 editor update）
- handleTitleChange
- toggleTag
- handleSaveDraft
- handlePublish
- handleDelete

**返回**：
```ts
{
  blog: BlogDto | null;
  loading: boolean;
  title: string;
  selectedTagIds: string[];
  isPreview: boolean;
  isPublishing: boolean;
  localSaving: boolean;
  wordCount: number;
  handleTitleChange: (title: string) => void;
  toggleTag: (tagId: string) => void;
  handleSaveDraft: () => Promise<void>;
  handlePublish: () => Promise<void>;
  handleDelete: () => void;
  setIsPreview: (v: boolean) => void;
}
```

**依赖**：pageId, blogService, tagService, toastService, navigate, editor（editor 仅为监听 update 事件用）

### BlogEditorHeader.tsx

**职责**：头部 UI

- 目录路径显示
- 创建/修改时间
- 连接状态 badge
- 协作用户头像（CollabAvatars）
- 预览/编辑切换按钮组
- 保存草稿按钮
- 发布按钮
- 删除按钮

**Props**：
```ts
{
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
```

### BlogEditorContent.tsx

**职责**：内容区 UI

- 标题（预览模式 h1 / 编辑模式 input）
- 字数统计
- 标签列表（预览/编辑模式渲染不同）
- EditorContent
- 空内容占位符

**Props**：
```ts
{
  title: string;
  isPreview: boolean;
  wordCount: number;
  tags: TagDto[];
  selectedTagIds: string[];
  onTitleChange: (title: string) => void;
  toggleTag: (tagId: string) => void;
  editor: Editor | null;
}
```

### blog-editor-page.tsx（精简后）

**职责**：组合层

- 调用 useCollaboration
- 调用 useBlogEditor
- 渲染 Header + EditorToolbar（仅编辑模式）+ Content
- Loading / not found 状态

## 接口不变更

- `EditorToolbar` 组件路径和接口保持不变
- `CollabAvatars` 组件路径和接口保持不变
- `tiptap.config.ts` 不变
- 路由和 props 接口（`pageId`）不变

## 实现顺序

1. `useCollaboration.ts` - 抽取协作逻辑
2. `useBlogEditor.ts` - 抽取业务逻辑
3. `BlogEditorHeader.tsx` - 抽取头部 UI
4. `BlogEditorContent.tsx` - 抽取内容区 UI
5. `blog-editor-page.tsx` - 简化为组合层
