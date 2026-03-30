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
├── TabHeader (固定在顶部)
│   ├── Tab: 目录 (active/inactive)
│   └── Tab: 最近 (active/inactive)
├── SearchButton (始终显示，不受 Tab 影响)
├── TabContent (目录模式) - 当 activeTab === 'directory'
│   ├── DirectoryTree
│   └── ActionButtons (新建博客, 新建目录)
└── TabContent (最近模式) - 当 activeTab === 'recent'
    └── RecentBlogList
```

**SearchButton 始终显示**，不受 Tab 切换影响，在目录树和最近列表上方。

### ContentMode 简化

```tsx
// 移除 'recent' 模式
type ContentMode = 'directory' | 'preview' | 'edit';
```

### 状态管理

**blogs.tsx (父组件) 管理的状态：**
```tsx
const [activeTab, setActiveTab] = useState<'directory' | 'recent'>('directory');
```

**Sidebar 内部状态：**
- `activeTab` 由父组件控制，通过 props 传入
- Tab 切换通过 `onTabChange` 回调通知父组件

**Sidebar → ContentArea 通信：**
通过 `onSelectPage` 和 `onSelectDirectory` 回调。当用户：
- 在目录 Tab 点击目录 → 调用 `onSelectDirectory(directoryId)`
- 在目录 Tab 点击博客 → 调用 `onSelectPage(blogId)`
- 在最近 Tab 点击博客 → 调用 `onSelectPage(blogId)`（同时记录 `lastActiveTab = 'recent'`）

**ContentArea 显示逻辑：**
```tsx
if (mode === 'edit') {
  return <InlineBlogEditor />;
}
if (mode === 'preview' && selectedPageId) {
  return <PagePreview pageId={selectedPageId} />;
}
if (mode === 'directory' && selectedDirectoryId) {
  return <PageList />;
}
// 默认（目录模式但未选目录，或最近模式未选博客）：
return <EmptyState />;
```

### URL 路由

URL 用于分享和书签，始终指向当前博客：
- `/blogs/:blogId` - 预览博客
- `/blogs/:blogId/edit` - 编辑博客
- `/blogs` - 默认视图（显示目录 Tab）

**空状态时的 URL：** `/blogs`（不选任何目录或博客）

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
3. 点击某个博客 → ContentArea 显示 PagePreview，URL 更新为 `/blogs/:blogId`

### 场景 2：用户点击最近 Tab
1. Sidebar 显示最近博客列表
2. Sidebar 内点击某个博客 → ContentArea 显示 PagePreview，URL 更新为 `/blogs/:blogId`
3. ContentArea 初始显示空状态直到用户选择博客

### 场景 3：PagePreview 的返回按钮
当用户点击 PagePreview 的返回按钮：
- **来自目录模式** → 返回 PageList（`contentMode = 'directory'`）
- **来自最近模式** → 返回空状态（`contentMode` 保持，但 `selectedPageId` 置空）

**实现方式：** PagePreview 接收一个 `onBack` 回调，由父组件根据 `lastActiveTab` 决定如何处理。

### 场景 4：在最近 Tab 下新建博客
当用户在最近 Tab 下点击"新建博客"：
1. 博客创建在根级别（`directoryId = null`）
2. 创建后跳转到编辑模式 `/blogs/:newBlogId/edit`
3. 最近 Tab 的列表自动刷新显示新博客

### 场景 5：Tab 切换时保留状态
- 切换 Tab 时，保留当前选中的博客/目录
- 例如：在最近 Tab 选中了博客 A，切换到目录 Tab，再切换回最近 Tab，博客 A 仍然高亮

**实现：** 在 `blogs.tsx` 中维护 `lastSelectedBlogId` 和 `lastSelectedDirectoryId`，切换 Tab 时恢复对应选择。

### 场景 6：Deep Linking（URL 到 Tab 的映射）
当用户访问 `/blogs/:blogId` 时：
1. 加载博客详情
2. 根据博客的 `directoryId` 决定显示哪个 Tab：
   - 如果博客有 `directoryId` → 自动切换到"目录" Tab，并选中该目录
   - 如果博客没有 `directoryId`（根级博客）→ 自动切换到"最近" Tab
3. ContentArea 显示 PagePreview

### 场景 7：搜索行为
- SearchButton 点击后打开 SearchModal
- SearchModal 显示所有博客的搜索结果
- 用户选择博客后：
  - 如果博客在目录中 → 切换到"目录" Tab，选中对应目录，ContentArea 预览博客
  - 如果博客是根级 → 切换到"最近" Tab，ContentArea 预览博客

### 场景 8：空状态变体
ContentArea 显示空状态时，根据当前 Tab 显示不同提示：

```tsx
// 目录 Tab，未选目录
<div className="flex flex-col items-center justify-center h-full text-gray-500">
  <Folder className="w-12 h-12 mb-4 opacity-50" />
  <p>请选择一个目录</p>
</div>

// 最近 Tab，未选博客
<div className="flex flex-col items-center justify-center h-full text-gray-500">
  <Clock className="w-12 h-12 mb-4 opacity-50" />
  <p>请在侧边栏选择一个博客</p>
</div>
```

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

1. **保持 `onNewBlog` 和 `onNewDirectory` 的功能正常**
   - 目录 Tab：新建博客到当前目录，新建目录到当前目录
   - 最近 Tab：新建博客到根级别，新建目录到根级别

2. **保持拖拽功能正常**（如果已实现）
   - 拖拽博客到目录树下移动到目录
   - 拖拽博客到根区域移动到根级别

3. **保持搜索功能正常**
   - SearchButton 始终可见，不受 Tab 影响

4. **URL 路由逻辑保持不变**
   - 分享链接仍然指向具体博客

5. **删除废弃组件**
   - `RecentList` 组件可删除（或保留供其他页面使用）
   - `blogs.tsx` 中的 `contentMode === 'recent'` 判断可移除

## ContentArea Props 变更

```tsx
interface ContentAreaProps {
  mode: ContentMode;  // 'directory' | 'preview' | 'edit'
  activeTab: 'directory' | 'recent';  // 用于决定空状态提示文字
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  directoryBlogs: BlogDto[];
  directoryLoading: boolean;
  onBack: () => void;  // 统一的返回处理
  onSelectPage: (pageId: string) => void;
  onEditPage?: (blog: BlogDto) => void;
}
```

**onBack 行为：**
- 如果 `mode === 'preview'`：返回空状态（`selectedPageId` 置空）
- 如果 `mode === 'directory'` 且 `selectedDirectoryId` 存在：返回空状态
- ContentArea 不需要知道用户之前在哪个 Tab，只关心当前状态
