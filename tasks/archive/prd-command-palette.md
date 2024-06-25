# PRD: Command Palette (命令面板)

## Introduction

在 Electron 桌面客户端中实现类似 Alfred 的命令面板工具。通过全局快捷键唤起独立的浮动窗口，用户输入内容后，AI 判断使用哪个工具，执行后结果在面板内展示，支持一键复制。

该功能为开发者提供便捷的文本处理和开发工具，提升工作效率。命令面板作为独立浮动窗口，类似 macOS Alfred 的使用体验。

## Goals

- 创建独立的浮动窗口，类似 macOS Alfred 的命令面板体验
- 全局快捷键唤起/关闭面板（切换模式）
- 面板作为独立窗口，不干扰主应用窗口
- 与现有 Web 代码共用，通过路由控制显示
- 实现 AI 路由功能，根据用户输入智能匹配工具
- 实现 13 个工具的完整功能（文本处理、开发工具、AI 辅助）
- 支持在设置页中配置 AI 模型和快捷键

## User Stories

### US-001: 创建独立的命令面板窗口
**Description:** 作为开发者，我需要在 Electron 主进程中创建一个独立的浮动窗口用于命令面板。

**Acceptance Criteria:**
- [ ] 在 Electron 主进程中创建新的 BrowserWindow
- [ ] 窗口样式为无边框、浮动面板
- [ ] 窗口水平居中、垂直居中偏上显示
- [ ] 窗口始终置顶于其他窗口
- [ ] 窗口可聚焦但不抢占焦点
- [ ] Typecheck passes

### US-002: 窗口显示/隐藏控制
**Description:** 作为用户，我可以通过快捷键控制命令面板窗口的显示和隐藏。

**Acceptance Criteria:**
- [ ] 全局快捷键 (Option+Space) 触发面板显示
- [ ] 再次按快捷键关闭面板
- [ ] 按 Escape 键关闭面板
- [ ] 点击窗口外部区域关闭面板
- [ ] 窗口打开时自动聚焦，输入框自动获取焦点
- [ ] 窗口关闭时释放焦点，返回之前聚焦的窗口
- [ ] Typecheck passes

### US-003: 窗口主题适配
**Description:** 作为用户，我希望命令面板窗口的主题与主应用保持一致。

**Acceptance Criteria:**
- [ ] 命令面板窗口使用与主应用相同的深色/浅色主题
- [ ] 主题设置存储在主进程中
- [ ] 面板窗口创建时读取当前主题设置
- [ ] Typecheck passes

### US-004: 注册全局快捷键
**Description:** 作为开发者，我需要在桌面上通过快捷键快速唤起命令面板。

**Acceptance Criteria:**
- [ ] Electron 主进程注册 Option+Space (macOS) 和 Alt+Space (Windows/Linux) 全局快捷键
- [ ] 快捷键在客户端启动时注册
- [ ] 快捷键冲突时优雅降级或提示用户
- [ ] 支持在设置页面修改快捷键

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

### 窗口管理
- FR-1: 创建无边框浮动窗口，尺寸 680x500 像素
- FR-2: 窗口位置：屏幕宽度居中，垂直位置在 20% 处
- FR-3: 窗口始终置顶 (alwaysOnTop: true)
- FR-4: 窗口无阴影，使用模糊背景效果
- FR-5: 点击窗口外部区域触发 blur 事件并关闭

### 快捷键控制
- FR-6: 注册全局快捷键 (可配置，预设 Option+Space/Alt+Space)
- FR-7: 快捷键触发窗口显示/隐藏切换
- FR-8: 按 Escape 键关闭窗口
- FR-9: 支持在设置页面修改快捷键

### 主题适配
- FR-10: 窗口创建时从主进程获取当前主题设置
- FR-11: 根据主题 类 (light/d设置应用对应的 CSSark)
- FR-12: 主题变更时面板窗口自动更新

### 路由配置
- FR-13: Web 应用添加 /command-palette 路由
- FR-14: 独立窗口加载 /command-palette 页面

### 工具功能
- FR-15: 实现 AI 路由端点 POST /api/ai-route
- FR-16: 实现工具执行端点 POST /api/tool/execute
- FR-17: 实现文本处理工具：JSON 格式化、Base64 编码/解码、URL 编码/解码、Markdown 预览
- FR-18: 实现开发工具：UUID 生成、颜色转换、时间戳转换、Hash 计算
- FR-19: 实现 AI 辅助工具：翻译、总结、代码解释
- FR-20: 在设置页添加 AI 模型配置
- FR-21: AI 工具执行需要用户认证
- FR-22: 结果支持一键复制功能

## Non-Goals

- 不实现类似 Alfred 的文件搜索功能
- 不实现工作流 (Workflows) 功能
- 不实现片段 (Snippets) 功能
- 不实现主题自定义功能（仅跟随主应用）
- 不实现用户自定义工具
- 不实现工具市场/插件系统
- 不实现历史记录功能
- 不实现快捷命令（绕过 AI 直接匹配）

## Technical Considerations

### 窗口架构
- 创建 CommandPaletteWindowManager 类管理命令面板窗口
- 主窗口和命令面板窗口分离，各自有独立的 BrowserWindow 实例
- 命令面板窗口通过路由 /command-palette 加载独立页面

### IPC 通信
- 主进程 -> 渲染进程：通过 IPC 发送显示/隐藏指令
- 渲染进程 -> 主进程：通过 IPC 执行工具调用
- 主题设置通过 IPC 从主进程传递

### 前端架构
- 创建 CommandPalettePage 页面组件作为容器
- 复用现有的 CommandPalette 组件逻辑
- 使用 React Router 管理 /command-palette 路由
- 前端使用 @rabjs/react 管理面板状态

### 后端
- 后端使用现有的 LangChain 集成
- AI 模型配置复用现有大模型设置
- 本地工具（JSON/Base64/URL/UUID 等）在前端执行，减少服务器压力

## Success Metrics

- 命令面板作为独立窗口，可在 200ms 内响应快捷键唤起
- 窗口打开时输入框自动聚焦
- 与主窗口无交互干扰
- AI 路由响应时间控制在 1s 以内
- 所有工具都能正确执行并返回结果

## Open Questions

- 快捷键冲突时的处理策略？
- 是否需要记忆上次关闭时的位置？
- 工具执行超时时间设置？
- 是否需要支持工具执行进度显示？
- 是否需要支持结果的多格式复制（如纯文本、HTML）？
