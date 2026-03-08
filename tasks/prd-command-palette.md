# PRD: Command Palette (命令面板)

## Introduction

在 Electron 桌面客户端中实现类似 uTools 的命令面板工具。通过 **Option + Space** (macOS) 或 **Alt + Space** (Windows/Linux) 全局快捷键唤起命令面板，用户输入内容后，AI 判断使用哪个工具，执行后结果在面板内展示，支持一键复制。

该功能为开发者提供便捷的文本处理和开发工具，提升工作效率。

## Goals

- 实现全局快捷键唤起命令面板（支持 macOS/Windows/Linux）
- 实现 AI 路由功能，根据用户输入智能匹配工具
- 实现 13 个工具的完整功能（文本处理、开发工具、AI 辅助）
- 支持在设置页中配置 AI 模型
- 实现用户认证，确保安全性

## User Stories

### US-001: 注册全局快捷键
**Description:** 作为开发者，我需要在桌面上通过快捷键快速唤起命令面板。

**Acceptance Criteria:**
- [ ] Electron 主进程注册 Option+Space (macOS) 和 Alt+Space (Windows/Linux) 全局快捷键
- [ ] 快捷键在客户端启动时注册
- [ ] 快捷键冲突时优雅降级或提示用户

### US-002: 显示命令面板 UI
**Description:** 作为用户，我希望通过快捷键弹出命令面板进行操作。

**Acceptance Criteria:**
- [ ] 面板居中弹出，带半透明背景遮罩
- [ ] 面板宽度 600px，最大高度 70vh
- [ ] 输入框自动聚焦，带图标
- [ ] Esc 或点击遮罩可关闭面板

### US-003: AI 路由功能
**Description:** 作为用户，我输入内容后希望 AI 自动判断使用哪个工具。

**Acceptance Criteria:**
- [ ] 输入时实时触发 AI 路由（防抖 300ms）
- [ ] 单个工具匹配时自动执行
- [ ] 多个工具匹配时展示列表供用户选择
- [ ] Tab/Enter 选择工具

### US-004: 文本处理工具 - JSON 格式化
**Description:** 作为用户，我需要快速格式化 JSON 字符串。

**Acceptance Criteria:**
- [ ] 输入 JSON 字符串，输出格式化后的 JSON
- [ ] 支持一键复制结果
- [ ] JSON 解析错误时显示友好错误信息

### US-005: 文本处理工具 - Base64 编码/解码
**Description:** 作为用户，我需要 Base64 编码和解码功能。

**Acceptance Criteria:**
- [ ] 支持 Base64 编码
- [ ] 支持 Base64 解码
- [ ] 自动判断是编码还是解码需求

### US-006: 文本处理工具 - URL 编码/解码
**Description:** 作为用户，我需要 URL 编码和解码功能。

**Acceptance Criteria:**
- [ ] 支持 URL 编码
- [ ] 支持 URL 解码
- [ ] 自动判断是编码还是解码需求

### US-007: 文本处理工具 - Markdown 预览
**Description:** 作为用户，我需要将 Markdown 渲染为 HTML 预览。

**Acceptance Criteria:**
- [ ] 输入 Markdown，输出渲染后的 HTML
- [ ] 支持代码高亮
- [ ] 支持一键复制 HTML

### US-008: 开发工具 - UUID 生成
**Description:** 作为开发者，我需要生成 UUID v4。

**Acceptance Criteria:**
- [ ] 生成符合 RFC 4122 的 UUID v4
- [ ] 支持批量生成

### US-009: 开发工具 - 颜色转换
**Description:** 作为开发者，我需要颜色格式转换。

**Acceptance Criteria:**
- [ ] 支持 HEX → RGB → HSL 相互转换
- [ ] 支持输入任一格式自动识别

### US-010: 开发工具 - 时间戳转换
**Description:** 作为开发者，我需要时间戳和日期时间互转。

**Acceptance Criteria:**
- [ ] Unix 时间戳 → 日期时间
- [ ] 日期时间 → Unix 时间戳
- [ ] 支持秒和毫秒两种格式

### US-011: 开发工具 - Hash 计算
**Description:** 作为开发者，我需要计算字符串的 Hash 值。

**Acceptance Criteria:**
- [ ] 支持 MD5 计算
- [ ] 支持 SHA256 计算
- [ ] 支持一键复制结果

### US-012: AI 辅助工具 - 翻译
**Description:** 作为用户，我需要 AI 翻译文本。

**Acceptance Criteria:**
- [ ] 调用 AI 进行翻译
- [ ] 支持语言检测
- [ ] 需要用户登录

### US-013: AI 辅助工具 - 总结
**Description:** 作为用户，我需要 AI 总结文本。

**Acceptance Criteria:**
- [ ] 调用 AI 进行文本总结
- [ ] 支持不同长度的文本
- [ ] 需要用户登录

### US-014: AI 辅助工具 - 代码解释
**Description:** 作为开发者，我需要 AI 解释代码。

**Acceptance Criteria:**
- [ ] 调用 AI 解释输入的代码
- [ ] 支持多种编程语言
- [ ] 需要用户登录

### US-015: 设置页配置 AI 模型
**Description:** 作为用户，我需要在设置页配置命令面板使用的 AI 模型。

**Acceptance Criteria:**
- [ ] 在设置页添加"命令面板"配置区域
- [ ] 从大模型设置中获取可用模型列表
- [ ] 保存用户选择的模型配置

### US-016: 用户认证
**Description:** 作为用户，我需要登录后才能使用 AI 辅助工具。

**Acceptance Criteria:**
- [ ] 未登录时提示登录
- [ ] 登录状态在面板中显示
- [ ] AI 工具执行时验证登录状态

## Functional Requirements

- FR-1: Electron 主进程注册全局快捷键 (Option+Space/Alt+Space)
- FR-2: 通过 IPC 通知渲染进程显示/隐藏面板
- FR-3: 命令面板 UI 实现（输入区、工具列表区、结果展示区）
- FR-4: 实现 AI 路由端点 POST /api/ai-route
- FR-5: 实现工具执行端点 POST /api/tool/execute
- FR-6: 实现文本处理工具：JSON 格式化、Base64 编码/解码、URL 编码/解码、Markdown 预览
- FR-7: 实现开发工具：UUID 生成、颜色转换、时间戳转换、Hash 计算
- FR-8: 实现 AI 辅助工具：翻译、总结、代码解释
- FR-9: 在设置页添加 AI 模型配置
- FR-10: AI 工具执行需要用户认证
- FR-11: 结果支持一键复制功能

## Non-Goals

- 不实现 Web 端命令面板
- 不实现用户自定义工具
- 不实现工具市场/插件系统
- 不实现历史记录功能
- 不实现快捷命令（绕过 AI 直接匹配）

## Technical Considerations

- 前端使用 @rabjs/react 管理面板状态
- 后端使用现有的 LangChain 集成
- AI 模型配置复用现有大模型设置
- 面板使用 React Portal 渲染到根节点
- 本地工具（JSON/Base64/URL/UUID 等）在前端执行，减少服务器压力

## Success Metrics

- 命令面板可在 200ms 内响应快捷键唤起
- AI 路由响应时间控制在 1s 以内
- 所有工具都能正确执行并返回结果

## Open Questions

- 是否需要支持工具执行进度显示？
- 是否需要支持结果的多格式复制（如纯文本、HTML）？
