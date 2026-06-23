# Multi-BrowserView Tab 状态保持技术方案

## 1. 背景与目标

### 1.1 问题描述

当前 Electron 客户端使用单个 `BrowserWindow` 加载 Web 应用。当用户切换左侧导航 tab 时，React Router 会触发页面组件的 unmount/remount 周期，导致：

- 组件内 `useState` / `useRef` 等本地状态丢失
- 页面需要重新发起数据请求
- 用户在页面上输入的临时数据（如未保存的表单内容）丢失

### 1.2 目标

在 Electron 侧实现多 BrowserView 架构，每个主 tab 对应一个独立的 BrowserView。切换 tab 时只是显示/隐藏 BrowserView，而不是创建/销毁，从而保持页面状态。

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│  BrowserWindow (Electron Main Process)                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │
│  │  │ /home   │ │ /tasks  │ │ /github │ │ /blogs  │  │  │
│  │  │ (View)  │ │ (View)  │ │ (View)  │ │ (View)  │  │  │
│  │  │ hidden  │ │ hidden  │ │ visible │ │ hidden  │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │  │
│  │  ┌─────────┐ ┌─────────┐                          │  │
│  │  │ /apps   │ │/settings│                          │  │
│  │  │ (View)  │ │ (View)  │                          │  │
│  │  │ hidden  │ │ hidden  │                          │  │
│  │  └─────────┘ └─────────┘                          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [命令面板: 独立 BrowserWindow，不参与 tab 切换]           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 主 Tab 定义

| Tab ID        | 路由路径     | 描述       |
|---------------|-------------|------------|
| `home`        | `/home`     | 备忘录首页  |
| `tasks`       | `/tasks`    | 任务编排    |
| `notifications` | `/notifications` | 通知中心 |
| `github`      | `/github`   | GitHub 代码浏览 |
| `blogs`       | `/blogs`    | 博客管理    |
| `apps`        | `/apps`     | 应用管理    |
| `settings`    | `/settings` | 设置       |

### 2.3 核心组件关系

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Process                              │
│  ┌─────────────────┐    ┌─────────────────┐                      │
│  │   WindowManager │◄───│  IPC Handlers   │                      │
│  │                 │    │                 │                      │
│  │ - window        │    │  switch-tab     │◄─── renderer        │
│  │ - browserViews  │    │  get-active-tab │                      │
│  │ - activeTab     │    │                 │                      │
│  └────────┬────────┘    └─────────────────┘                      │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────────────────────────────────┐                │
│  │  Map<tabId, BrowserView>                     │                │
│  │  - 每个 tab 独立的 WebContents                  │                │
│  │  - 独立的页面生命周期                           │                │
│  │  - 状态持久化                                 │                │
│  └─────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
                    contextBridge
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Renderer Process                           │
│  ┌─────────────────┐    ┌─────────────────┐                      │
│  │   Layout        │    │   electronAPI   │                      │
│  │   (Sidebar Nav)│───►│                 │                      │
│  │                 │    │  switchTab()   │──► IPC call         │
│  └─────────────────┘    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

## 3. 实现细节

### 3.1 Electron 侧改动

#### 3.1.1 WindowManager 核心逻辑

**文件**: `apps/client/src/main/window.ts`

```typescript
// Tab 配置常量
const MAIN_TABS = [
  { id: 'home', route: '/home' },
  { id: 'tasks', route: '/tasks' },
  { id: 'notifications', route: '/notifications' },
  { id: 'github', route: '/github' },
  { id: 'blogs', route: '/blogs' },
  { id: 'apps', route: '/apps' },
  { id: 'settings', route: '/settings' },
] as const;

export class WindowManager {
  private window: BrowserWindow | null = null;
  private browserViews: Map<string, BrowserView> = new Map();
  private activeTab: string = 'home';

  // 创建 BrowserView
  private createBrowserView(id: string, route: string): BrowserView {
    const view = new BrowserView({
      webPreferences: {
        preload: PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // 加载对应路由 (使用 HashRouter 的 hash 模式)
    view.webContents.loadURL(VITE_DEV_SERVER_URL + '#' + route);

    // 限制导航只在 hash 变化时发生
    view.webContents.on('will-navigate', (event, url) => {
      const hash = new URL(url).hash;
      if (!hash) {
        event.preventDefault();
      }
    });

    return view;
  }

  // 初始化所有 BrowserView
  private initBrowserViews(): void {
    if (!this.window) return;

    for (const tab of MAIN_TABS) {
      const view = this.createBrowserView(tab.id, tab.route);
      this.browserViews.set(tab.id, view);
      this.window.addBrowserView(view);
    }

    // 设置初始可见 tab
    this.setActiveTab(this.activeTab);
  }

  // 切换 tab
  setActiveTab(tabId: string): void {
    if (!this.browserViews.has(tabId)) return;

    this.browserViews.forEach((view, id) => {
      if (id === tabId) {
        view.setVisible(true);
        view.setAutoResize({
          width: true,
          height: true,
          horizontal: true,
          vertical: true,
        });
      } else {
        view.setVisible(false);
      }
    });

    this.activeTab = tabId;
  }

  // 获取当前活动的 tab
  getActiveTab(): string {
    return this.activeTab;
  }
}
```

#### 3.1.2 BrowserView 布局管理

BrowserView 需要精确的布局以填满窗口内容区域（排除左侧 sidebar）：

```typescript
// 在 WindowManager 中管理布局
private updateBrowserViewBounds(): void {
  if (!this.window) return;

  const [windowWidth, windowHeight] = this.window.getSize();
  const SIDEBAR_WIDTH = 70;
  const MACOS_TRAFFIC_LIGHT_HEIGHT = process.platform === 'darwin' ? 30 : 0;

  const contentBounds = {
    x: SIDEBAR_WIDTH,
    y: MACOS_TRAFFIC_LIGHT_HEIGHT,
    width: windowWidth - SIDEBAR_WIDTH,
    height: windowHeight - MACOS_TRAFFIC_LIGHT_HEIGHT,
  };

  this.browserViews.forEach((view) => {
    view.setBounds(contentBounds);
  });
}

// 监听窗口大小变化
this.window.on('resize', () => {
  this.updateBrowserViewBounds();
});
```

#### 3.1.3 IPC Handler

**文件**: `apps/client/src/main/ipc.ts`

```typescript
// Tab 切换
ipcMain.handle('switch-tab', (_event, tabId: string) => {
  windowManager.setActiveTab(tabId);
  return { success: true };
});

// 获取当前 tab
ipcMain.handle('get-active-tab', () => {
  return windowManager.getActiveTab();
});
```

### 3.2 Preload API 扩展

**文件**: `apps/client/src/preload/index.ts`

```typescript
// 新增 API
contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有 API ...

  // Tab 管理
  switchTab: (tabId: string) => ipcRenderer.invoke('switch-tab', tabId),
  getActiveTab: () => ipcRenderer.invoke('get-active-tab'),
  onTabChanged: (callback: (tabId: string) => void) => {
    // 监听 tab 变化通知
  },
});
```

### 3.3 Web 侧改动

#### 3.3.1 Layout 组件改造

**文件**: `apps/web/src/components/layout.tsx`

侧边栏导航点击时，通过 IPC 通知 Electron 切换 tab，而不是使用 React Router navigate：

```typescript
// 原有的 navigate 方式 (会触发组件 unmount)
onClick={() => navigate('/github')}

// 新的 IPC 方式 (保持页面状态)
onClick={() => window.electronAPI?.switchTab('github')}
```

**关键改动点**:

```typescript
// 导航点击处理
const handleNavClick = (tabId: string, route: string) => {
  if (isElectron()) {
    // Electron 环境：通过 IPC 切换 BrowserView
    window.electronAPI?.switchTab(tabId);
  } else {
    // Web 环境：使用 React Router 导航
    navigate(route);
  }
};

// 每个导航按钮的 onClick
<button
  onClick={() => handleNavClick('github', '/github')}
  // ...
>
  <Github className="w-6 h-6" />
</button>
```

#### 3.3.2 路由初始加载处理

由于每个 BrowserView 独立加载，需要确保：

1. **HashRouter 模式**：Electron 环境下使用 HashRouter (`#/route`)
2. **初始路由匹配**：每个 BrowserView 根据其对应的路由初始化
3. **嵌套路由支持**：Settings 等嵌套路由的 BrowserView 需要能够处理子路由

### 3.4 现有功能适配

#### 3.4.1 命令面板

命令面板保持使用独立窗口 (`CommandPaletteWindowManager`)，不参与 tab 切换逻辑。

#### 3.4.2 拖拽文件

`files-dropped` 事件需要判断当前活动的 BrowserView 并发送给她：

```typescript
// window.ts 中
this.window.on('close', (event) => {
  this.saveState();
  // ...
});

// Drag and drop - 发送到当前活动的 BrowserView
ipcMain.on('files-dropped', (event, files: string[]) => {
  const activeView = this.browserViews.get(this.activeTab);
  if (activeView) {
    activeView.webContents.send('files-dropped', files);
  }
});
```

#### 3.4.3 外部链接

外部链接继续在系统浏览器打开：

```typescript
// BrowserView 的 webContents 设置
view.webContents.setWindowOpenHandler(({ url }) => {
  if (url.startsWith('https:')) {
    shell.openExternal(url);
  }
  return { action: 'deny' };
});
```

## 4. 数据流

### 4.1 Tab 切换流程

```
用户点击侧边栏 GitHub 按钮
         │
         ▼
┌─────────────────────────────────────┐
│  Layout.handleNavClick('github')    │
│  - 检查 isElectron()                │
│  - 调用 window.electronAPI.switchTab │
└─────────────────────────────────────┘
         │
         │ IPC invoke: 'switch-tab'
         ▼
┌─────────────────────────────────────┐
│  Main Process: ipcMain.handle      │
│  - windowManager.setActiveTab()     │
│  - 隐藏其他 BrowserView             │
│  - 显示目标 BrowserView             │
└─────────────────────────────────────┘
         │
         │ setVisible(true)
         ▼
┌─────────────────────────────────────┐
│  GitHub BrowserView (visible)       │
│  - WebContents 保持运行             │
│  - React 组件状态保留               │
│  - 无需重新加载数据                 │
└─────────────────────────────────────┘
```

### 4.2 状态保持原理

| 状态类型 | 保持方式 | 说明 |
|---------|---------|------|
| React 组件 state | BrowserView 生命周期 | 组件不 unmount，状态保留 |
| Service 状态 | 单例 + 内存 | @rabjs/react Service 本身是单例 |
| localStorage | 各 BrowserView 共享 | 同源，天然共享 |
| Socket.IO 连接 | 各 BrowserView 共享 | 同一进程内共享 |

## 5. 文件改动清单

### 5.1 Electron 侧 (apps/client/src/)

| 文件 | 改动类型 | 改动内容 |
|------|---------|---------|
| `main/window.ts` | 重构 | 添加 BrowserView 管理逻辑 |
| `main/ipc.ts` | 扩展 | 添加 switch-tab / get-active-tab handler |
| `preload/index.ts` | 扩展 | 暴露 switchTab / getActiveTab API |

### 5.2 Web 侧 (apps/web/src/)

| 文件 | 改动类型 | 改动内容 |
|------|---------|---------|
| `components/layout.tsx` | 修改 | 导航点击改为 IPC 调用 |
| `electron/isElectron.ts` | 确认 | 确保存在平台检测函数 |

## 6. 边界情况处理

### 6.1 窗口大小变化

监听窗口 `resize` 事件，重新计算所有 BrowserView 的 bounds。

### 6.2 macOS  traffic lights

当 `process.platform === 'darwin'` 时，内容区域需要考虑 30px 的 traffic light 高度。

### 6.3 首次加载

所有 BrowserView 在应用启动时并行加载，但只有默认 tab (`home`) 可见。

### 6.4 嵌套路由

Settings 页面包含多个子路由 (`/settings/user`, `/settings/models` 等)。这些嵌套路由在同一个 BrowserView 内通过 React Router 处理，无需额外逻辑。

### 6.5 命令面板

命令面板保持独立窗口模式，不受影响。

## 7. 优缺点分析

### 7.1 优点

1. **状态完整保留**：页面切换时组件完全不 unmount，状态天然保持
2. **用户体验**：切换 tab 感觉更快，因为无需重新渲染
3. **向后兼容**：Web 端代码改动很小，主要是 IPC 调用方式的改变
4. **并行加载**：多个 BrowserView 可以并行加载内容

### 7.2 缺点

1. **内存开销**：每个 BrowserView 都占用独立内存，多 tab 时内存占用增加
2. **代码复杂度**：WindowManager 逻辑变得更复杂
3. **全局状态同步**：如果 Service 状态需要在多个 tab 间同步（如未读通知数），需要额外处理
4. **调试复杂度**：多个 WebContents 增加调试难度

## 8. 测试计划

### 8.1 功能测试

- [ ] 各 tab 切换后状态保持（表单输入、滚动位置等）
- [ ] 窗口大小变化后布局正确
- [ ] macOS 环境下 traffic light 区域正确处理
- [ ] 命令面板功能正常
- [ ] 拖拽文件功能正常

### 8.2 性能测试

- [ ] 7 个 BrowserView 同时运行时的内存占用
- [ ] 首次加载时间
- [ ] Tab 切换响应时间

### 8.3 回归测试

- [ ] Web 端（浏览器）功能正常
- [ ] 现有所有功能不受影响

## 9. 实施顺序

1. **Phase 1**: 扩展 IPC 和 Preload API
2. **Phase 2**: 修改 WindowManager 支持多 BrowserView
3. **Phase 3**: 修改 Layout 组件使用 IPC 切换
4. **Phase 4**: 适配边界情况（拖拽、窗口变化等）
5. **Phase 5**: 测试与调优
