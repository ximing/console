# 侧边栏 Tab 重构设计

## 概述

重构博客页面的侧边栏，添加"目录"和"最近"两个 Tab，将 RecentList 从内容区移到侧边栏内。

## 现状问题

1. **RecentList 在内容区** - 当用户没有选择任何目录时，内容区显示 RecentList
2. **缺少 Tab 切换** - 用户无法快速切换到"最近博客"视图
3. **ContentMode 复杂** - `'recent' | 'directory' | 'preview' | 'edit'` 四种模式切换逻辑复杂

## 目标

1. 侧边栏顶部添加 Tab 切换：目录 | 最近
2. RecentList 移到侧边栏内（最近 Tab 下）
3. 侧边栏内的 RecentList 可以点击博客进行预览
4. ContentArea 只负责：目录视图 PageList / 博客预览 PagePreview / 编辑 InlineBlogEditor
5. 内容区显示空状态提示："请在侧边栏选择一个博客"

## 新架构

### 侧边栏结构

```
Sidebar (flex-col, h-full)
├── TabHeader
│   ├── Tab: 目录 (active/inactive)
│   └── Tab: 最近 (active/inactive)
├── TabContent (目录模式)
│   ├── SearchButton
│   ├── DirectoryTree
│   └── ActionButtons (新建博客, 新建目录)
└── TabContent (最近模式)
    ├── SearchButton
    ├── RecentBlogList (在侧边栏内显示博客列表)
    └── ActionButtons (新建博客)
```

### ContentMode 简化

```tsx
// 移除 'recent' 模式
type ContentMode = 'directory' | 'preview' | 'edit';
```

### 状态管理

```tsx
// Sidebar 内部状态
type SidebarTab = 'directory' | 'recent';
const [activeTab, setActiveTab] = useState<SidebarTab>('directory');

// 新增：选中的博客 ID（在最近 Tab 下选择时）
const [selectedRecentBlogId, setSelectedRecentBlogId] = useState<string | null>(null);
```

## 组件设计

### 1. SidebarTabs 组件

侧边栏 Tab 头部，提供目录/最近切换。

**样式：**
- `flex border-b border-gray-200 dark:border-dark-700`
- 两个 Tab 按钮，等宽分布
- Active: `border-b-2 border-primary-500 text-primary-600`
- Inactive: `text-gray-500 hover:text-gray-700`

### 2. RecentBlogListItem 组件（侧边栏版本）

侧边栏内的最近博客列表项，比 BlogListItem 更紧凑。

**样式：**
- `px-3 py-2 text-sm`
- 显示标题 + 更新时间
- Hover 状态：`bg-gray-100 dark:hover:bg-dark-700`
- 选中状态：`bg-primary-50 dark:bg-primary-900/20 text-primary-600`

### 3. ContentArea 空状态

当用户切换到"最近"Tab 但未选择任何博客时，显示空状态。

```tsx
<div className="flex flex-col items-center justify-center h-full text-gray-500">
  <Clock className="w-12 h-12 mb-4 opacity-50" />
  <p>请在侧边栏选择一个博客</p>
</div>
```

## 交互流程

### 场景 1：用户点击目录 Tab
1. Sidebar 显示目录树
2. 点击某个目录 → ContentArea 显示 PageList
3. 点击某个博客 → ContentArea 显示 PagePreview

### 场景 2：用户点击最近 Tab
1. Sidebar 显示最近博客列表
2. Sidebar 内点击某个博客 → ContentArea 显示 PagePreview（同时侧边栏内该博客高亮）
3. ContentArea 显示空状态直到用户选择博客

### 场景 3：用户从博客预览返回
1. 如果之前在目录模式 → 返回 PageList
2. 如果之前在最近模式 → ContentArea 保持空状态（用户需要重新选择）

## 文件变更

| 操作 | 文件路径 |
|------|----------|
| 新建 | `apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx` |
| 新建 | `apps/web/src/pages/blogs/components/sidebar/recent-blog-list.tsx` |
| 修改 | `apps/web/src/pages/blogs/components/sidebar/index.tsx` |
| 修改 | `apps/web/src/pages/blogs/components/content/index.tsx` |
| 修改 | `apps/web/src/pages/blogs/blogs.tsx` |

## 实现顺序

1. 创建 SidebarTabs 组件（Tab 头部）
2. 创建 RecentBlogList 组件（侧边栏内的最近列表）
3. 重构 Sidebar 组件（添加 Tab 切换逻辑）
4. 更新 ContentArea（处理空状态和简化 mode）
5. 更新 blogs.tsx（调整状态传递）
6. 删除或保留 RecentList 组件（如果完全重构则删除）

## 迁移注意事项

1. 保持 `onNewBlog` 和 `onNewDirectory` 的功能正常
2. 保持拖拽功能正常（如果已实现）
3. 保持搜索功能正常
4. URL 路由逻辑保持不变
