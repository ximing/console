# PRD: Electron 客户端集成与消息推送

## Introduction

在项目中新增 Electron 桌面客户端应用，实现与现有 Web 应用的差异化配置。客户端在本地开发时连接本地服务，生产环境连接云端服务。同时在服务端增加 Socket.IO 实时消息推送，当有新通知时 Web 端使用浏览器通知，Electron 端使用系统通知。

## Goals

- Electron 客户端能够正确识别开发/生产环境并连接对应后端地址
- Web 应用能够区分 Electron 环境与浏览器环境
- GitHub Actions 构建流程支持 Electron 应用打包
- 服务端通过 Socket.IO 实现实时消息推送
- Web 端收到通知时调用浏览器 Notification API
- Electron 端收到通知时调用系统通知

## User Stories

### US-001: 配置 Electron 客户端开发环境 API 地址
**Description:** 作为开发者，我希望 Electron 客户端在本地开发时连接 localhost:5173（web）和 localhost:3000（api），这样我可以本地调试客户端。

**Acceptance Criteria:**
- [ ] Electron 客户端配置开发环境 API 地址为 http://localhost:3002
- [ ] Electron 客户端开发时加载 Web 资源为 http://localhost:5273
- [ ] Electron 客户端通过环境变量或配置文件区分开发/生产环境
- [ ] Typecheck passes

### US-002: 配置 Electron 客户端生产环境 API 地址
**Description:** 作为用户，我希望 Electron 客户端在生产环境连接 https://console.aimo.plus，这样我可以正常使用云端服务。

**Acceptance Criteria:**
- [ ] Electron 客户端生产环境 API 地址配置为 https://console.aimo.plus
- [ ] Electron 客户端生产环境加载 Web 资源为 https://console.aimo.plus
- [ ] 生产环境打包时自动使用生产环境配置
- [ ] Typecheck passes

### US-003: 更新 GitHub Actions 构建流程
**Description:** 作为开发者，我希望 GitHub Actions 能够自动构建 Electron 客户端，这样每次发布时可以自动生成安装包。

**Acceptance Criteria:**
- [ ] `.github/workflows/build-electron.yml` 文件存在并配置正确
- [ ] 工作流在 main 分支或 tag 时触发构建
- [ ] 构建产物为可分发的安装包（exe/dmg/AppImage）
- [ ] 构建产物上传到 Release 或 Artifacts

### US-004: Web 项目区分 Electron 环境
**Description:** 作为开发者，我希望 Web 应用能够判断是否运行在 Electron 环境中，这样可以根据环境不同做差异化处理。

**Acceptance Criteria:**
- [ ] 在 apps/web 中创建环境检测工具函数 `isElectron()`
- [ ] 提供获取环境标识的方法 `getRuntimeEnv(): 'electron' | 'web'`
- [ ] 在 API 请求中根据环境添加对应的 header 或标识
- [ ] Typecheck passes

### US-005: 服务端集成 Socket.IO
**Description:** 作为开发者，我希望服务端支持 Socket.IO 连接，这样可以实现实时消息推送功能。

**Acceptance Criteria:**
- [ ] 在 apps/server 中安装 socket.io 依赖
- [ ] 创建 Socket.IO 配置和初始化逻辑
- [ ] 实现基于 JWT 的 Socket.IO 认证
- [ ] 提供获取已连接用户的方法
- [ ] Typecheck passes

### US-006: 实现通知消息推送服务
**Description:** 作为开发者，我希望当有新通知时，服务端能够通过 Socket.IO 推送消息给对应用户。

**Acceptance Criteria:**
- [ ] 创建 NotificationService 处理通知推送逻辑
- [ ] 在用户创建/收到通知时触发 Socket.IO 推送
- [ ] 推送消息包含通知内容摘要
- [ ] 支持离线用户的消息缓存（可选）
- [ ] Typecheck passes

### US-007: Web 端接收并处理通知推送
**Description:** 作为用户，我希望在 Web 端能够实时收到通知推送，这样我可以第一时间知道有新消息。

**Acceptance Criteria:**
- [ ] 在 apps/web 中创建 Socket.IO 客户端服务
- [ ] 用户登录后自动建立 Socket.IO 连接
- [ ] 收到通知时调用浏览器 Notification API 显示通知
- [ ] 用户未授权通知时降级为页面内提示
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Electron 端接收并处理通知推送
**Description:** 作为用户，我希望在 Electron 客户端能够实时收到通知推送，这样我可以第一时间知道有新消息。

**Acceptance Criteria:**
- [ ] 在 apps/client 中创建 Socket.IO 客户端服务
- [ ] 用户登录后自动建立 Socket.IO 连接 收到通知时调用 Electron 的 Notification API 显示
- [ ]系统通知
-页面
- [ [ ] 支持点击通知跳转到对应 ] Typecheck passes

## Functional Requirements

- FR-1: Electron 客户端通过环境变量区分开发/生产环境
- FR-2: 开发环境加载 localhost 地址，生产环境加载 console.aimo.plus 地址
- FR-3: 更新 `.github/workflows/build-electron.yml` 支持 Electron 构建
- FR-4: Web 项目提供 `isElectron()` 和 `getRuntimeEnv()` 工具函数
- FR-5: 服务端集成 Socket.IO 并配置 JWT 认证
- FR-6: 创建 NotificationService 处理通知推送逻辑
- FR-7: Web 端实现 Socket.IO 客户端并使用浏览器 Notification API
- FR-8: Electron 端实现 Socket.IO 客户端并使用系统 Notification API

## Non-Goals

- 不实现 Electron 客户端的自动更新功能
- 不实现通知的已读状态同步
- 不实现离线消息的持久化存储
- 不修改现有的 Web 登录流程
- 不实现 Electron 端的系统托盘功能

## Technical Considerations

### Electron 客户端结构
- 使用 electron-vite 或类似工具构建
- 通过 preload 脚本暴露 API 给渲染进程
- 使用环境变量或配置文件管理 API 地址

### Socket.IO 集成
- 在 Express 服务器上附加 Socket.IO handler
- 使用 JWT token 进行连接认证
- 用户 ID 与 socket ID 的映射管理

### 通知实现
- Web 端使用 Notification API，需要先请求用户授权
- Electron 端使用 Electron 的 Notification 模块
- 通知内容需要包含标题、正文和点击跳转行为

## Success Metrics

- Electron 客户端能够在开发环境正常连接本地服务
- Electron 客户端能够在生产环境正常连接云端服务
- GitHub Actions 能够成功构建 Electron 安装包
- Web 端能够实时接收并显示通知
- Electron 端能够实时接收并显示系统通知

## Open Questions

- Electron 客户端是否需要支持多实例？
- 是否需要处理通知的已读回执？
- 生产环境的 console.aimo.plus 是否需要配置 SSL 证书？
