# 博客管理系统设计文档

## 概述

博客管理系统是一个支持富文本编辑、目录管理、标签分类的博客内容管理平台。用户可以通过可视化的 Tiptap 编辑器创建和编辑博客，支持图片、音频、视频（YouTube 嵌入）和表格。

## 侧边栏结构

在现有侧边栏中新增博客入口，放在第二位（备忘录之后）：

```
[Logo] → [备忘录] → [博客📝] → [任务编排] → [通知中心] → [GitHub] → [设置/主题/用户]
```

## 页面结构

### 1. 博客列表页 (`/blogs`)

```
┌─────────────────────────────────────────────────────────┐
│  侧边栏  │  博客列表页面                                   │
│          │  ┌──────────┬─────────────────────────────┐  │
│  Logo    │  │ 目录树     │  标签筛选                    │  │
│          │  │ ├ 目录1    │  [Tag1] [Tag2] [Tag3]     │  │
│  备忘录   │  │ ├ 目录2    ├─────────────────────────────┤  │
│  博客📝   │  │ └ 子目录    │  博客卡片列表               │  │
│  任务编排 │  │            │  [状态: 全部/已发布/草稿]   │  │
│  通知    │  │ [+ 新建目录] │                             │  │
│  GitHub  │  │            │  [+ 新建博客]               │  │
│  设置    │  │ 标签管理     │                             │  │
│          │  └──────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**功能：**
- 左侧：目录树（支持展开/折叠）+ 标签管理入口
- 右侧：博客卡片列表，支持状态筛选
- 新建博客按钮跳转到编辑器
- 目录树支持右键菜单（重命名/删除）

### 2. 博客编辑器 (`/blogs/editor/:id?`)

```
┌─────────────────────────────────────────────────────────┐
│  侧边栏  │  编辑器页面                                      │
│          │  ┌────────────────────────────────────────┐   │
│  Logo    │  │ 标题输入框                      [存草稿] [发布] │
│          │  ├────────────────────────────────────────┤   │
│  备忘录   │  │ 目录: [选择目录 ▼]   标签: [选择标签 ▼]      │   │
│  博客📝   │  ├────────────────────────────────────────┤   │
│  任务编排 │  │ 富文本工具栏                             │   │
│  通知    │  │ [B][I][U][S][H1][H2][H3][列表][引言][代码] │   │
│  GitHub  │  │ [表格][图片][音频][视频][链接]             │   │
│  设置    │  ├────────────────────────────────────────┤   │
│          │  │                                        │   │
│          │  │           Tiptap 编辑区域               │   │
│          │  │                                        │   │
│          │  └────────────────────────────────────────┘   │
│          │  [✓ 已自动保存 12:30]  [⌘S 保存]             │
└─────────────────────────────────────────────────────────┘
```

**功能：**
- 标题输入
- 目录和标签选择
- Tiptap 富文本编辑器
- 保存草稿 / 发布按钮
- 自动保存 + 快捷键保存

## 核心功能

### 目录管理
- 支持创建/重命名/删除目录
- 支持多级子目录（树形结构）
- 博客可归属于某个目录（可选）

### 标签管理
- 创建/编辑/删除标签
- 标签支持颜色标记
- 博客可关联多个标签

### 博客列表
- 按目录筛选
- 按标签筛选
- 按状态筛选（全部/已发布/草稿）
- 搜索功能

### 富文本编辑
- 使用 Tiptap 3.21
- 支持的扩展：
  - `@tiptap/starter-kit` - 基础格式化（粗体、斜体、列表等）
  - `@tiptap/extension-image` - 图片（含 Base64 支持）
  - `@tiptap/extension-table` + `TableRow` + `TableHeader` + `TableCell` - 表格
  - `@tiptap/extension-audio` - 音频
  - `@tiptap/extension-youtube` - YouTube 视频嵌入
- 图片/音频/视频上传到现有 MinIO

### 实时保存
- 内容变化时自动保存（防抖 3 秒）
- Command/Ctrl + S 快捷键保存
- 显示保存状态

## 数据库实体

### Blog
| 字段 | 类型 | 描述 |
|------|------|------|
| id | uuid | 主键 |
| title | varchar(255) | 标题 |
| content | json | Tiptap JSON 内容 |
| excerpt | text | 摘要（可选） |
| directoryId | uuid (FK) | 所属目录，可空 |
| status | enum | 'draft' \| 'published' |
| publishedAt | datetime | 发布时间，可空 |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

### Directory
| 字段 | 类型 | 描述 |
|------|------|------|
| id | uuid | 主键 |
| name | varchar(100) | 目录名 |
| parentId | uuid (FK) | 父目录，可空（顶级目录） |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

### Tag
| 字段 | 类型 | 描述 |
|------|------|------|
| id | uuid | 主键 |
| name | varchar(50) | 标签名 |
| color | varchar(7) | 颜色（hex） |
| createdAt | datetime | 创建时间 |

### BlogTag (M2M)
| 字段 | 类型 | 描述 |
|------|------|------|
| blogId | uuid (FK) | 博客外键 |
| tagId | uuid (FK) | 标签外键 |

## API 设计

### 博客相关
- `GET /api/blogs` - 获取博客列表（支持目录、标签、状态筛选）
- `GET /api/blogs/:id` - 获取博客详情
- `POST /api/blogs` - 创建博客
- `PUT /api/blogs/:id` - 更新博客
- `DELETE /api/blogs/:id` - 删除博客
- `POST /api/blogs/:id/publish` - 发布博客
- `POST /api/blogs/:id/unpublish` - 取消发布

### 目录相关
- `GET /api/blogs/directories` - 获取目录树
- `POST /api/blogs/directories` - 创建目录
- `PUT /api/blogs/directories/:id` - 更新目录
- `DELETE /api/blogs/directories/:id` - 删除目录

### 标签相关
- `GET /api/blogs/tags` - 获取标签列表
- `POST /api/blogs/tags` - 创建标签
- `PUT /api/blogs/tags/:id` - 更新标签
- `DELETE /api/blogs/tags/:id` - 删除标签

### 文件上传
- `POST /api/upload` - 上传文件到 MinIO，返回 URL

## 技术实现

### 前端
- 复用现有 `@rabjs/react` 服务层模式
- 新增 BlogService、DirectoryService、TagService
- Tiptap 3.21 + React 扩展
- 上传组件调用现有 MinIO 上传服务

### 后端
- 新增 Blog/Directory/Tag 实体 + Drizzle ORM
- RESTful API
- Socket.io 实时保存状态推送（可选）

## 文件结构

```
apps/web/src/
├── pages/
│   └── blogs/
│       ├── index.tsx          # 博客列表页
│       ├── blogs.tsx          # 博客列表组件
│       ├── editor/
│       │   ├── index.tsx      # 编辑器页
│       │   └── editor.tsx     # 编辑器组件
│       ├── components/
│       │   ├── directory-tree.tsx
│       │   ├── tag-filter.tsx
│       │   ├── blog-card.tsx
│       │   ├── editor-toolbar.tsx
│       │   └── ...
│       └── services/
│           ├── blog.service.ts
│           ├── directory.service.ts
│           └── tag.service.ts

apps/server/src/
├── controllers/
│   └── blogs.controller.ts
├── services/
│   └── blog.service.ts
├── actions/
│   └── blog.action.ts
├── db/
│   └── schema/
│       ├── blogs.ts
│       ├── directories.ts
│       └── tags.ts
```
