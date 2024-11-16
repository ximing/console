# Blog Collaboration Editor 重构设计

## 概述

重构博客编辑器的实时协作功能，采用单 Editor 实例 + `editable` 切换方案，解决预览/编辑态与协作同步的冲突问题。

## 背景

当前实现问题：
1. 预览和编辑是两个独立的 editor 实例，内容同步复杂
2. 协作初始化逻辑混乱（部分被注释）
3. 协作功能未能正常工作

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    BlogEditorPage                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Header: 目录/标题 | 创建修改时间 | [用户头像组] [状态]   │
│  │          [删除] [预览/编辑切换] [保存/发布]             │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  EditorToolbar (只在编辑模式显示)                       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              TiptapEditor (单例)                      │  │
│  │     - editable 由父组件 isPreview 控制                 │  │
│  │     - Collaboration 扩展连接 Y.Doc + Provider          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Y.Doc ←→ HocuspocusProvider ←→ Hocuspocus Server          │
│      ↓                                                     │
│  IndexedDB (离线缓存)                                        │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. TiptapEditor 组件（重构要点）

**职责**：单一 editor 实例，承载协作内容

**迁移说明**：当前代码有两个 editor 实例（previewEditor/editEditor），本次重构合并为单一实例。

**实现**：
```tsx
// 编辑模式
editor.setEditable(true);

// 预览模式
editor.setEditable(false);
```

**Extensions 配置**：
```tsx
const editor = useEditor({
  extensions: [
    ...inlineEditableExtensions,  // 复用现有配置
    Collaboration.configure({
      document: ydoc,
      provider: hocuspocusProvider,
    }),
  ],
  immediatelyRender: false,
});
```

#### 2. CollabAvatars 组件（替换现有 CollabPresence）

**职责**：显示在线用户头像列表

**位置**：Header 右侧，连接状态后面

**文件位置**：`apps/web/src/pages/blogs/components/collab-avatars.tsx`

**替换说明**：现有 `apps/web/src/pages/blogs/editor/components/collab-presence.tsx` 重命名为 `collab-avatars.tsx` 并移动到 `blogs/components/` 目录。

**UI 布局**：
```
[头像1][头像2][头像3] [连接状态] [删除] [预览/编辑] [保存/发布]
```

**显示规则**：
- 最多显示 5 个头像，超出显示 "+N"
- 当前用户头像有边框高亮
- Hover 显示用户昵称 tooltip

#### 3. EditorToolbar 组件

**职责**：编辑工具栏

**显示条件**：仅在编辑模式 (`isPreview === false`) 显示

---

## 数据流

### 初始化流程

```
1. 页面挂载
   ↓
2. 加载 blog 数据 (blogService.loadBlog)
   ↓
3. 创建 Y.Doc (useMemo，稳定引用)
   ↓
4. 创建 HocuspocusProvider (useMemo)
   ↓
5. Provider onSynced 回调
   ├─ 检查 Y.Doc 是否为空 (doc.getText() === '')
   ├─ 如果为空且有 blog.content，写入 Y.Doc
   └─ 标记 initialContentLoaded 防止重复写入
   ↓
6. Editor 使用 Y.Doc 初始化 Collaboration 扩展
```

### 内容同步流程

```
用户编辑 → Y.Doc update → HocuspocusProvider 同步 → 服务端持久化
                          ↓
                    其他用户收到 update → Editor 更新
```

### 预览/编辑切换

```
预览 → 编辑：
  1. setIsPreview(false)
  2. editor.setEditable(true)
  3. EditorToolbar 渲染
  4. CollabPresence 显示在 Header

编辑 → 预览：
  1. setIsPreview(true)
  2. editor.setEditable(false)
  3. EditorToolbar 隐藏
```

---

## 关键技术点

### 1. 单 Editor 实例

不再维护两个 editor（previewEditor/editEditor），只创建一个：

```tsx
const editor = useEditor({
  extensions: [
    ...editableExtensions,
    Collaboration.configure({
      document: ydoc,
      provider: hocuspocusProvider,
    }),
  ],
  immediatelyRender: false,
});
```

### 2. CollaborationCursor 配置

**状态**：当前代码中已禁用（因 awareness 初始化时序问题），本次重构一并修复。

**解决方案**：
1. 使用 `provider.awareness` 而非 `provider` 作为 useEffect 依赖项
2. 确保在 `onSynced` 回调之后才设置 awareness 状态

```tsx
// HocuspocusProvider 初始化后设置 awareness
useEffect(() => {
  if (!provider?.awareness) return;

  // 设置本地用户信息到 awareness
  provider.awareness.setLocalStateField('user', {
    name: userName,
    color: userColor,
    id: userId,
  });

  // 监听 awareness 变化
  const handleAwarenessChange = () => {
    console.log('[Collab] Awareness changed');
  };
  provider.awareness.on('change', handleAwarenessChange);

  return () => {
    provider.awareness?.off('change', handleAwarenessChange);
  };
}, [provider?.awareness, userId, userName, userColor]);
```

### 3. 内容初始化守卫

使用 Y.Doc 的 `config` map 标记是否已加载初始内容：

```tsx
// Provider 配置
const provider = new HocuspocusProvider({
  url: wsUrl,
  name: docName,
  document: ydoc,
  token: token,
  onSynced() {
    // 只在首次同步且 Y.Doc 为空时写入初始内容
    if (!ydoc.getMap('config').get('initialContentLoaded') && editor) {
      ydoc.getMap('config').set('initialContentLoaded', true);
      editor.commands.setContent(blogContent);
    }
  },
});
```

**注意**：不再使用 React state (`contentLoaded`) 来控制初始化，改为使用 Y.Doc 内部状态。
```

---

## 文件变更

### 新增文件
- `apps/web/src/pages/blogs/components/collab-avatars.tsx` - 在线用户头像组件（从 `editor/components/collab-presence.tsx` 重命名并移动）

### 修改文件
- `apps/web/src/pages/blogs/components/blog-editor-page.tsx` - 主编辑器页面
  - 移除 previewEditor，只保留 editEditor（重命名为 editor）
  - 使用 `editor.setEditable()` 切换预览/编辑
  - 内容初始化改用 Y.Doc config map
- `apps/web/src/pages/blogs/editor/tiptap.config.ts` - 无需修改（继续使用 inlineEditableExtensions）

### 删除文件
- `apps/web/src/pages/blogs/editor/components/collab-presence.tsx` - 已移动并重命名为 collab-avatars.tsx

---

## 组件接口

### CollabAvatars Props

```typescript
interface CollabAvatarsProps {
  awareness: HocuspocusProvider['awareness'] | null;
  currentUserId: string;
}
```

### Editor Props

```typescript
// 直接使用 Tiptap useEditor 返回的 Editor 实例
// isPreview 通过 editor.setEditable() 控制
```

---

## 测试场景

1. **单用户编辑** - 用户可以正常编辑和保存内容
2. **多用户协作** - 两个浏览器打开同一博客，编辑同步
3. **预览/编辑切换** - 切换后内容保持同步
4. **离线编辑** - IndexedDB 缓存，离线可编辑
5. **重连恢复** - 断线重连后内容自动同步
6. **用户上下线** - 头像列表实时更新
