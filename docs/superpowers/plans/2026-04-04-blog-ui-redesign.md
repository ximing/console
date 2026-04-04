# Blog UI 重构实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 Blog 页面的 Header 和 Sidebar 进行视觉重构，实现无边框、绿色主交互色、悬浮呼吸感的设计

**Architecture:** 主要涉及 6 个 React 组件的样式调整，使用 Tailwind CSS 和内联样式。改动均为纯视觉 UI，不涉及业务逻辑。

**Tech Stack:** React, Tailwind CSS, @rabjs/react

---

## 文件变更总览

| 文件 | 变更类型 | 核心改动 |
|------|---------|---------|
| `apps/web/src/pages/blogs/components/sidebar/index.tsx` | Modify | 移除边框，添加阴影 |
| `apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx` | Modify | Tab 改为圆点指示器 |
| `apps/web/src/pages/blogs/components/sidebar/search-button.tsx` | Modify | 无边框，hover 绿色 |
| `apps/web/src/pages/blogs/components/sidebar/resizable-sidebar.tsx` | Modify | 阴影样式 |
| `apps/web/src/pages/blogs/components/directory-tree/TreeNode.tsx` | Modify | 选中态/hover 绿色系统 |
| `apps/web/src/pages/blogs/components/blog-editor/blog-editor-header.tsx` | Modify | 悬浮背景，发光状态圆点 |

---

## Chunk 1: Sidebar 基础框架

### 1.1 Sidebar 容器重构

**Files:**
- Modify: `apps/web/src/pages/blogs/components/sidebar/index.tsx:31`

**变更:** 移除 `border-r border-gray-200/60 dark:border-zinc-800/50`，添加阴影

```tsx
// 当前 (line 31)
<div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-gray-200/60 dark:border-zinc-800/50">

// 修改为
<div className="flex flex-col h-full bg-white dark:bg-zinc-900 shadow-[4px_0_24px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
```

- [ ] **Step 1: 修改 Sidebar 容器样式**
- [ ] **Step 2: 提交变更**

### 1.2 ResizableSidebar 阴影调整

**Files:**
- Modify: `apps/web/src/pages/blogs/components/sidebar/resizable-sidebar.tsx`

**变更:** 确保阴影正确应用

- [ ] **Step 1: 检查 resizable-sidebar 是否有容器包装需要阴影**
- [ ] **Step 2: 如需要，添加阴影样式**
- [ ] **Step 3: 提交变更**

---

## Chunk 2: Tab 圆点指示器

### 2.1 SidebarTabs 重构

**Files:**
- Modify: `apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx`

**变更:** 将 border-bottom tab 改为圆点指示器

当前代码 (sidebar-tabs.tsx:10-43):
```tsx
<div role="tablist" className="flex border-b border-gray-100/80 dark:border-zinc-800/50 px-1">
  <button className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-t-lg ${
    activeTab === 'directory'
      ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10 -mb-px'
      : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30'
  }`}>
    <Folder className="w-4 h-4" />
    目录
  </button>
  ...
</div>
```

修改为圆点指示器:
```tsx
<div role="tablist" className="flex gap-5 px-3 py-2">
  <button
    role="tab"
    type="button"
    aria-selected={activeTab === 'directory'}
    onClick={() => onTabChange('directory')}
    className="flex items-center gap-2 text-sm font-medium transition-all duration-150 cursor-pointer"
  >
    <div
      className={`w-2 h-2 rounded-full transition-all duration-200 ${
        activeTab === 'directory'
          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
          : 'bg-gray-300 dark:bg-zinc-600'
      }`}
    />
    <span className={activeTab === 'directory' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-zinc-500'}>
      目录
    </span>
  </button>
  <button
    role="tab"
    type="button"
    aria-selected={activeTab === 'recent'}
    onClick={() => onTabChange('recent')}
    className="flex items-center gap-2 text-sm font-medium transition-all duration-150 cursor-pointer"
  >
    <div
      className={`w-2 h-2 rounded-full transition-all duration-200 ${
        activeTab === 'recent'
          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
          : 'bg-gray-300 dark:bg-zinc-600'
      }`}
    />
    <span className={activeTab === 'recent' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-zinc-500'}>
      最近
    </span>
  </button>
</div>
```

- [ ] **Step 1: 重写 SidebarTabs 组件为圆点指示器**
- [ ] **Step 2: 测试 Tab 切换功能正常**
- [ ] **Step 3: 测试暗色模式正常**
- [ ] **Step 4: 提交变更**

---

## Chunk 3: 搜索按钮重构

### 3.1 SearchButton 重构

**Files:**
- Modify: `apps/web/src/pages/blogs/components/sidebar/search-button.tsx`

**变更:** 移除边框，hover 使用淡绿色背景

当前代码 (search-button.tsx:10-17):
```tsx
<button
  onClick={onClick}
  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 dark:text-zinc-400 hover:bg-gray-100/80 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-200 rounded-lg transition-all duration-150"
>
  <Search className="w-4 h-4" />
  <span className="font-medium">搜索</span>
</button>
```

修改为:
```tsx
<button
  onClick={onClick}
  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-500 dark:text-zinc-400 hover:bg-green-50/80 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-all duration-150"
>
  <Search className="w-4 h-4" />
  <span className="font-medium">搜索</span>
</button>
```

- [ ] **Step 1: 修改 SearchButton hover 样式为绿色系统**
- [ ] **Step 2: 测试 hover 效果**
- [ ] **Step 3: 提交变更**

---

## Chunk 4: TreeNode 选中态和 Hover 重构

### 4.1 TreeNode 样式重构

**Files:**
- Modify: `apps/web/src/pages/blogs/components/directory-tree/TreeNode.tsx:91-97`

**变更:** 选中态改为左侧绿色竖线 + 淡绿背景，hover 改为淡绿背景

当前代码 (TreeNode.tsx:91-97):
```tsx
className={`
  group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md mx-1
  transition-all duration-100
  ${isSelected ? 'bg-primary-50/80 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100/70 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300'}
  ${isDragging ? 'opacity-50' : ''}
  ${isDropTarget ? 'ring-2 ring-primary-500/50' : ''}
`}
```

修改为:
```tsx
className={`
  group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md mx-1
  transition-all duration-100
  ${isSelected
    ? 'border-l-2 border-green-500 bg-green-50/60 dark:bg-green-900/20 dark:border-green-400 text-green-600 dark:text-green-400'
    : 'hover:bg-green-50/80 dark:hover:bg-green-900/20 text-gray-700 dark:text-zinc-300'
  }
  ${isDragging ? 'opacity-50' : ''}
  ${isDropTarget ? 'ring-2 ring-green-500/50' : ''}
`}
```

**注意:** 需要调整 paddingLeft 来补偿左侧 2px 边框:
```tsx
style={{ paddingLeft: `${depth * DEPTH_INDENT + 6}px` }}
```

- [ ] **Step 1: 修改 TreeNode 选中态样式**
- [ ] **Step 2: 修改 TreeNode hover 样式**
- [ ] **Step 3: 调整 padding 补偿边框**
- [ ] **Step 4: 测试选中、hover、拖拽状态**
- [ ] **Step 5: 测试暗色模式**
- [ ] **Step 6: 提交变更**

---

## Chunk 5: Header 悬浮背景和状态圆点

### 5.1 BlogEditorHeader 重构

**Files:**
- Modify: `apps/web/src/pages/blogs/components/blog-editor/blog-editor-header.tsx`

**变更:**
1. 悬浮背景 + 模糊效果
2. 连接状态改为发光圆点
3. 预览/编辑 active 态改为绿色
4. 发布按钮改为渐变绿色

**Header 容器修改** (blog-editor-header.tsx:50):
```tsx
// 当前
<div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-zinc-700 shrink-0">

// 修改为
<div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
```

**状态圆点修改** (blog-editor-header.tsx:66-77):
```tsx
// 当前
<span className={`text-xs px-2 py-0.5 rounded-full ${
  connectionStatus === 'connected'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : ...
}`}>

// 修改为
<div className="flex items-center gap-1.5">
  <div className={`w-1.5 h-1.5 rounded-full ${
    connectionStatus === 'connected'
      ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]'
      : connectionStatus === 'connecting'
      ? 'bg-amber-500 animate-pulse'
      : 'bg-gray-400'
  }`} />
  <span className="text-xs text-gray-500 dark:text-zinc-400">
    {connectionStatus === 'connected' ? '在线' : connectionStatus === 'connecting' ? '连接中...' : '离线'}
  </span>
</div>
```

**预览/编辑切换修改** (blog-editor-header.tsx:94-119):
```tsx
// 修改 active 态为淡绿色背景 + 绿色文字
<div className="flex items-center rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 p-0.5 gap-0.5">
  <button ... className={`${
    blogEditor.isPreview
      ? 'bg-white dark:bg-zinc-700 text-green-600 dark:text-green-400 shadow-sm'
      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
  }`}>
    <Eye className="w-3.5 h-3.5 inline mr-0.5" />
    预览
  </button>
  <button ... className={`${
    !blogEditor.isPreview
      ? 'bg-white dark:bg-zinc-700 text-green-600 dark:text-green-400 shadow-sm'
      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
  }`}>
    <Edit2 className="w-3.5 h-3.5 inline mr-0.5" />
    编辑
  </button>
</div>
```

**发布按钮修改** (blog-editor-header.tsx:138-149):
```tsx
// 当前
<button className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors disabled:opacity-50">

// 修改为
<button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:shadow-[0_4px_12px_rgba(34,197,94,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50">
```

- [ ] **Step 1: 修改 Header 容器为悬浮背景**
- [ ] **Step 2: 修改状态圆点为发光样式**
- [ ] **Step 3: 修改预览/编辑切换 active 态**
- [ ] **Step 4: 修改发布按钮为渐变绿色**
- [ ] **Step 5: 测试所有按钮交互状态**
- [ ] **Step 6: 测试暗色模式**
- [ ] **Step 7: 提交变更**

---

## Chunk 6: RecentBlogList Hover 统一

### 6.1 RecentBlogList Hover 样式

**Files:**
- Modify: `apps/web/src/pages/blogs/components/sidebar/recent-blog-list.tsx`

**变更:** 确保 recent blog list 的 hover 样式与 TreeNode 保持一致

- [ ] **Step 1: 检查 RecentBlogList 中的 hover 样式**
- [ ] **Step 2: 如需要，修改为淡绿色背景 hover**
- [ ] **Step 3: 提交变更**

---

## 验证清单

完成所有 chunk 后，验证以下内容：

- [ ] **亮色模式**
  - [ ] Sidebar 无边框，右侧有柔和阴影
  - [ ] Tab 为圆点指示器，选中为绿色发光
  - [ ] 搜索按钮 hover 绿色
  - [ ] TreeNode 选中为左侧绿色竖线 + 淡绿背景
  - [ ] TreeNode hover 为淡绿背景
  - [ ] Header 悬浮背景 + 模糊效果
  - [ ] 状态圆点发光
  - [ ] 发布按钮渐变绿色 + hover 上浮

- [ ] **暗色模式**
  - [ ] 所有亮色模式的样式在暗色模式下正确映射

- [ ] **功能**
  - [ ] Tab 切换正常
  - [ ] 搜索按钮可点击
  - [ ] TreeNode 选中、hover、拖拽正常
  - [ ] 预览/编辑切换正常
  - [ ] 保存、发布按钮功能正常

---

**Plan complete.** 可以开始执行。
