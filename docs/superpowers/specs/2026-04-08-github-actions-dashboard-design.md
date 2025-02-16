# GitHub Actions 统一监控面板设计

## 概述

在 X-Console 中新增 GitHub Actions 监控面板，用于查看用户 GitHub 账号下所有仓库的 workflow 运行状态。

## 位置

- **路由**：`/github/actions`（嵌套在现有 GitHub 模块下）
- **侧边栏入口**：复用现有 GitHub 图标，点击后顶部切换标签：Code | Actions

## 功能范围

### 监控维度

- 轮询 GitHub API 获取所有仓库的 workflow runs
- 范围：GitHub 账号下的所有仓库
- 数据刷新：主动轮询（页面打开时加载 + 定时刷新）

### 面板结构

```
┌─────────────────────────────────────────────────────┐
│  [Code] [Actions]          ← 顶部 Tab 切换           │
├─────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │总运行数 │ │ 成功数 │ │ 失败数 │ │运行中  │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
│  ┌──────────────────────────────────────────────┐  │
│  │ 仓库状态网格（彩色圆点表示各仓库最新状态）       │  │
│  └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  [列表视图] [时间线视图]    ← 视图切换              │
│  [All] [Success] [Failure] [Running]  ← 状态过滤   │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │ 视图内容（列表或时间线）                       │  │
│  └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  刷新频率: [Off ▼] [30s] [1min] [5min]   🔄 刷新   │
└─────────────────────────────────────────────────────┘
```

### 视图模式

**列表视图**
- 按仓库分组展示
- 每个仓库卡片显示：仓库名、最后活动时间、失败/成功计数
- 展开查看该仓库最近 10 条 workflow runs

**时间线视图**
- 所有仓库的 runs 混合按时间倒序
- 每条显示：仓库名、workflow 名、状态、触发者、时间
- 支持分页加载

### 统计卡片

| 卡片 | 内容 |
|------|------|
| 总运行数 | 统计周期内（默认7天）所有 runs 总数 |
| 成功数 | status=completed, conclusion=success |
| 失败数 | status=completed, conclusion=failure |
| 运行中 | status=in_progress |

### 轮询控制

- 下拉选择：Off / 30s / 1min / 5min
- 手动刷新按钮
- 页面隐藏时暂停轮询，页面可见时恢复

### 状态过滤器

- All / Success / Failure / Running
- 过滤器同时作用于列表视图和时间线视图

### 通知集成

- Workflow 失败时写入通知中心
- 侧边栏 Bell 图标出现红点角标
- 通知内容：仓库名、workflow 名、失败原因

## 技术实现

### 路由

新增 `apps/web/src/pages/github/actions/` 目录：
- `index.tsx` — 入口
- `actions.tsx` — 主页面组件
- `components/actions-dashboard/` — 仪表盘组件
- `components/actions-list-view/` — 列表视图
- `components/actions-timeline-view/` — 时间线视图
- `actions.service.ts` — 状态管理

### Service 层

```typescript
// ActionsService 管理状态
class ActionsService extends Service {
  runs: WorkflowRun[] = []
  stats: { total; success; failure; running }
  viewMode: 'list' | 'timeline'
  filter: 'all' | 'success' | 'failure' | 'running'
  pollInterval: number // 0 = off

  async loadRuns()
  async refreshRuns()
  startPolling(interval: number)
  stopPolling()
}
```

### Server Actions

```typescript
// 获取所有仓库的 workflow runs
GET /repos/{owner}/{repo}/actions/runs

// 支持分页、状态过滤、时间范围
```

### API 调用

- 使用 Octokit 轮询 GitHub API
- 按仓库并发请求，结果缓存
- 合理限制：最多取 20 个活跃仓库，每个仓库取最近 30 条 runs

### 通知

- 失败检测：新加载的 runs 中 status=completed 且 conclusion=failure
- 对比上次加载结果，新增失败写入 NotificationService
- 通知内容：`[仓库名] workflow-name 执行失败`

## 设计细节

### 颜色

遵循现有设计系统：
- 成功：绿色 `#22c55e`
- 失败：红色 `#ef4444`
- 运行中：蓝色 `#3b82f6`
- 等待中：黄色 `#eab308`

### 交互

- 卡片 hover：轻微上浮 `hover:-translate-y-0.5`
- 状态过滤：点击切换，绿色高亮选中态
- 视图切换：Tab 指示器底部绿色下划线

### 阴影

- 统计卡片：`shadow-sm`
- 仓库卡片：`shadow-sm`，hover 时加深

## 实现顺序

1. 路由和页面框架
2. 仪表盘布局和统计卡片
3. 列表视图
4. 时间线视图
5. 轮询逻辑
6. 状态过滤
7. 通知集成
