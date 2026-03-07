# PRD: Electron 日志查看器

## Introduction

在 Electron 环境下，于 Web 设置页面中增加一个日志模块，实时读取并展示 `apps/client/src/main/logger.ts` 打印的日志。该模块服务于两类用户：

- 开发者：用于调试和问题排查
- 普通用户：用于查看应用运行状态和错误信息

## Goals

- 在设置页面中添加日志查看入口
- 实时展示最新日志，支持滚动加载历史日志
- 支持按日志级别筛选
- 支持日志搜索功能
- 提供清空日志和导出日志的能力

## User Stories

### US-001: 添加日志设置入口

**Description:** 作为用户，我希望在设置页面中能看到日志模块的入口，以便快速访问日志查看功能。

**Acceptance Criteria:**

- [ ] 在设置页面添加"日志"菜单项
- [ ] 点击后进入日志查看页面
- [ ] 显示当前日志数量统计
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: 实时日志展示

**Description:** 作为用户，我希望打开日志页面时能看到最新的日志，并且新日志能实时推送显示。

**Acceptance Criteria:**

- [ ] 页面打开时加载最新日志（默认 100 条）
- [ ] 新日志自动追加到顶部（最新优先）
- [ ] 支持实时接收新日志（通过 IPC 或 WebSocket）
- [ ] 每条日志显示：时间戳、日志级别、日志内容
- [ ] 不同日志级别使用不同颜色区分（error 红色、warn 黄色、info 蓝色、debug 灰色）
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: 滚动加载历史日志

**Description:** 作为用户，我希望能够通过滚动查看更多历史日志。

**Acceptance Criteria:**

- [ ] 滚动到底部时自动加载更多日志（每次 100 条）
- [ ] 加载中显示 loading 状态
- [ ] 加载完毕隐藏 loading
- [ ] 没有更多日志时提示"已加载全部"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: 日志级别筛选

**Description:** 作为用户，我希望能够按日志级别筛选日志，快速定位特定类型的日志。

**Acceptance Criteria:**

- [ ] 提供日志级别筛选器：全部 | error | warn | info | debug
- [ ] 筛选后重新加载对应级别的日志
- [ ] 筛选状态在 URL 参数中保持
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: 日志搜索功能

**Description:** 作为用户，我希望能够搜索日志内容，快速找到包含特定关键词的日志。

**Acceptance Criteria:**

- [ ] 提供搜索输入框
- [ ] 输入关键词后实时筛选日志
- [ ] 搜索关键词高亮显示
- [ ] 支持按回车或点击搜索按钮触发搜索
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: 清空和导出日志

**Description:** 作为用户，我希望能够清空当前显示的日志或导出日志文件。

**Acceptance Criteria:**

- [ ] 提供"清空"按钮，清空当前显示的日志列表（不删除文件）
- [ ] 提供"导出"按钮，下载日志文件
- [ ] 清空前显示确认对话框
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 在设置页面添加日志入口路由
- FR-2: 通过 IPC 通道从主进程获取日志文件内容
- FR-3: 实现日志实时推送机制（主进程监听日志变化或定期推送）
- FR-4: 实现分页加载逻辑（每次加载 100 条，支持游标/offset 方式）
- FR-5: 实现日志级别筛选功能
- FR-6: 实现日志内容搜索功能
- FR-7: 实现日志导出功能（读取日志文件并触发下载）
- FR-8: 实现日志清空功能（仅清空界面显示，不删除源文件）

## Non-Goals

- 不实现日志服务端存储
- 不实现日志自动清理功能（由 logger.ts 的 maxFiles 配置控制）
- 不实现远程日志上传
- 不实现日志分析或统计图表

## Technical Considerations

- 复用 `apps/client/src/main/logger.ts` 的日志目录配置：`path.join(app.getPath('userData'), 'logs')`
- 日志文件格式为 JSON Lines（每行一个 JSON 对象）
- 需要在 preload 中暴露 IPC 通道用于读取日志
- 考虑使用虚拟列表（virtual list）优化大量日志的渲染性能
- 日志实时推送可以复用现有的 update-status IPC 通道或新增专用通道

## Design Considerations

- 参考现有设置页面的设计风格
- 日志条目使用等宽字体显示内容
- 页面头部：筛选器 + 搜索框 + 操作按钮（清空/导出）
- 页面主体：日志列表（支持虚拟滚动）
- 支持暗黑/明亮主题适配

## Success Metrics

- 日志页面打开到首次显示时间 < 1 秒
- 滚动加载无明显卡顿
- 支持展示 10000+ 条日志而不影响性能

## Open Questions

- 是否需要支持多日志文件选择（按日期）？
- 是否需要支持日志级别过滤的同时进行搜索？
- 日志条目最大显示字符数是否需要限制？
