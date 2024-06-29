# GitHub 仓库集成设计文档

**日期：** 2026-03-08
**状态：** 已批准

## 概述

在侧边栏新增 GitHub 入口，允许用户关联一个或多个 GitHub 仓库（支持私有仓库），通过浏览器内文件树浏览和编辑仓库文件，并提交代码。

## 技术选型

| 功能 | 方案 |
|------|------|
| GitHub 认证 | Personal Access Token (PAT) |
| GitHub API 调用 | `@octokit/rest`（官方 JS SDK，支持浏览器直连，无跨域问题） |
| 代码编辑器 | `@uiw/react-codemirror` + 语言扩展包 |
| 文件树状态 | 内存 state（`@rabjs/react` Service） |
| PAT 存储 | 后端 MySQL，AES-256-GCM 加密 |

## 页面布局

```
┌─────────┬──────────────────────────────────────────────────────┐
│ Sidebar │  [Select 仓库 ▼]  [分支: main ▼]  [提交]            │
│  (70px) ├─────────────────────┬────────────────────────────────│
│         │  文件树侧边栏        │  编辑区域                      │
│  [GH]   │  (240px)            │  CodeMirror 6                  │
│         │  ├── src/           │                                │
│         │  │   ├── index.ts   │  // 文件内容在这里编辑          │
│         │  │   └── app.ts     │                                │
│         │  └── package.json   │                                │
└─────────┴─────────────────────┴────────────────────────────────┘
```

## 数据模型

### 新增表：`github_repos`

```sql
id          varchar(191)  PK
user_id     varchar(191)  FK -> users.id (onDelete: cascade)
name        varchar(255)  -- 显示名，如 "my-project"
full_name   varchar(255)  -- owner/repo，如 "alice/my-project"
pat         varchar(500)  -- AES-256-GCM 加密后的 PAT
created_at  timestamp
updated_at  timestamp
```

## 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/github/repos` | 获取当前用户的仓库列表 |
| `POST` | `/api/v1/github/repos` | 添加仓库（name + full_name + pat） |
| `PUT` | `/api/v1/github/repos/:id` | 更新仓库信息 |
| `DELETE` | `/api/v1/github/repos/:id` | 删除仓库 |
| `GET` | `/api/v1/github/repos/:id/token` | 获取解密后的 PAT |

## 前端文件结构

```
apps/web/src/pages/github/
├── index.tsx                    # 路由入口
├── github.tsx                   # 页面主组件
├── github.service.ts            # 页面级 Service（@rabjs/react）
├── github.api.ts                # 后端 API 调用
└── components/
    ├── repo-selector.tsx        # 顶部仓库 Select + 分支 Select
    ├── file-tree.tsx            # 左侧文件树（递归展开）
    ├── file-editor.tsx          # 右侧 CodeMirror 编辑器
    ├── commit-dialog.tsx        # 提交 commit message 弹窗
    └── repo-manager.tsx         # 添加/删除仓库的管理面板
```

## 前端状态（GithubService）

```typescript
class GithubService {
  repos: GithubRepo[]                    // 用户关联的仓库列表
  selectedRepo: GithubRepo | null        // 当前选中的仓库
  selectedBranch: string                 // 当前分支
  branches: string[]                     // 仓库的所有分支
  fileTree: FileTreeNode[]               // 文件树（内存，全量加载）
  activeFile: OpenFile | null            // 当前编辑的文件
  pendingChanges: Map<string, string>    // 未提交的修改 path -> content
}
```

## 用户操作流程

1. 点击侧边栏 GitHub 图标 → 进入 `/github` 页面
2. 首次进入 → 显示"添加仓库"引导，填写 `owner/repo` 和 PAT
3. 选择仓库 → 自动加载文件树和分支列表
4. 点击文件 → 调 GitHub API 获取内容，在 CodeMirror 中打开
5. 编辑文件 → 修改存入 `pendingChanges`
6. 点击"提交" → 弹出 commit message 对话框 → 调 GitHub API `PUT /contents` 提交

## GitHub API 调用（@octokit/rest）

- 文件树：`GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`
- 文件内容：`GET /repos/{owner}/{repo}/contents/{path}`
- 提交文件：`PUT /repos/{owner}/{repo}/contents/{path}`（需传 sha + base64 content）
- 分支列表：`GET /repos/{owner}/{repo}/branches`

## 关键细节

### PAT 加密
使用 Node.js 内置 `crypto` 模块，AES-256-GCM 加密，密钥从环境变量 `ENCRYPTION_KEY` 读取（32字节）。

### 文件树加载
使用 `?recursive=1` 一次获取完整 flat 文件列表，前端在内存中构建树形结构。

### 文件内容编码
GitHub API 返回 Base64 编码内容，前端用 `atob()` 解码展示，提交时用 `btoa()` 编码，并携带文件当前 `sha`。

### CodeMirror 语言检测
根据文件扩展名自动选择语言包：`.ts/.tsx` → TypeScript，`.js/.jsx` → JavaScript，`.json` → JSON，`.md` → Markdown，`.css` → CSS，其余降级为纯文本。

### 错误处理
- PAT 无效或权限不足 → 提示"Token 无效，请重新配置"
- 文件提交冲突（sha 不匹配）→ 提示"文件已被远程修改，请重新加载"
- GitHub API rate limit → 提示"请求过于频繁，请稍后重试"

### 侧边栏入口
在 `layout.tsx` 导航区增加 `Github` 图标（lucide-react），点击导航到 `/github`，激活状态与其他导航项一致。
