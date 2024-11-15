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

#### 1. TiptapEditor 组件

**职责**：单一 editor 实例，承载协作内容

**Props**：
- `editor`: TiptapEditor 实例（从 useEditor 创建）
- `isPreview`: boolean

**实现**：
```tsx
// 编辑模式
editor.setEditable(true);

// 预览模式
editor.setEditable(false);
```

#### 2. CollabPresence 组件（Header 中）

**职责**：显示在线用户头像列表

**位置**：Header 右侧，连接状态后面

**UI 布局**：
```
[头像1][头像2][头像3] [连接状态] [删除] [预览/编辑] [保存/发布]
```

**显示规则**：
- 最多显示 5 个头像，超出显示 "+N"
- 当前用户头像有边框高亮
- Hover 显示用户昵称 tooltip
- 显示当前用户名和连接状态

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

解决 awareness 初始化时序问题：

```tsx
// 确保 awareness 在 provider 之后初始化
useEffect(() => {
  if (!provider?.awareness) return;

  provider.awareness.setLocalStateField('user', {
    name: userName,
    color: userColor,
    id: userId,
  });
}, [provider?.awareness]);
```

### 3. 内容初始化守卫

```tsx
onSynced() {
  // 只在首次同步且 Y.Doc 为空时写入初始内容
  if (!doc.getMap('config').get('initialContentLoaded') && editor) {
    doc.getMap('config').set('initialContentLoaded', true);
    editor.commands.setContent(blogContent);
  }
}
```

---

## 文件变更

### 新增文件
- `apps/web/src/pages/blogs/components/collab-avatars.tsx` - 在线用户头像组件

### 修改文件
- `apps/web/src/pages/blogs/components/blog-editor-page.tsx` - 主编辑器页面
- `apps/web/src/pages/blogs/editor/tiptap.config.ts` - 简化扩展配置

### 删除文件
- 无

---

## 组件接口

### CollabAvatars Props

```typescript
interface CollabAvatarsProps {
  awareness: HocuspocusProvider['awareness'] | null;
  currentUserId: string;
}
```

### TiptapEditor Props

```typescript
interface TiptapEditorProps {
  editor: Editor | null;
  isPreview: boolean;
}
```

---

## 测试场景

1. **单用户编辑** - 用户可以正常编辑和保存内容
2. **多用户协作** - 两个浏览器打开同一博客，编辑同步
3. **预览/编辑切换** - 切换后内容保持同步
4. **离线编辑** - IndexedDB 缓存，离线可编辑
5. **重连恢复** - 断线重连后内容自动同步
6. **用户上下线** - 头像列表实时更新
