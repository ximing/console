# Blog 侧边栏展开/收起 + 拖动宽度 设计方案

## 1. 概述

为博客侧边栏添加折叠/展开功能和可拖动调整宽度能力，提升用户对布局的掌控感。

## 2. 核心功能

### 2.1 折叠/展开

- 侧边栏可完全折叠，仅显示 48px 宽的图标区域
- 折叠时显示垂直居中排列的图标按钮（搜索、新建博客）
- 点击最上方按钮展开侧边栏
- 状态持久化到 localStorage

### 2.2 拖动调整宽度

- 侧边栏右侧边缘显示 4px 宽的拖动手柄（分隔线）
- 鼠标悬停时手柄高亮显示，光标变为 `ew-resize`
- 拖动范围：200px - 400px（展开状态）
- 拖动结束后自动持久化宽度

### 2.3 持久化

- 使用 localStorage 存储，key: `blog-sidebar-state`
- 存储内容：`{ isCollapsed: boolean, sidebarWidth: number }`
- 页面加载时读取并恢复状态
- **错误处理**：读取/写入失败时静默回退到默认值（不阻塞 UI）
- **Schema 校验**：读取时验证数据类型，无效时回退到默认值

## 3. 实现方案

### 3.1 新增文件

**`apps/web/src/pages/blogs/components/sidebar/hooks/useSidebarState.ts`**

```ts
interface UseSidebarStateReturn {
  isCollapsed: boolean;
  sidebarWidth: number;
  collapsedWidth: number;
  minWidth: number;
  maxWidth: number;
  toggleCollapse: () => void;
  setWidth: (width: number) => void;
}

const STORAGE_KEY = 'blog-sidebar-state';
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const COLLAPSED_WIDTH = 48;

export function useSidebarState(): UseSidebarStateReturn {
  // 从 localStorage 读取初始化状态，读取失败时使用默认值
  // 返回 isCollapsed, sidebarWidth, toggleCollapse, setWidth
  // setWidth 使用函数式更新确保原子性
}
```

**`apps/web/src/pages/blogs/components/sidebar/resizable-sidebar.tsx`**

```tsx
interface ResizableSidebarProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  collapsedWidth?: number;
}
```

### 3.2 文件变更

| 文件 | 变更 |
|------|------|
| `apps/web/src/pages/blogs/blogs.tsx` | 用 `ResizableSidebar` 包裹 `Sidebar` |

### 3.3 拖动实现

使用原生 `mousedown/mousemove/mouseup` 和 `touchstart/touchmove/touchend` 事件（兼容触屏设备）：

1. `mousedown`/`touchstart` 在手柄上：记录起始 X 坐标和当前宽度
2. `mousemove`/`touchmove`：计算差值，使用函数式更新 `setWidth(prev => Math.min(maxWidth, Math.max(minWidth, prev + delta)))` 确保原子性
3. `mouseup`/`touchend`：写入最终宽度到 state，触发持久化
4. **视口约束**：拖动时限制宽度不超过右侧视口剩余空间

### 3.4 折叠状态 UI

折叠时侧边栏变为 48px 宽，图标按钮垂直居中排列：
- 搜索图标（点击展开侧边栏）
- 新建博客图标（点击触发新建博客）
- 展开按钮图标（点击展开侧边栏）

展开后搜索按钮位于顶部，用户可继续操作。

## 4. 设计决策

- **不引入第三方库**：使用原生 React 事件，保持轻量
- **独立 Hook**：参考现有 `useTreeState` 模式，便于测试和复用
- **仅支持水平拖动**：与现有布局方向一致
- **折叠时保留功能入口**：搜索和新建在折叠状态仍可使用
