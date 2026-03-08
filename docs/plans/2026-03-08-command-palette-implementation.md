# Command Palette Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 Electron 桌面客户端中实现类似 uTools 的命令面板，通过 Option + Space 全局快捷键唤起，AI 路由判断使用哪个工具，结果在面板内展示并支持复制。

**Architecture:**
- 前端: React 组件 + Service 层管理状态，通过 IPC 与 Electron 主进程通信
- 主进程: 注册全局快捷键，通过 IPC 通知渲染进程显示/隐藏面板
- 后端: 新增 AI 路由端点和工具执行端点，AI 辅助类工具调用 LangChain

**Tech Stack:** React 19, @rabjs/react, Electron IPC, Drizzle ORM, LangChain

---

## Task 1: 创建工具函数库 (本地工具)

**Files:**
- Create: `apps/server/src/utils/tools/text-tools.ts`
- Create: `apps/server/src/utils/tools/dev-tools.ts`
- Create: `apps/server/src/utils/tools/index.ts`

**Step 1: 创建 text-tools.ts**

```typescript
// apps/server/src/utils/tools/text-tools.ts
import { marked } from 'marked';

/**
 * 格式化 JSON 字符串
 */
export function formatJson(input: string): string {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, 2);
  } catch {
    throw new Error('Invalid JSON input');
  }
}

/**
 * Base64 编码
 */
export function encodeBase64(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64');
}

/**
 * Base64 解码
 */
export function decodeBase64(input: string): string {
  const decoded = Buffer.from(input, 'base64').toString('utf-8');
  // Verify it's valid UTF-8
  if (/[\x00-\x08\x0E-\x1F]/.test(decoded)) {
    throw new Error('Invalid Base64 input');
  }
  return decoded;
}

/**
 * URL 编码
 */
export function encodeUrl(input: string): string {
  return encodeURIComponent(input);
}

/**
 * URL 解码
 */
export function decodeUrl(input: string): string {
  return decodeURIComponent(input);
}

/**
 * Markdown 渲染为 HTML
 */
export function renderMarkdown(input: string): string {
  return marked(input) as string;
}
```

**Step 2: 创建 dev-tools.ts**

```typescript
// apps/server/src/utils/tools/dev-tools.ts
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * 生成 UUID v4
 */
export function generateUuid(): string {
  return uuidv4();
}

/**
 * HEX 转 RGB
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error('Invalid HEX color');
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * RGB 转 HEX
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * RGB 转 HSL
 */
export function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

/**
 * 时间戳转日期时间
 */
export function timestampToDate(timestamp: number | string): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  if (isNaN(ts)) throw new Error('Invalid timestamp');
  // 如果是秒级时间戳，转为毫秒
  const ms = ts < 10000000000 ? ts * 1000 : ts;
  return new Date(ms).toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * 日期时间转时间戳
 */
export function dateToTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) throw new Error('Invalid date string');
  return date.getTime().toString();
}

/**
 * 计算 Hash (MD5, SHA256)
 */
export function calculateHash(input: string, algorithm: 'md5' | 'sha256' = 'sha256'): string {
  return crypto.createHash(algorithm).update(input, 'utf8').digest('hex');
}
```

**Step 3: 创建 index.ts**

```typescript
// apps/server/src/utils/tools/index.ts
export * from './text-tools';
export * from './dev-tools';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'text' | 'dev' | 'ai';
  execute: (input: string, options?: Record<string, unknown>) => string | Promise<string>;
}

export const tools: Tool[] = [
  {
    id: 'format-json',
    name: 'JSON 格式化',
    description: '格式化 JSON 字符串',
    category: 'text',
    execute: (input) => {
      const { formatJson } = require('./text-tools');
      return formatJson(input);
    },
  },
  {
    id: 'base64-encode',
    name: 'Base64 编码',
    description: '将文本编码为 Base64',
    category: 'text',
    execute: (input) => {
      const { encodeBase64 } = require('./text-tools');
      return encodeBase64(input);
    },
  },
  {
    id: 'base64-decode',
    name: 'Base64 解码',
    description: '将 Base64 解码为文本',
    category: 'text',
    execute: (input) => {
      const { decodeBase64 } = require('./text-tools');
      return decodeBase64(input);
    },
  },
  {
    id: 'url-encode',
    name: 'URL 编码',
    description: 'URL 编码字符串',
    category: 'text',
    execute: (input) => {
      const { encodeUrl } = require('./text-tools');
      return encodeUrl(input);
    },
  },
  {
    id: 'url-decode',
    name: 'URL 解码',
    description: 'URL 解码字符串',
    category: 'text',
    execute: (input) => {
      const { decodeUrl } = require('./text-tools');
      return decodeUrl(input);
    },
  },
  {
    id: 'markdown-preview',
    name: 'Markdown 预览',
    description: '渲染 Markdown 为 HTML',
    category: 'text',
    execute: (input) => {
      const { renderMarkdown } = require('./text-tools');
      return renderMarkdown(input);
    },
  },
  {
    id: 'uuid-generate',
    name: 'UUID 生成',
    description: '生成 UUID v4',
    category: 'dev',
    execute: () => {
      const { generateUuid } = require('./dev-tools');
      return generateUuid();
    },
  },
  {
    id: 'color-convert',
    name: '颜色转换',
    description: 'HEX ↔ RGB ↔ HSL 颜色转换',
    category: 'dev',
    execute: (input) => {
      const { hexToRgb, rgbToHex, rgbToHsl } = require('./dev-tools');
      const hexMatch = input.match(/^#?([a-f\d]{6})$/i);
      if (hexMatch) return hexToRgb(input);
      const rgbMatch = input.match(/^rgb\(?(\d+),?\s*(\d+),?\s*(\d+)\)?$/i);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        return rgbToHex(r, g, b) + '\n' + rgbToHsl(r, g, b);
      }
      throw new Error('Invalid color format. Use HEX (#ff0000) or RGB (rgb(255, 0, 0))');
    },
  },
  {
    id: 'timestamp-convert',
    name: '时间戳转换',
    description: 'Unix 时间戳 ↔ 日期时间转换',
    category: 'dev',
    execute: (input) => {
      const { timestampToDate, dateToTimestamp } = require('./dev-tools');
      const trimmed = input.trim();
      if (/^\d+$/.test(trimmed)) {
        return timestampToDate(trimmed);
      }
      return dateToTimestamp(trimmed);
    },
  },
  {
    id: 'hash-calculate',
    name: 'Hash 计算',
    description: 'MD5、SHA256 计算',
    category: 'dev',
    execute: (input, options) => {
      const { calculateHash } = require('./dev-tools');
      const algorithm = (options?.algorithm as 'md5' | 'sha256') || 'sha256';
      return calculateHash(input, algorithm);
    },
  },
];

export function getToolById(id: string): Tool | undefined {
  return tools.find(tool => tool.id === id);
}
```

**Step 4: 添加依赖**

检查并添加 uuid 和 marked 依赖:
```bash
cd apps/server && pnpm add uuid marked && pnpm add -D @types/uuid
```

**Step 5: Commit**

```bash
git add apps/server/src/utils/tools/ apps/server/package.json
git commit -m "feat: add local tools library for command palette"
```

---

## Task 2: 创建 AI 路由 Action

**Files:**
- Create: `apps/server/src/actions/ai-route.action.ts`
- Modify: `apps/server/src/actions/register.ts`

**Step 1: 创建 AI 路由 Action**

```typescript
// apps/server/src/actions/ai-route.action.ts
import type { ActionHandler, ActionResult, ActionParamSchema } from './types.js';
import { tools, getToolById } from '../utils/tools/index.js';

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  category: string;
}

/**
 * AI Route Action - 使用 AI 判断应该使用哪个工具
 */
export class AIRouteAction implements ActionHandler {
  id = 'ai-route';
  name = 'AI Route';
  description = '使用 AI 判断用户输入应该使用哪个工具';

  paramSchema: Record<string, ActionParamSchema> = {
    input: {
      type: 'string',
      description: '用户输入的内容',
      required: true,
    },
  };

  // 提示词模板
  private systemPrompt = `你是一个工具路由助手。根据用户输入，判断应该使用哪个工具。

可用工具：
${tools.map(t => `- ${t.id}: ${t.name} - ${t.description}`).join('\n')}

请根据用户输入返回最合适的工具。如果不确定，返回空数组。

返回格式（JSON）：
{
  "tools": [
    { "id": "工具ID", "name": "工具名称", "description": "描述", "category": "类别" }
  ]
}`;

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const input = params.input as string;

    try {
      // 构建提示词
      const userPrompt = `用户输入: ${input}

请判断应该使用哪个工具，返回 JSON 格式。`;

      // 调用 AI（这里使用 LangChain，具体实现后续补充）
      const response = await this.callAI(userPrompt);

      // 解析 AI 返回的工具列表
      const tools = this.parseAIResponse(response);

      return {
        success: true,
        data: { tools },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'AI 路由失败',
          code: 'AI_ROUTE_ERROR',
        },
      };
    }
  }

  private async callAI(prompt: string): Promise<string> {
    // TODO: 实现 LangChain 调用
    // 暂时返回空数组，后续实现
    return JSON.stringify({ tools: [] });
  }

  private parseAIResponse(response: string): ToolInfo[] {
    try {
      const parsed = JSON.parse(response);
      return parsed.tools || [];
    } catch {
      return [];
    }
  }
}
```

**Step 2: 修改 register.ts 注册 Action**

```typescript
// 在 apps/server/src/actions/register.ts 中添加
import { AIRouteAction } from './ai-route.action.js';

export function registerActions() {
  // ... existing code

  // Register AI Route action
  registerAction(new AIRouteAction());
}
```

**Step 3: Commit**

```bash
git add apps/server/src/actions/ai-route.action.ts apps/server/src/actions/register.ts
git commit -m "feat: add AI route action for command palette"
```

---

## Task 3: 创建后端 API 端点

**Files:**
- Create: `apps/server/src/controllers/command-palette.controller.ts`
- Modify: `apps/server/src/controllers/index.ts`

**Step 1: 创建 Controller**

```typescript
// apps/server/src/controllers/command-palette.controller.ts
import { Controller, Post, Body, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { aiRouteAction } from '../actions/ai-route.action.js';
import { toolExecuteAction } from '../actions/tool-execute.action.js';

class AIRouteRequest {
  input!: string;
}

class ToolExecuteRequest {
  toolId!: string;
  input!: string;
  options?: Record<string, unknown>;
}

@Controller('/api/command-palette')
export class CommandPaletteController {
  /**
   * AI 路由端点 - 判断使用哪个工具
   */
  @Post('/ai-route')
  @OpenAPI({
    summary: 'AI 路由 - 判断使用哪个工具',
    responses: {
      '200': {
        description: '返回匹配的工具列表',
      },
    },
  })
  async aiRoute(@Body() body: AIRouteRequest) {
    const result = await aiRouteAction.execute({ input: body.input });
    return result;
  }

  /**
   * 工具执行端点 - 执行本地工具
   */
  @Post('/execute-tool')
  @OpenAPI({
    summary: '执行工具',
    responses: {
      '200': {
        description: '返回工具执行结果',
      },
    },
  })
  async executeTool(@Body() body: ToolExecuteRequest) {
    const result = await toolExecuteAction.execute({
      toolId: body.toolId,
      input: body.input,
      options: body.options,
    });
    return result;
  }
}
```

**Step 2: 修改 index.ts 注册 Controller**

```typescript
// apps/server/src/controllers/index.ts
import { CommandPaletteController } from './command-palette.controller.js';

export const controllers = [
  // ... existing controllers
  CommandPaletteController,
];
```

**Step 3: Commit**

```bash
git add apps/server/src/controllers/command-palette.controller.ts apps/server/src/controllers/index.ts
git commit -m "feat: add command palette API endpoints"
```

---

## Task 4: Electron 主进程 - 注册全局快捷键

**Files:**
- Create: `apps/client/src/main/shortcut.ts`
- Modify: `apps/client/src/main/index.ts`

**Step 1: 创建 shortcut.ts**

```typescript
// apps/client/src/main/shortcut.ts
import { globalShortcut, BrowserWindow } from 'electron';
import { logger } from './logger';
import { WindowManager } from './window';

export class ShortcutManager {
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  /**
   * 注册全局快捷键
   */
  register(): void {
    // Option + Space (macOS)
    const ret = globalShortcut.register('Option+Space', () => {
      logger.info('Global shortcut triggered: Option+Space');
      this.toggleCommandPalette();
    });

    if (!ret) {
      logger.error('Failed to register global shortcut: Option+Space');
    } else {
      logger.info('Global shortcut registered: Option+Space');
    }
  }

  /**
   * 切换命令面板显示/隐藏
   */
  private toggleCommandPalette(): void {
    const mainWindow = this.windowManager.getWindow();
    if (!mainWindow) return;

    if (mainWindow.isVisible()) {
      // 发送消息到渲染进程切换面板
      mainWindow.webContents.send('toggle-command-palette');
    } else {
      mainWindow.show();
      mainWindow.webContents.send('toggle-command-palette');
    }
  }

  /**
   * 注销快捷键
   */
  unregister(): void {
    globalShortcut.unregisterAll();
    logger.info('Global shortcuts unregistered');
  }
}
```

**Step 2: 修改 index.ts**

```typescript
// apps/client/src/main/index.ts
// 添加导入
import { ShortcutManager } from './shortcut.js';

// 在 initializeApp 函数中
export async function initializeApp(): Promise<void> {
  const windowManager = new WindowManager();
  const shortcutManager = new ShortcutManager(windowManager);  // 新增
  const trayManager = new TrayManager(windowManager);
  // ...

  // 注册全局快捷键
  shortcutManager.register();

  // 在 will-quit 时注销
  app.on('will-quit', () => {
    shortcutManager.unregister();  // 新增
    socketServer.stop();
    logger.close();
  });
}
```

**Step 3: Commit**

```bash
git add apps/client/src/main/shortcut.ts apps/client/src/main/index.ts
git commit -m "feat: add global shortcut for command palette"
```

---

## Task 5: Preload - 添加 IPC 通信

**Files:**
- Modify: `apps/client/src/preload/index.ts`

**Step 1: 添加 Command Palette IPC**

```typescript
// 在 preload/index.ts 中添加

// Command palette callback types
type CommandPaletteCallback = (visible: boolean) => void;

// 添加 callback map
const commandPaletteCallbackMap = new Map<
  CommandPaletteCallback,
  (event: IpcRendererEvent, visible: boolean) => void
>();

// 在 contextBridge.exposeInMainWorld 中添加
// Command palette
onCommandPaletteVisibility: (callback: CommandPaletteCallback) => {
  const wrappedCallback = (_event: IpcRendererEvent, visible: boolean) => {
    callback(visible);
  };
  commandPaletteCallbackMap.set(callback, wrappedCallback);
  ipcRenderer.on('toggle-command-palette', wrappedCallback);
},
removeCommandPaletteListener: (callback: CommandPaletteCallback) => {
  const wrappedCallback = commandPaletteCallbackMap.get(callback);
  if (wrappedCallback) {
    ipcRenderer.removeListener('toggle-command-palette', wrappedCallback);
    commandPaletteCallbackMap.delete(callback);
  }
},
```

**Step 2: 更新类型定义**

```typescript
// 在 declare global 中添加
onCommandPaletteVisibility: (callback: (visible: boolean) => void) => void;
removeCommandPaletteListener: (callback: (visible: boolean) => void) => void;
```

**Step 3: Commit**

```bash
git add apps/client/src/preload/index.ts
git commit -m "feat: add IPC for command palette visibility"
```

---

## Task 6: 前端 - Command Palette Service

**Files:**
- Create: `apps/web/src/services/command-palette.service.ts`

**Step 1: 创建 Service**

```typescript
// apps/web/src/services/command-palette.service.ts
import { Service, observable } from '@rabjs/react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface ToolExecutionResult {
  result: string;
  success: boolean;
  error?: string;
}

@Service()
export class CommandPaletteService {
  @observable
  isVisible = false;

  @observable
  input = '';

  @observable
  tools: Tool[] = [];

  @observable
  selectedToolIndex = 0;

  @observable
  isLoading = false;

  @observable
  result: ToolExecutionResult | null = null;

  @observable
  error: string | null = null;

  // 防抖定时器
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 切换面板显示/隐藏
   */
  toggle(): void {
    this.isVisible = !this.isVisible;
    if (!this.isVisible) {
      this.reset();
    }
  }

  /**
   * 显示面板
   */
  show(): void {
    this.isVisible = true;
    this.input = '';
    this.tools = [];
    this.result = null;
    this.error = null;
    this.selectedToolIndex = 0;
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    this.isVisible = false;
    this.reset();
  }

  /**
   * 重置状态
   */
  private reset(): void {
    this.input = '';
    this.tools = [];
    this.result = null;
    this.error = null;
    this.selectedToolIndex = 0;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * 处理输入变化
   */
  onInputChange(value: string): void {
    this.input = value;
    this.debouncedAIRoute();
  }

  /**
   * 防抖调用 AI 路由
   */
  private debouncedAIRoute(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.callAIRoute();
    }, 300);
  }

  /**
   * 调用 AI 路由
   */
  async callAIRoute(): Promise<void> {
    if (!this.input.trim()) {
      this.tools = [];
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const response = await fetch('/api/command-palette/ai-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: this.input }),
      });

      const data = await response.json();
      if (data.success) {
        this.tools = data.data.tools || [];
        this.selectedToolIndex = 0;
      } else {
        this.error = data.error?.message || 'AI 路由失败';
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : '网络错误';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 执行选中的工具
   */
  async executeTool(toolId?: string): Promise<void> {
    const targetToolId = toolId || (this.tools[this.selectedToolIndex]?.id);
    if (!targetToolId) return;

    this.isLoading = true;
    this.error = null;

    try {
      const response = await fetch('/api/command-palette/execute-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: targetToolId,
          input: this.input,
        }),
      });

      const data = await response.json();
      if (data.success) {
        this.result = data.data;
      } else {
        this.error = data.error?.message || '工具执行失败';
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : '网络错误';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 选择上一个工具
   */
  selectPreviousTool(): void {
    if (this.tools.length === 0) return;
    this.selectedToolIndex = (this.selectedToolIndex - 1 + this.tools.length) % this.tools.length;
  }

  /**
   * 选择下一个工具
   */
  selectNextTool(): void {
    if (this.tools.length === 0) return;
    this.selectedToolIndex = (this.selectedToolIndex + 1) % this.tools.length;
  }

  /**
   * 复制结果到剪贴板
   */
  async copyResult(): Promise<void> {
    if (!this.result?.result) return;
    await navigator.clipboard.writeText(this.result.result);
  }
}
```

**Step 2: 注册 Service**

在 `apps/web/src/main.tsx` 中添加:
```typescript
import { CommandPaletteService } from './services/command-palette.service';

register(CommandPaletteService);
```

**Step 3: Commit**

```bash
git add apps/web/src/services/command-palette.service.ts apps/web/src/main.tsx
git commit -m "feat: add command palette service"
```

---

## Task 7: 前端 - Command Palette 组件

**Files:**
- Create: `apps/web/src/components/command-palette/command-palette.tsx`
- Create: `apps/web/src/components/command-palette/index.ts`

**Step 1: 创建组件**

```typescript
// apps/web/src/components/command-palette/command-palette.tsx
import { observer, useService } from '@rabjs/react';
import { useEffect, useRef } from 'react';
import { CommandPaletteService } from '../../services/command-palette.service';
import './command-palette.css';

export const CommandPalette = observer(() => {
  const service = useService(CommandPaletteService);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦输入框
  useEffect(() => {
    if (service.isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [service.isVisible]);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!service.isVisible) return;

      switch (e.key) {
        case 'Escape':
          service.hide();
          break;
        case 'ArrowUp':
          e.preventDefault();
          service.selectPreviousTool();
          break;
        case 'ArrowDown':
          e.preventDefault();
          service.selectNextTool();
          break;
        case 'Enter':
          e.preventDefault();
          if (service.result) {
            service.copyResult();
          } else if (service.tools.length > 0) {
            service.executeTool();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [service]);

  // 点击遮罩关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      service.hide();
    }
  };

  if (!service.isVisible) return null;

  return (
    <div className="command-palette-overlay" onClick={handleOverlayClick}>
      <div className="command-palette">
        {/* 输入区 */}
        <div className="command-palette-input-wrapper">
          <svg className="command-palette-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="输入指令或问题..."
            value={service.input}
            onChange={(e) => service.onInputChange(e.target.value)}
          />
          {service.isLoading && <div className="command-palette-spinner" />}
        </div>

        {/* 工具列表 */}
        {service.tools.length > 0 && !service.result && (
          <div className="command-palette-list">
            {service.tools.map((tool, index) => (
              <div
                key={tool.id}
                className={`command-palette-item ${index === service.selectedToolIndex ? 'selected' : ''}`}
                onClick={() => {
                  service.selectedToolIndex = index;
                  service.executeTool();
                }}
              >
                <span className="command-palette-item-name">{tool.name}</span>
                <span className="command-palette-item-desc">{tool.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* 结果展示区 */}
        {service.result && (
          <div className="command-palette-result">
            <div className="command-palette-result-header">
              <span>结果</span>
              <button
                className="command-palette-copy-btn"
                onClick={() => service.copyResult()}
              >
                复制
              </button>
            </div>
            <pre className="command-palette-result-content">{service.result.result}</pre>
          </div>
        )}

        {/* 错误提示 */}
        {service.error && (
          <div className="command-palette-error">{service.error}</div>
        )}
      </div>
    </div>
  );
});
```

**Step 2: 创建 CSS**

```css
/* apps/web/src/components/command-palette/command-palette.css */
.command-palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 9999;
}

.command-palette {
  width: 600px;
  max-height: 70vh;
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.command-palette-input-wrapper {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.command-palette-icon {
  width: 20px;
  height: 20px;
  color: var(--text-secondary, #6b7280);
  margin-right: 12px;
  flex-shrink: 0;
}

.command-palette-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 18px;
  background: transparent;
  color: var(--text-primary, #111827);
}

.command-palette-input::placeholder {
  color: var(--text-secondary, #9ca3af);
}

.command-palette-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color, #e5e7eb);
  border-top-color: var(--primary-color, #3b82f6);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.command-palette-list {
  max-height: 300px;
  overflow-y: auto;
}

.command-palette-item {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-bottom: 1px solid var(--border-color, #f3f4f6);
}

.command-palette-item:hover,
.command-palette-item.selected {
  background: var(--bg-secondary, #f9fafb);
}

.command-palette-item-name {
  font-weight: 500;
  color: var(--text-primary, #111827);
}

.command-palette-item-desc {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.command-palette-result {
  padding: 16px;
  border-top: 1px solid var(--border-color, #e5e7eb);
}

.command-palette-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.command-palette-result-header span {
  font-weight: 500;
  color: var(--text-primary, #111827);
}

.command-palette-copy-btn {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 6px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #374151);
  cursor: pointer;
}

.command-palette-copy-btn:hover {
  background: var(--bg-secondary, #f9fafb);
}

.command-palette-result-content {
  background: var(--bg-secondary, #f9fafb);
  padding: 12px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
}

.command-palette-error {
  padding: 12px 16px;
  color: #ef4444;
  font-size: 14px;
  border-top: 1px solid #fee2e2;
  background: #fef2f2;
}
```

**Step 3: 创建 index.ts**

```typescript
// apps/web/src/components/command-palette/index.ts
export { CommandPalette } from './command-palette';
```

**Step 4: Commit**

```bash
git add apps/web/src/components/command-palette/
git commit -m "feat: add command palette component"
```

---

## Task 8: 集成 Command Palette 到 App

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/electron/isElectron.ts`

**Step 1: 修改 App.tsx**

```typescript
// apps/web/src/App.tsx 中添加
import { CommandPalette } from './components/command-palette';
import { useEffect } from 'react';
import { useService } from '@rabjs/react';
import { CommandPaletteService } from './services/command-palette.service';
import { isElectron } from './electron/isElectron';

// 在 AppContent 组件中添加
function CommandPaletteInitializer() {
  const commandPaletteService = useService(CommandPaletteService);

  useEffect(() => {
    if (!isElectron()) return;

    // 监听 Electron 发送的面板切换消息
    const handleVisibility = (visible: boolean) => {
      if (visible) {
        commandPaletteService.show();
      } else {
        commandPaletteService.hide();
      }
    };

    window.electronAPI.onCommandPaletteVisibility(handleVisibility);

    return () => {
      window.electronAPI.removeCommandPaletteListener(handleVisibility);
    };
  }, [commandPaletteService]);

  return null;
}

// 在 App 组件的 Router 中添加
<CommandPaletteInitializer />
<CommandPalette />
```

**Step 2: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: integrate command palette into app"
```

---

## Task 9: 实现 AI 辅助工具 (翻译、总结、代码解释)

**Files:**
- Create: `apps/server/src/actions/tool-execute.action.ts`
- Modify: `apps/server/src/actions/register.ts`

**Step 1: 创建 Tool Execute Action**

```typescript
// apps/server/src/actions/tool-execute.action.ts
import type { ActionHandler, ActionResult, ActionParamSchema } from './types.js';
import { getToolById, tools } from '../utils/tools/index.js';

interface ToolExecuteParams {
  toolId: string;
  input: string;
  options?: Record<string, unknown>;
}

/**
 * 工具执行 Action
 */
export class ToolExecuteAction implements ActionHandler {
  id = 'tool-execute';
  name = 'Tool Execute';
  description = '执行工具';

  paramSchema: Record<string, ActionParamSchema> = {
    toolId: {
      type: 'string',
      description: '工具 ID',
      required: true,
    },
    input: {
      type: 'string',
      description: '输入内容',
      required: true,
    },
    options: {
      type: 'object',
      description: '工具选项',
      required: false,
    },
  };

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const { toolId, input, options } = params as unknown as ToolExecuteParams;

    // 查找本地工具
    const localTool = getToolById(toolId);
    if (localTool) {
      try {
        const result = localTool.execute(input, options);
        return {
          success: true,
          data: { result: await result },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            message: error instanceof Error ? error.message : '工具执行失败',
            code: 'TOOL_EXECUTE_ERROR',
          },
        };
      }
    }

    // AI 辅助工具
    if (toolId.startsWith('ai-')) {
      return this.executeAITool(toolId, input, options);
    }

    return {
      success: false,
      error: {
        message: '未找到工具',
        code: 'TOOL_NOT_FOUND',
      },
    };
  }

  private async executeAITool(
    toolId: string,
    input: string,
    _options?: Record<string, unknown>
  ): Promise<ActionResult> {
    // TODO: 实现 AI 辅助工具调用 LangChain
    const aiPrompts: Record<string, string> = {
      'ai-translate': `请将以下内容翻译成中文：\n\n${input}`,
      'ai-summarize': `请简洁总结以下内容：\n\n${input}`,
      'ai-explain': `请解释以下代码：\n\n${input}`,
    };

    const prompt = aiPrompts[toolId];
    if (!prompt) {
      return {
        success: false,
        error: {
          message: '未知的 AI 工具',
          code: 'UNKNOWN_AI_TOOL',
        },
      };
    }

    // TODO: 替换为实际的 LangChain 调用
    return {
      success: true,
      data: {
        result: '[AI 工具调用占位符 - 待实现 LangChain 集成]',
      },
    };
  }
}
```

**Step 2: 在工具列表中添加 AI 工具**

修改 `apps/server/src/utils/tools/index.ts`:
```typescript
// 添加 AI 工具
{
  id: 'ai-translate',
  name: '翻译',
  description: '调用 AI 翻译文本',
  category: 'ai',
  execute: async (input) => {
    // 实际执行由 toolExecuteAction 处理
    return '';
  },
},
{
  id: 'ai-summarize',
  name: '总结',
  description: '调用 AI 总结文本',
  category: 'ai',
  execute: async (input) => {
    return '';
  },
},
{
  id: 'ai-explain',
  name: '代码解释',
  description: '调用 AI 解释代码',
  category: 'ai',
  execute: async (input) => {
    return '';
  },
},
```

**Step 3: 注册 Action**

```typescript
// apps/server/src/actions/register.ts
import { ToolExecuteAction } from './tool-execute.action.js';

export function registerActions() {
  registerAction(new ToolExecuteAction());
}
```

**Step 4: Commit**

```bash
git add apps/server/src/actions/tool-execute.action.ts apps/server/src/utils/tools/index.ts apps/server/src/actions/register.ts
git commit -m "feat: add AI tool execution support"
```

---

## Task 10: 测试和验证

**Files:**
- N/A

**Step 1: 启动开发服务器**

```bash
# 启动后端
pnpm dev:server

# 启动前端
pnpm dev:web
```

**Step 2: 测试 Electron 客户端**

```bash
pnpm dev:client
```

**Step 3: 验证流程**

1. 在 Electron 客户端中按 Option + Space
2. 确认命令面板显示
3. 输入测试内容（如 "hello" 或 "uuid"）
4. 验证工具列表显示
5. 点击或按 Enter 执行工具
6. 验证结果展示和复制功能

**Step 4: Commit**

```bash
git commit -m "test: verify command palette functionality"
```

---

## 总结

共 10 个任务，涵盖:
- 本地工具函数库 (Task 1)
- AI 路由 Action (Task 2-3)
- Electron 主进程快捷键 (Task 4-5)
- 前端 Service 和组件 (Task 6-8)
- AI 辅助工具 (Task 9)
- 测试验证 (Task 10)
