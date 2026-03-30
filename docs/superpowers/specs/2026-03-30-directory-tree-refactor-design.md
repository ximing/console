# Directory Tree 重构设计方案

## 1. 概述

用自定义递归组件配合 @dnd-kit 重构 blogs 左侧目录树区域，替代当前有问题的 react-arborist 实现。

## 2. URL 设计

| 状态 | URL | 说明 |
|------|-----|------|
| 无选中 | `/blogs` | 显示最近博客列表 |
| 目录选中 | `/blogs?dir=:dirId` | 显示指定目录下的博客列表 |
| 博客选中 | `/blogs/:blogId` | 显示博客预览 |

**刷新定位逻辑：**
- `/blogs/:blogId` → 加载博客，从 `blog.directoryId` 获取所属目录，自动展开目录并高亮博客
- `/blogs?dir=:dirId` → 加载该目录下的博客，高亮目录

**定位实现：**
1. 解析 URL 获取 blogId 或 dirId
2. 如果是 blogId：调用 `blogService.loadBlog(blogId)` 获取 `directoryId`
3. 设置 `expandedIds` 包含目标目录
4. 设置 `selectedPageId` 或 `selectedDirectoryId`

## 3. 技术栈

- **@dnd-kit/core** - 拖拽交互（不用 @dnd-kit/sortable，因为它是列表排序用的，不适合树形结构跨容器拖拽）
- **自定义递归组件** - 树形结构渲染
- **原生 React hooks** - 状态管理

**@dnd-kit 树形拖拽方案：**
- 使用 `closestCenter` 或自定义 `rectIntersection` collision detection
- 区分 `DragOverlay`（视觉反馈）和实际 drop 逻辑
- 博客拖入目录节点 = 移动博客到该目录
- 博客拖入博客节点 = 移动博客到根级（因为博客不能嵌套在博客下）

## 4. 组件结构

```
components/directory-tree/
├── index.tsx              # 根组件，管理展开状态，管理拖放上下文
├── TreeNode.tsx           # 递归节点，判断渲染目录还是博客
├── NodeContent.tsx        # 节点内容（图标、名称、hover 按钮）
├── ContextMenu.tsx        # 右键菜单
├── DragOverlay.tsx        # 拖拽时的视觉反馈
├── types.ts               # 类型定义
└── hooks/
    ├── useTreeState.ts    # 展开/收起状态
    └── useTreeDragDrop.ts # 拖放逻辑
```

## 5. 组件接口

### DirectoryTreeProps

```typescript
interface DirectoryTreeProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onContextMenuDirectory: (e: React.MouseEvent, nodeId: string, nodeName: string) => void;
  onContextMenuPage: (e: React.MouseEvent, blogId: string) => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
}
```

注：`onContextMenuDirectory` 传递 `nodeId` 和 `nodeName`，因为目录重命名时需要显示当前名称。

## 6. 交互设计

### 6.1 展开/收起
- 点击目录行任意位置（除按钮外）切换展开状态
- 状态保存在组件内部 `useState<Set<string>>(new Set())`
- 初始化时根据 URL 自动展开对应目录

### 6.2 选择
- 点击目录 → 调用 `onSelectDirectory(id)`，同时清空 `selectedPageId`
- 点击博客 → 调用 `onSelectPage(id)`，同时清空 `selectedDirectoryId`
- 点击"全部博客" → 调用 `onSelectDirectory(null)`

### 6.3 拖拽
- **拖拽源：** 目录节点、博客节点
- **拖拽目标：** 目录节点（博客可移入）、根级区域（博客/目录可移出）
- **视觉反馈：** 拖拽时显示半透明副本，目标位置显示放置指示器

**拖放处理：**
```typescript
// 博客拖入目录 → blogService.moveBlog(blogId, directoryId)
// 博客拖入根级 → blogService.moveBlog(blogId, null)
// 目录拖入其他目录 → directoryService.updateDirectory(dirId, { parentId: targetId })
// 目录拖入根级 → directoryService.updateDirectory(dirId, { parentId: null })
```

**校验：**
- 不能把目录拖入自己的子目录中（会导致循环引用）
- 不能把博客拖入自己所在的目录（无意义操作）

**拖放边界情况：**
- 拖入折叠的目录节点 → 作为该目录的子节点放下（无需展开）
- 拖入博客节点 → 移动博客到根级（博客不能嵌套在博客下）
- 拖入空白区域 → 移动到根级

**右键菜单交互：**
- 点击菜单外部 → 关闭菜单
- 按 Escape 键 → 关闭菜单

### 6.4 Hover 快捷操作

**目录节点 hover 时显示：**
- + 按钮 → 在当前目录新建博客
- 文件夹+ 按钮 → 在当前目录新建子目录

**博客节点 hover 时显示：**
- 无快捷操作（编辑通过右键菜单或点击进入预览）

### 6.5 右键菜单

**目录右键菜单：**
1. 新建博客 → 调用 `onNewBlog(dirId)`
2. 新建子目录 → 调用 `onNewDirectory(dirId)`
3. 重命名 → 弹出 prompt
4. 删除 → confirm 确认后删除

**博客右键菜单：**
1. 编辑 → 导航到 `/blogs/:blogId/edit`
2. 移动到... → 弹出 prompt 输入目标目录 ID
3. 删除 → confirm 确认后删除

## 7. 状态管理

### 内部状态
```typescript
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
```

### 外部状态（由父组件管理）
```typescript
const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(null);
const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
```

## 8. 样式

使用 Tailwind CSS，遵循现有设计风格：
- 选中态：`bg-primary-100 dark:bg-primary-900/30`
- Hover：`hover:bg-gray-100 dark:hover:bg-dark-800`
- 目录图标：黄色文件夹
- 博客图标：蓝色文件

## 9. 依赖变更

**移除：**
- react-arborist

**新增：**
- @dnd-kit/core
- @dnd-kit/utilities

## 10. 待确认问题

**Q1: 拖放是否支持跨目录移动博客？**
A: 支持，博客拖入不同目录的节点即可移动。

**Q2: 拖放是否改变目录的父子关系？**
A: 是，目录可以拖入其他目录成为其子目录。

**Q3: 删除目录时其中的博客如何处理？**
A: 博客保留在原位置（不随目录删除），目录删除后博客变成根级博客。

## 11. 未来优化方向（本期不做）

- 键盘导航（方向键遍历、Enter 选中/展开）
- 展开/收起动画
- 拖拽排序时显示位置指示线

## 12. 实现步骤

1. 创建组件结构，定义类型
2. 实现 TreeNode 递归组件
3. 集成 @dnd-kit 拖拽
4. 实现右键菜单
5. 实现 URL 初始化定位逻辑
6. 移除 react-arborist

## 13. 状态

待实现
