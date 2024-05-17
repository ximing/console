# PRD: AIMO CLI 工具

## Introduction

在 `apps` 目录下实现一个 Node.js CLI 程序，用于运维管理和批量操作通知。采用子命令形式便于后续扩展。第一个子命令 `notify` 用于调用 notification.controller.ts 创建通知。

## Goals

- 实现基于子命令的 CLI 程序，便于后续扩展新功能
- 支持 `notify` 子命令创建通知
- 支持 `init` 子命令生成配置文件
- 配置优先级：环境变量 > 命令行参数 > 配置文件
- 通过 HTTP API 与后端交互，默认域名 https://console.aimo.plus

## User Stories

### US-001: CLI 程序基础结构搭建
**Description:** 作为开发者，我需要一个基于子命令的 CLI 框架，方便后续扩展新命令。

**Acceptance Criteria:**
- [ ] 创建 CLI 入口文件，支持 --help 参数
- [ ] 实现子命令注册机制
- [ ] 添加版本号显示 (--version)
- [ ] Typecheck 和 lint 通过

### US-002: init 子命令实现
**Description:** 作为用户，我想通过 init 命令生成配置文件来管理默认的域名和 JWT token。

**Acceptance Criteria:**
- [ ] init 命令在当前目录生成配置文件 (如 .aimo-cli.json)
- [ ] 配置文件包含 domain 和 token 字段
- [ ] 支持覆盖已有配置文件（需要确认）
- [ ] Typecheck 和 lint 通过

### US-003: notify 子命令实现
**Description:** 作为运维人员，我想通过命令行创建通知。

**Acceptance Criteria:**
- [ ] notify 子命令支持以下参数：
  - --channel, -c: 通知渠道 (wechat|feishu|dingtalk|slack|email|webhook)，必填
  - --ownership, -o: 所属关系 (group|private)，必填
  - --ownership-id: 所属者 ID，必填
  - --content, -m: 通知内容，必填
  - --message-type: 消息类型 (text|image|file|link|mixed)，可选，默认 text
- [ ] 通过 HTTP POST 调用 /api/v1/notifications 接口
- [ ] 成功创建后打印通知 ID 和状态
- [ ] 支持 --dry-run 预览参数不实际发送请求
- [ ] Typecheck 和 lint 通过

### US-004: 配置优先级和读取逻辑
**Description:** 作为用户，我希望配置有优先级，让我能灵活控制 CLI 的行为。

**Acceptance Criteria:**
- [ ] 优先级：环境变量 > 命令行参数 > 配置文件
- [ ] 环境变量 AIMO_CLI_DOMAIN 可覆盖域名
- [ ] 环境变量 AIMO_CLI_TOKEN 可覆盖 JWT token
- [ ] 配置文件路径可通过 --config 参数指定
- [ ] 缺少必需配置时报清晰的错误提示
- [ ] Typecheck 和 lint 通过

## Functional Requirements

- FR-1: CLI 入口支持全局参数：--help, --version, --config
- FR-2: init 子命令生成 JSON 配置文件，包含 domain 和 token 字段
- FR-3: notify 子命令支持完整参数：channel, ownership, ownershipId, content, messageType
- FR-4: notify 通过 HTTP POST 请求调用 /api/v1/notifications 创建通知
- FR-5: notify 支持 --dry-run 参数，仅预览不发送请求
- FR-6: 配置读取按优先级顺序：环境变量 > 命令行 > 配置文件
- FR-7: 默认 API 地址为 https://console.aimo.plus，可通过环境变量 AIMO_CLI_DOMAIN 覆盖

## Non-Goals

- 不实现认证流程（假设用户已获取 JWT token）
- 不实现交互式 prompts（纯命令行参数）
- 不实现复杂错误重试机制
- 不实现通知查询、删除等管理功能（后续子命令扩展）

## Technical Considerations

- 使用 commander.js 或 oclif 框架实现 CLI
- 使用 axios 进行 HTTP 请求
- 配置文件格式为 JSON (.aimo-cli.json)
- 需要安装 @aimo-console/dto 包获取 DTO 类型
- CLI 程序作为独立 npm 包发布在 apps/cli 目录

## Success Metrics

- 用户能在 1 分钟内完成配置并发送第一条通知
- CLI 帮助信息清晰，新用户可快速上手

## Open Questions

- 配置文件是否需要支持多环境（如 dev/staging/prod）？
- 是否需要支持读取项目根目录的 .env 文件？
