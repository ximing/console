# 目录预览界面筛选功能设计

## 需求概述

在点击左侧目录时，右侧预览界面增加本地筛选功能。这些筛选操作仅影响右侧预览区域，不影响左侧目录树的选择状态。

## 设计方案

### 位置
在 `PageList` 组件顶部添加筛选栏，位于返回按钮和目录标题下方。

### 筛选控件

#### 1. 状态过滤
- 类型：按钮组
- 选项：全部 | 已发布 | 草稿
- 默认：全部

#### 2. 标签过滤
- 类型：下拉多选框
- 选项来源：从当前目录下所有博客的标签中动态提取并去重
- 默认：空（显示全部）

#### 3. 排序
- 类型：下拉选择
- 选项：
  - 更新时间↓（最新在前）
  - 创建时间↓
  - 标题 A-Z
- 默认：更新时间↓

### 实现细节

#### 组件内部状态
```typescript
const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
```

#### 过滤逻辑
- 状态过滤：根据 `blog.status` 筛选
- 标签过滤：博客需包含所有选中标签（AND 逻辑）
- 排序：根据 `sortBy` 字段排序

#### 标签动态提取
```typescript
const availableTags = useMemo(() => {
  const tagSet = new Set<string>();
  blogs.forEach(blog => blog.tags.forEach(tag => tagSet.add(tag.name)));
  return Array.from(tagSet).sort();
}, [blogs]);
```

#### 目录切换时重置
当 `directoryId` 变化时，重置所有筛选条件为默认值。

### UI 布局

```
┌─────────────────────────────────────────────────────────────┐
│ ← 返回   目录名称                                            │
├─────────────────────────────────────────────────────────────┤
│ [全部] [已发布] [草稿]  |  标签: ▼多选  |  排序: ▼更新↓    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────┐  ┌─────┐  ┌─────┐                                 │
│  │博客1│  │博客2│  │博客3│                                 │
│  └─────┘  └─────┘  └─────┘                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 涉及文件

- `apps/web/src/pages/blogs/components/content/page-list.tsx` — 主要修改
- 可能需要新增下拉多选组件或复用现有组件

## 状态

待实现
