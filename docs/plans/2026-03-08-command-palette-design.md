# Command Palette 设计文档

**日期**: 2026-03-08
**功能**: 类似 uTools 的命令面板工具

## 1. 功能概述

在 Electron 桌面客户端中，通过 **Option + Space** 全局快捷键唤起命令面板。用户输入内容后，AI 判断使用哪个工具，执行后结果在面板内展示，支持复制。

## 2. 核心组件

### 2.1 CommandPalette 组件

位于渲染进程的命令面板 UI，包含以下区域：

- **输入区**: 全局输入框，支持实时搜索
- **工具列表区**: 当有多个工具匹配时，展示列表供用户选择
- **结果展示区**: 展示工具执行结果，支持一键复制

### 2.2 Electron IPC 通信

- 主进程注册全局快捷键 (Option + Space)
- 通过 IPC 通知渲染进程显示/隐藏面板
- 支持面板聚焦/失焦时的行为控制

### 2.3 AI 路由服务

- 接收用户输入
- 将输入发送给后端 AI
- AI 返回匹配的工具列表（可能多个）

### 2.4 工具执行服务

| 类别 | 工具 | 说明 |
|------|------|------|
| 文本处理 | JSON 格式化 | 格式化 JSON 字符串 |
| 文本处理 | Base64 编码 | 将文本编码为 Base64 |
| 文本处理 | Base64 解码 | 将 Base64 解码为文本 |
| 文本处理 | URL 编码 | URL 编码字符串 |
| 文本处理 | URL 解码 | URL 解码字符串 |
| 文本处理 | Markdown 预览 | 渲染 Markdown 为 HTML |
| 开发工具 | UUID 生成 | 生成 UUID v4 |
| 开发工具 | 颜色转换 | HEX ↔ RGB ↔ HSL |
| 开发工具 | 时间戳转换 | Unix 时间戳 ↔ 日期时间 |
| 开发工具 | Hash 计算 | MD5、SHA256 计算 |
| AI 辅助 | 翻译 | 调用 AI 翻译文本 |
| AI 辅助 | 总结 | 调用 AI 总结文本 |
| AI 辅助 | 代码解释 | 调用 AI 解释代码 |

## 3. 数据流

```
┌─────────────────────────────────────────────────────────────┐
│  用户按 Option+Space                                        │
│       ↓                                                    │
│  主进程捕获快捷键                                           │
│       ↓                                                    │
│  IPC 通知渲染进程                                           │
│       ↓                                                    │
│  显示 CommandPalette 面板                                   │
│       ↓                                                    │
│  用户输入内容                                               │
│       ↓                                                    │
│  发送给后端 AI (路由端点)                                   │
│       ↓                                                    │
│  AI 返回工具列表                                            │
│       ↓                                                    │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ 单个工具     │  │ 多个工具     │                       │
│  │   ↓         │  │   ↓         │                       │
│  │ 自动执行    │  │ 展示列表    │                       │
│  │   ↓         │  │ 用户选择    │                       │
│  │ 显示结果    │  │ 执行工具    │                       │
│  │   ↓         │  │ 显示结果    │                       │
│  │ 用户复制    │  │ 用户复制    │                       │
│  └──────────────┘  └──────────────┘                       │
│       ↓                                                    │
│  关闭面板                                                   │
└─────────────────────────────────────────────────────────────┘
```

## 4. 技术架构

### 4.1 前端 (apps/web)

- `components/command-palette/` - 命令面板组件
  - `command-palette.tsx` - 主组件
  - `command-input.tsx` - 输入框组件
  - `command-list.tsx` - 工具列表组件
  - `command-result.tsx` - 结果展示组件

- `services/command-palette.service.ts` - 前端服务
  - 管理面板状态
  - 与后端通信
  - 执行本地工具

### 4.2 后端 (apps/server)

- `actions/ai-route.action.ts` - AI 路由 action
  - 接收用户输入
  - 调用 AI 判断使用哪个工具

- `actions/tool-execute.action.ts` - 工具执行 action
  - 执行 AI 辅助类工具

- 工具函数库
  - `utils/tools/` - 本地工具函数

### 4.3 Electron (apps/client)

- 主进程注册全局快捷键
- IPC 通信处理

## 5. API 设计

### 5.1 AI 路由端点

```
POST /api/ai-route
Body: { input: string }
Response: {
  tools: Array<{
    id: string,
    name: string,
    description: string,
    category: string
  }>
}
```

### 5.2 AI 工具执行端点

```
POST /api/tool/execute
Body: {
  toolId: string,
  input: string,
  options?: Record<string, any>
}
Response: {
  result: string,
  success: boolean
}
```

## 6. UI 设计

### 6.1 面板样式

- 居中弹出，半透明背景遮罩
- 宽度: 600px，最大高度: 70vh
- 输入框: 大字体，带图标
- 结果区: 支持代码高亮、复制按钮

### 6.2 交互

- 输入时实时触发 AI 路由 (防抖 300ms)
- Esc 关闭面板
- 点击遮罩关闭面板
- Tab/Enter 选择工具

## 7. 后续扩展

- 用户自定义工具
- 工具市场/插件系统
- 历史记录
- 快捷命令（绕过 AI 直接匹配）
