# PRD: GitHub 仓库集成

## Introduction

在侧边栏新增 GitHub 入口，允许用户关联一个或多个 GitHub 仓库（支持私有仓库），通过浏览器内文件树浏览和编辑仓库文件，并提交代码。用户可以直接在 X-Console 中管理 GitHub 仓库，无需切换到其他工具。

## Goals

- 在侧边栏添加 GitHub 导航入口，点击进入 `/github` 页面
- 支持用户通过 PAT（Personal Access Token）关联多个 GitHub 仓库（含私有仓库）
- 提供文件树浏览功能，展示仓库目录结构
- 支持多 Tab 同时打开多个文件，每个 Tab 独立编辑
- 支持在 CodeMirror 编辑器中查看和编辑文件内容
- 支持通过右键菜单在文件树中创建新文件、删除文件
- 支持批量提交修改（含新建/删除，可勾选部分文件），使用 Git Tree API 实现原子提交
- PAT 在后端 MySQL 中以 AES-256-GCM 加密存储

## User Stories

### US-001: 数据库迁移 - 新增 github_repos 表
**Description:** As a developer, I need to store GitHub repo configurations so users can persist their repo associations.

**Acceptance Criteria:**
- [ ] 新增 `github_repos` 表，字段：`id`（varchar 191 PK）、`user_id`（FK -> users.id, onDelete cascade）、`name`（varchar 255）、`full_name`（varchar 255）、`pat`（varchar 500，加密存储）、`created_at`、`updated_at`
- [ ] 生成并运行 Drizzle 迁移，迁移成功无报错
- [ ] Typecheck 通过

### US-002: 后端 API - CRUD 仓库管理
**Description:** As a developer, I need REST API endpoints to manage GitHub repo configurations for users.

**Acceptance Criteria:**
- [ ] `GET /api/v1/github/repos` 返回当前用户的仓库列表（不含解密 PAT）
- [ ] `POST /api/v1/github/repos` 接收 `{ name, full_name, pat }`，将 PAT 用 AES-256-GCM 加密后存储
- [ ] `PUT /api/v1/github/repos/:id` 支持更新 name、full_name、pat
- [ ] `DELETE /api/v1/github/repos/:id` 删除仓库记录
- [ ] `GET /api/v1/github/repos/:id/token` 返回解密后的 PAT（仅供前端调用 GitHub API 使用）
- [ ] 所有接口需鉴权，只能操作当前用户的数据
- [ ] AES-256-GCM 加密密钥从环境变量 `ENCRYPTION_KEY`（32 字节）读取
- [ ] Typecheck 通过

### US-003: 前端 API 层 - github.api.ts
**Description:** As a developer, I need a frontend API module to call the backend GitHub repo endpoints.

**Acceptance Criteria:**
- [ ] 创建 `apps/web/src/pages/github/github.api.ts`
- [ ] 导出函数：`getRepos()`、`addRepo(data)`、`updateRepo(id, data)`、`deleteRepo(id)`、`getToken(id)`
- [ ] 使用项目现有的 API client 工具（参考其他页面的 `.api.ts` 文件）
- [ ] Typecheck 通过

### US-004: GithubService 状态管理
**Description:** As a developer, I need a reactive service to manage the GitHub page state using @rabjs/react, including multi-tab support.

**Acceptance Criteria:**
- [ ] 创建 `apps/web/src/pages/github/github.service.ts`
- [ ] 使用 `@rabjs/react` Service 模式，包含以下可观察状态：
  - `repos: GithubRepo[]`
  - `selectedRepo: GithubRepo | null`
  - `selectedBranch: string`
  - `branches: string[]`
  - `fileTree: FileTreeNode[]`
  - `openTabs: OpenTab[]` — 已打开的 Tab 列表，每项包含 `{ path, content, sha, isDirty, isNew }`（`isNew: true` 表示新建文件）
  - `activeTabPath: string | null` — 当前激活的 Tab 路径
  - `pendingChanges: Map<string, PendingChange>` — 所有待提交变更，key 为 path，value 为 `{ type: 'edit' | 'create' | 'delete', content?: string, sha?: string }`
- [ ] 提供方法：`loadRepos()`、`selectRepo(repo)`、`selectBranch(branch)`、`loadFileTree()`、`openFile(path)`、`closeTab(path)`、`setActiveTab(path)`、`updateFile(path, content)`、`createFile(path)`、`createDirectory(path)`、`deleteFile(path)`、`commitChanges(message, selectedPaths)`
- [ ] `openFile(path)`：若 Tab 已存在则切换激活，否则调用 GitHub API 获取内容（`atob()` 解码），新增 Tab
- [ ] `createFile(path)`：在 `pendingChanges` 中记录 `{ type: 'create', content: '' }`，在文件树内存中插入新文件节点，并新开一个空 Tab（`isNew: true`）
- [ ] `createDirectory(path)`：在文件树内存中插入新目录节点（注意：Git 不支持空目录，该目录仅存在于内存中，需在其下创建至少一个文件才能提交）
- [ ] `deleteFile(path)`：在 `pendingChanges` 中记录 `{ type: 'delete' }`，从文件树内存中移除节点，若该文件有打开的 Tab 则关闭
- [ ] `closeTab(path)`：若该 Tab 有未提交修改（`isDirty: true`），不直接关闭，由调用方处理确认逻辑
- [ ] `loadFileTree()` 使用 `@octokit/rest` 调用 `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`，在内存中构建树形结构
- [ ] `commitChanges(message, selectedPaths)` 使用 Git Tree API 原子提交：`createTree` → `createCommit` → `updateRef`；对于 `delete` 类型的文件，在 tree 中传入 `sha: null` 以删除
- [ ] Typecheck 通过

### US-005: 仓库管理面板组件（RepoManager）
**Description:** As a user, I want to add and delete GitHub repositories so that I can manage which repos I work with.

**Acceptance Criteria:**
- [ ] 创建 `apps/web/src/pages/github/components/repo-manager.tsx`
- [ ] 显示已关联仓库列表，每项有删除按钮
- [ ] 提供"添加仓库"表单，字段：显示名（name）、仓库路径（full_name，格式 `owner/repo`）、PAT
- [ ] 提交后调用 `addRepo()` API，成功后刷新列表
- [ ] 删除时调用 `deleteRepo()` API，成功后刷新列表
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-006: 顶部仓库和分支选择器（RepoSelector）
**Description:** As a user, I want to select a repository and branch from dropdowns so that I can navigate to the right codebase.

**Acceptance Criteria:**
- [ ] 创建 `apps/web/src/pages/github/components/repo-selector.tsx`
- [ ] 左侧 Select 显示所有已关联仓库列表，选中后触发 `selectRepo()`
- [ ] 右侧 Select 显示当前仓库的所有分支，选中后触发 `selectBranch()`
- [ ] 切换仓库时自动加载分支列表和文件树
- [ ] 切换分支时重新加载文件树
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-007: 左侧文件树组件（FileTree）
**Description:** As a user, I want to browse the repository file tree and manage files via right-click menu so that I can navigate, create, and delete files.

**Acceptance Criteria:**
- [ ] 创建 `apps/web/src/pages/github/components/file-tree.tsx`
- [ ] 展示仓库文件树，目录可展开/折叠
- [ ] 文件图标和目录图标视觉区分
- [ ] 点击文件触发 `openFile(path)`，加载文件内容到编辑器
- [ ] 当前打开的文件高亮显示
- [ ] 有未提交修改（`pendingChanges` 中存在）的文件显示修改标记（`M`）；新建文件显示 `+` 标记；待删除文件显示删除样式（文字删除线 + 红色）
- [ ] 右键点击**目录**弹出上下文菜单，菜单项："新建文件"、"新建目录"
  - 点击"新建文件"后弹出输入框让用户输入文件名，确认后调用 `createFile(dirPath + '/' + fileName)`
  - 点击"新建目录"后弹出输入框让用户输入目录名，确认后调用 `createDirectory(dirPath + '/' + dirName)`
- [ ] 右键点击**文件**弹出上下文菜单，菜单项："删除文件"
  - 点击后弹出确认对话框（"确认删除 xxx？"），用户确认后调用 `deleteFile(path)`
- [ ] 文件树宽度固定 240px
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-008: Tab 栏 + 代码编辑器组件（EditorArea）
**Description:** As a user, I want to open multiple files in tabs and edit them in a code editor so that I can work on several files at once.

**Acceptance Criteria:**
- [ ] 创建 `apps/web/src/pages/github/components/editor-area.tsx`，包含 Tab 栏和编辑器区域
- [ ] Tab 栏显示所有 `openTabs`，当前激活 Tab 高亮
- [ ] 有未提交修改的 Tab 标题显示 `•` 标记（`isDirty: true`）
- [ ] 点击 Tab 切换激活文件（`setActiveTab(path)`）
- [ ] Tab 右侧有关闭按钮（`×`）；点击关闭时，若 Tab 有未提交修改则弹出确认对话框（"有未保存修改，确认关闭？"），用户确认后调用 `closeTab(path)`
- [ ] 编辑区域使用 `@uiw/react-codemirror` 渲染当前激活 Tab 的内容
- [ ] 根据文件扩展名自动选择语言包：`.ts/.tsx` → TypeScript，`.js/.jsx` → JavaScript，`.json` → JSON，`.md` → Markdown，`.css` → CSS，其他 → 纯文本
- [ ] 编辑内容变更时调用 `updateFile(path, content)` 存入 `pendingChanges`，并将该 Tab 标记为 `isDirty: true`
- [ ] 无打开 Tab 时显示空状态提示（如"请从左侧选择文件"）
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-009: 提交对话框组件（CommitDialog）
**Description:** As a user, I want to select which modified files to commit, enter a commit message, and submit atomically so that I can save my edits to GitHub.

**Acceptance Criteria:**
- [ ] 创建 `apps/web/src/pages/github/components/commit-dialog.tsx`
- [ ] 点击顶部"提交"按钮弹出对话框；若 `pendingChanges` 为空，按钮禁用
- [ ] 对话框列出所有 `pendingChanges` 中的文件，每项有勾选框，默认全选；每项显示变更类型标记：`M`（编辑）、`+`（新建）、`-`（删除）
- [ ] 对话框包含 commit message 输入框（必填），未填写时提交按钮禁用
- [ ] 确认提交后调用 `commitChanges(message, selectedPaths)`，使用 Git Tree API 原子提交所有勾选文件
- [ ] 提交期间显示 loading 状态，防止重复点击
- [ ] 提交成功后关闭对话框，从 `pendingChanges` 中移除已提交文件，对应 Tab 的 `isDirty` 置为 `false`
- [ ] 提交失败显示错误信息（sha 不匹配："文件已被远程修改，请重新加载"；其他错误显示原始 message）
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-010: GitHub 页面主组件和路由
**Description:** As a user, I want to navigate to the GitHub page from the sidebar and see the full editor layout with tab support.

**Acceptance Criteria:**
- [ ] 创建 `apps/web/src/pages/github/github.tsx` 主组件，布局：顶部工具栏（RepoSelector + 提交按钮）+ 左侧文件树（240px）+ 右侧 EditorArea（Tab 栏 + 编辑器）
- [ ] 创建 `apps/web/src/pages/github/index.tsx` 路由入口
- [ ] 在路由配置中注册 `/github` 路由
- [ ] 首次进入且无仓库时，显示 RepoManager 引导添加仓库
- [ ] 有仓库时显示完整编辑器布局
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-011: 侧边栏添加 GitHub 入口
**Description:** As a user, I want to click a GitHub icon in the sidebar to navigate to the GitHub page.

**Acceptance Criteria:**
- [ ] 在 `layout.tsx` 导航区增加 GitHub 图标（使用 lucide-react 的 `Github` 图标）
- [ ] 点击图标导航到 `/github`
- [ ] 激活状态（高亮）与其他导航项行为一致
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-012: 错误处理
**Description:** As a user, I want to see clear error messages when GitHub API calls fail so that I know what went wrong.

**Acceptance Criteria:**
- [ ] PAT 无效或权限不足时显示提示："Token 无效，请重新配置"
- [ ] 文件提交 sha 不匹配时显示提示："文件已被远程修改，请重新加载"
- [ ] GitHub API rate limit 时显示提示："请求过于频繁，请稍后重试"
- [ ] 错误提示使用项目现有的 Toast/通知组件
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 系统必须在 MySQL 中存储 `github_repos` 表，PAT 字段使用 AES-256-GCM 加密
- FR-2: 系统必须提供 5 个后端 API 端点管理仓库配置（CRUD + token 获取）
- FR-3: 系统必须支持用户关联多个 GitHub 仓库，包括私有仓库
- FR-4: 系统必须通过 `@octokit/rest` 在浏览器端直接调用 GitHub API（无需后端代理）
- FR-5: 系统必须使用 `?recursive=1` 一次加载完整文件树，在内存中构建树形结构
- FR-6: 系统必须根据文件扩展名自动为 CodeMirror 选择语言包
- FR-7: 系统必须使用 Git Tree API（createTree → createCommit → updateRef）实现原子提交，一次 commit 包含所有勾选文件
- FR-8: 系统必须在侧边栏显示 GitHub 图标，点击导航到 `/github` 页面
- FR-9: 系统必须在 `pendingChanges` 中跟踪所有未提交变更，变更类型包括 `edit`（编辑）、`create`（新建）、`delete`（删除）
- FR-13: 用户可通过右键点击目录触发"新建文件"或"新建目录"；新建文件创建空文件并纳入 `pendingChanges`；新建目录仅在内存文件树中创建节点（Git 不支持空目录，须在其下新建文件后才可提交）
- FR-14: 用户可通过右键点击文件触发"删除文件"，确认后标记为待删除并纳入 `pendingChanges`
- FR-15: Git Tree API 提交时，`delete` 类型文件通过传入 `sha: null` 实现删除，`create` 类型文件通过传入新内容实现创建
- FR-10: 系统必须支持多 Tab 同时打开多个文件，Tab 间独立编辑，`isDirty` 状态独立跟踪
- FR-11: 关闭有未提交修改的 Tab 时，系统必须弹出确认对话框，用户确认后才关闭
- FR-12: CommitDialog 必须支持用户勾选部分文件纳入本次提交

## Non-Goals

- 不支持重命名文件或移动文件
- 不支持 Pull Request 创建或 Code Review
- 不支持 Git blame、diff 视图
- 不支持 GitHub OAuth 登录（仅 PAT）
- 不支持离线编辑或本地缓存
- 不支持 Git 历史查看

## Design Considerations

页面布局（三栏，右侧含 Tab 栏）：

```
┌─────────┬──────────────────────────────────────────────────────────────┐
│ Sidebar │  [Select 仓库 ▼]  [分支: main ▼]              [提交 (3)]    │
│  (70px) ├─────────────────────┬──────────────────────────────────────  │
│         │  文件树侧边栏        │  [index.ts •] [app.ts] [utils.ts ×]   │
│  [GH]   │  (240px)            ├──────────────────────────────────────  │
│         │  ├── src/           │  CodeMirror 6                          │
│         │  │   ├── index.ts   │                                        │
│         │  │   └── app.ts     │  // 当前激活 Tab 的文件内容             │
│         │  └── package.json   │                                        │
└─────────┴─────────────────────┴────────────────────────────────────────┘
```

- `•` 表示该 Tab 有未提交修改
- 提交按钮显示待提交文件数（如"提交 (3)"）

- 复用项目现有的 Select、Button、Dialog 等 UI 组件
- 侧边栏 GitHub 图标激活状态与现有导航项保持一致

## Technical Considerations

- **依赖安装**：需要在 `apps/web` 安装 `@octokit/rest`、`@uiw/react-codemirror` 及语言扩展包（`@codemirror/lang-javascript`、`@codemirror/lang-json`、`@codemirror/lang-markdown`、`@codemirror/lang-css`）
- **PAT 加密**：使用 Node.js 内置 `crypto` 模块，密钥从 `ENCRYPTION_KEY` 环境变量读取（需在 `.env.example` 添加该变量）
- **状态管理**：使用 `@rabjs/react` Service 模式，参考项目中其他 Service 实现
- **GitHub API**：`@octokit/rest` 支持浏览器直连 GitHub API，无跨域问题
- **文件内容编码**：GitHub API 返回 Base64，使用 `atob()`/`btoa()` 处理
- **Git Tree API 原子提交流程**：
  1. `octokit.git.getRef` 获取当前分支 HEAD sha
  2. `octokit.git.getCommit` 获取 HEAD commit 的 tree sha
  3. `octokit.git.createTree` 传入 base_tree + 所有变更文件：
     - `edit`/`create`：`{ path, mode: '100644', type: 'blob', content: 文件内容 }`
     - `delete`：`{ path, mode: '100644', type: 'blob', sha: null }`
  4. `octokit.git.createCommit` 创建新 commit（parents: [HEAD sha], tree: 新 tree sha）
  5. `octokit.git.updateRef` 将分支指向新 commit sha

## Success Metrics

- 用户可在 2 步内关联一个 GitHub 仓库（填写表单 + 提交）
- 文件树加载时间 < 3 秒（中等规模仓库，~1000 文件）
- 用户可在 3 步内完成"打开文件 → 编辑 → 提交"流程

## Open Questions

- `ENCRYPTION_KEY` 的密钥管理方案是否需要轮换机制？ 不需要
- 文件树超大仓库（>10000 文件）是否需要懒加载优化？不需要
