# Blog 编辑器统一设计

## 概述

将 `PagePreview` 和 `InlineBlogEditor` 合并为单一的 `BlogEditorPage` 组件，通过 `isPreview` 状态在预览和编辑模式间切换。

## 布局结构

```
┌─────────────────────────────────────────────────────────────┐
│ Header (固定)                                                 │
│ [←] [面包屑] [创建时间] [修改时间] [预览|编辑] [删除] [发布]  │
├─────────────────────────────────────────────────────────────┤
│ Toolbar (仅编辑模式显示)                                      │
│ [格式化按钮组...]                                             │
├─────────────────────────────────────────────────────────────┤
│ Content (可滚动)                                             │
│                                                             │
│ 标题 (可编辑)                                                │
│ 字数 | 标签 (支持增删)                                       │
│                                                             │
│ 正文区域                                                     │
│ - 编辑模式: Tiptap 富文本编辑器                              │
│ - 预览模式: 只读渲染                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Header 详细设计

### 左侧区域
- **返回按钮**: `ArrowLeft` icon, hover 时显示背景色
- **面包屑**: `目录名 / 博客标题` 或仅 `博客标题`
- **时间信息**: `创建于 YYYY-MM-DD HH:mm` | `修改于 YYYY-MM-DD HH:mm`，使用较小字号和灰色

### 中间/右侧区域
- **预览/编辑切换**: Button Group 样式
  - 两个按钮并排，无间距，共享边框
  - 选中态有 distinct 背景色区分
  - `预览` | `编辑`
- **操作按钮组**: icon button，视觉上较 subdued
  - `保存草稿` (仅编辑模式可见，编辑时显示)
  - `发布` / `取消发布`
  - `删除` (带确认)

### Button Group 样式
```css
/* 未选中 */
bg-gray-100 dark:bg-dark-700
text-gray-600 dark:text-gray-400

/* 选中 */
bg-primary-100 dark:bg-primary-900/30
text-primary-600 dark:text-primary-400
```

### 操作按钮样式
- 使用 icon + 文字，或纯 icon + tooltip
- 默认状态较 subdued，hover 时提升可见度
- 删除按钮使用红色系但不过度突出

## 内容区域

### 标题
- 大号加粗字体 (`text-3xl font-bold`)
- 编辑模式: `<input>` 可编辑
- 预览模式: `<h1>` 只读

### 元信息行
`字数 | 标签1 标签2 标签3 [+添加标签]`

- 字数: 实时计算显示
- 标签: 点击切换选中状态，支持增删
- 标签增删: 点击 `+` 弹出标签选择器或输入框

### 正文区域
- **编辑模式**: `EditorToolbar` + `EditorContent` (Tiptap)
- **预览模式**: `EditorContent` (editable: false)

## 状态管理

```typescript
interface BlogEditorPageState {
  isPreview: boolean;           // true = 预览模式, false = 编辑模式
  title: string;
  content: JSONContent;
  selectedTagIds: string[];
  isPublishing: boolean;
  isSaving: boolean;
}
```

## 组件结构

```
BlogEditorPage (统一组件)
├── Header
│   ├── BackButton
│   ├── Breadcrumb + TimeInfo
│   ├── PreviewEditToggle (Button Group)
│   └── ActionButtons (SaveDraft, Publish, Delete)
│
├── EditorToolbar (条件渲染: 仅编辑模式)
│
└── Content
    ├── TitleInput / TitleDisplay
    ├── MetaInfoRow (wordCount + Tags)
    └── EditorContent / PreviewContent
```

## 实现步骤

1. 创建 `BlogEditorPage` 组件，整合 `PagePreview` 和 `InlineBlogEditor` 逻辑
2. 实现 button group 样式切换组件
3. 统一 Header 布局和样式
4. 实现预览/编辑模式切换逻辑
5. 更新路由使用新组件
6. 移除旧的 `PagePreview` 和 `InlineBlogEditor`

## 移除的组件

- `apps/web/src/pages/blogs/components/content/page-preview.tsx`
- `apps/web/src/pages/blogs/components/content/inline-blog-editor.tsx`
