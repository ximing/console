# 目录详情视图重构设计

## 概述

优化博客目录详情视图的样式，实现卡片/列表切换功能，统一 padding 和布局，解决对齐问题。

## 现状问题

1. **内容区域无 padding** - PageList 和 RecentList 直接贴边显示
2. **Header 混乱** - 返回按钮、标题、筛选条件布局不统一
3. **BlogCard 对齐问题** - 使用 `ml-7` 硬编码导致图标与文字不对齐
4. **缺少视图切换** - 只有卡片视图，无列表选项

## 目标

1. 支持卡片/列表两种视图切换
2. 统一内容区域 padding (`px-6 py-4`)
3. 重构 Header 结构，清晰分离标题区和操作区
4. 修复 BlogCard 内部对齐问题
5. 新建 BlogListItem 组件实现详细列表视图

## 布局结构

```
ContentArea (px-6 py-4, flex-col, h-full)
├── Header (pb-4 mb-4 border-b)
│   ├── Left: BackButton + Title + BlogCount Badge
│   └── Right: ViewToggle + SortDropdown
├── FilterBar (mb-4) [仅 directory 模式]
│   └── StatusFilter | TagFilter | ClearFilters
└── Content
    └── BlogGridView (grid gap-4 md:grid-cols-2 lg:grid-cols-3)
       或 BlogListView (divide-y)
```

## 组件设计

### 1. PageListHeader

| 区域 | 内容 |
|------|------|
| 左侧 | 返回按钮 + 标题 + 博客数量徽章 |
| 右侧 | ViewToggle 组件 + SortDropdown |

```tsx
// 布局
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <BackButton />
    <Title />
    <CountBadge />
  </div>
  <div className="flex items-center gap-3">
    <ViewToggle />
    <SortDropdown />
  </div>
</div>
```

### 2. RecentListHeader

| 区域 | 内容 |
|------|------|
| 左侧 | 图标 + "最近博客" 标题 |
| 右侧 | ViewToggle |

### 3. ViewToggle 组件

- 两个图标按钮：Grid (当前) / List
- 当前视图高亮：`bg-primary-100 dark:bg-primary-900/30 text-primary-600`
- 非当前视图：`hover:bg-gray-100 dark:hover:bg-dark-700`

### 4. BlogListItem 组件（新建）

用于列表视图，每行显示：

```
┌─────────────────────────────────────────────────────────────┐
│ [FileIcon] 标题                                    2小时前 │
│           摘要文字...                                        │
│           [目录] [已发布] [Tag1] [Tag2]                     │
└─────────────────────────────────────────────────────────────┘
```

**样式：**
- `px-4 py-3`
- `border-b border-gray-200 dark:border-dark-700`
- `hover:bg-gray-50 dark:hover:bg-dark-700`
- 标题：font-semibold, line-clamp-1
- 摘要：text-sm, text-gray-500, line-clamp-2
- 使用 flex 布局而非 ml-7 硬编码

### 5. BlogCard 优化

修复对齐问题：
- 移除 `ml-7` 硬编码
- 使用 flex 布局让图标和文字并排对齐
- 保持现有样式和交互

## 视图状态管理

```tsx
type ViewMode = 'card' | 'list';

// PageList 和 RecentList 共享视图状态
interface PageListProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // ...其他 props
}
```

## 统一间距规范

| 区域 | 样式 |
|------|------|
| ContentArea 容器 | `px-6 py-4` |
| Header | `pb-4 mb-4 border-b border-gray-200 dark:border-dark-700` |
| FilterBar | `mb-4` |
| Card Grid | `grid gap-4 md:grid-cols-2 lg:grid-cols-3` |
| List View | `divide-y divide-gray-200 dark:divide-dark-700` |

## 文件变更

| 操作 | 文件路径 |
|------|----------|
| 新建 | `apps/web/src/pages/blogs/components/blog-list-item.tsx` |
| 新建 | `apps/web/src/pages/blogs/components/view-toggle.tsx` |
| 修改 | `apps/web/src/pages/blogs/components/content/page-list.tsx` |
| 修改 | `apps/web/src/pages/blogs/components/content/recent-list.tsx` |
| 修改 | `apps/web/src/pages/blogs/components/content/index.tsx` |
| 修改 | `apps/web/src/pages/blogs/components/blog-card.tsx` |

## 实现顺序

1. 创建 ViewToggle 组件
2. 创建 BlogListItem 组件
3. 修改 PageList：添加 Header、ViewToggle、修复 padding
4. 修改 RecentList：添加 Header、ViewToggle、修复 padding
5. 修改 BlogCard：修复 ml-7 对齐问题
6. 修改 ContentArea：传递 viewMode 状态
7. 测试两种视图切换和样式一致性
