# Blog 页面 Header & Sidebar UI 重构设计

**日期**: 2026-04-04
**状态**: 已批准
**版本**: v1.0

---

## 1. 概述

对 Blog 页面的 Header 和 Sidebar 进行视觉重构，目标是创造更先锋、有呼吸感、克制的设计语言。保持全部现有功能，重新设计视觉表达。

### 设计方向

- **无边框约束** — 用背景色差和阴影代替所有边框分隔
- **绿色主色** — 所有交互状态（hover、active、selected）使用绿色 (#22c55e)
- **无点缀色** — 不使用琥珀色或其他点缀色，纯绿色系统
- **悬浮呼吸感** — Header 透明模糊背景，按钮 hover 上浮，阴影营造景深

---

## 2. 视觉规范

### 2.1 色彩系统

#### 亮色模式

| 元素 | 颜色 | 用途 |
|------|------|------|
| Sidebar 背景 | `#FFFFFF` | 纯白，无边框 |
| 与主内容区分隔 | `box-shadow: 4px 0 24px rgba(0,0,0,0.06)` | 柔和阴影 |
| 选中项 | `border-left: 2px solid #22c55e` | 绿色竖线 |
| 选中项背景 | `background: rgba(34,197,94,0.06)` | 极淡绿色 |
| Hover 状态 | `background: rgba(34,197,94,0.08)` | 淡绿色背景 |
| 主色调 | `#22c55e` / `#16a34a` | 绿色系统 |
| 主色调 Hover | `#16a34a` | 深绿色 |
| 文字主色 | `#111827` | 深灰 |
| 文字次色 | `#6b7280` | 中灰 |

#### 暗色模式

| 元素 | 颜色 | 用途 |
|------|------|------|
| Sidebar 背景 | `#09090b` | 纯黑 |
| 与主内容区分隔 | `box-shadow: 4px 0 24px rgba(0,0,0,0.4)` | 深色阴影 |
| 选中项 | `border-left: 2px solid #4ade80` | 亮绿色竖线 |
| 选中项背景 | `background: rgba(74,222,128,0.08)` | 极淡绿色 |
| Hover 状态 | `background: rgba(74,222,128,0.1)` | 淡绿色背景 |
| 主色调 | `#4ade80` / `#22c55e` | 亮绿色系统 |
| 文字主色 | `#fafafa` | 近白 |
| 文字次色 | `#71717a` | 暗灰 |

### 2.2 Sidebar 组件

#### 结构

```
┌──────────────────────────┐
│  🔍 搜索                 │  ← 无边框搜索按钮
│                          │
│  ● 目录    ○ 最近        │  ← Tab 圆点指示器（绿色=选中）
│                          │
│  ▶ 技术文档              │  ← 选中项：左侧绿色竖线 + 淡绿背景
│    ├ React 指南          │  ← Hover：淡绿背景
│    └ 使用教程            │
│  ▶ 生活随笔              │
│                          │
│  + 新建博客              │  ← Hover：绿色 + 上浮
│  + 新建目录              │
└──────────────────────────┘
```

#### 设计要点

1. **无边框** — Sidebar 完全无边框，靠右侧阴影与主内容区分隔
2. **搜索按钮** — 无边框无背景，hover 时淡绿色背景 + 绿色文字
3. **Tab 指示器** — 圆点 `●/○` 形式，选中为绿色发光圆点
4. **选中项** — 左侧 2px 绿色竖线 + 淡绿背景
5. **Hover 状态** — 淡绿色背景，不使用边框
6. **操作按钮** — 文字按钮，hover 变绿色 + translateY(-1px)

### 2.3 Header 组件

#### 结构

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ● 在线  |  技术文档 / 博客标题    [预览] [编辑] [保存] [发布] │
│                                                              │
└──────────────────────────────────────────────────────────────┘
    ↑                                              ↑
  绿色圆点                                    悬浮工具栏
  发光状态
```

#### 设计要点

1. **悬浮背景** — `background: rgba(255,255,255,0.9)` + `backdrop-filter: blur(12px)`
2. **无底部边框** — 用阴影替代边框分隔
3. **状态指示** — 绿色圆点带发光效果表示"在线"状态
4. **预览/编辑切换** — 分段控件，active 态为淡绿色背景 + 绿色文字
5. **保存按钮** — 图标按钮，hover 变绿色
6. **发布按钮** — 渐变绿色背景，白色文字，hover 上浮 + 光晕加深

---

## 3. 组件变更清单

### 3.1 Sidebar 组件 (`apps/web/src/pages/blogs/components/sidebar/`)

| 文件 | 变更内容 |
|------|---------|
| `index.tsx` | 移除 `border-r` 边框，添加右侧阴影，背景色差分隔 |
| `sidebar-tabs.tsx` | Tab 指示器改为圆点，选中为绿色发光圆点 |
| `search-button.tsx` | 移除边框，hover 使用淡绿背景 |
| `recent-blog-list.tsx` | 同 TreeNode hover 风格 |
| `resizable-sidebar.tsx` | 阴影样式调整 |

### 3.2 TreeNode 组件 (`apps/web/src/pages/blogs/components/directory-tree/`)

| 文件 | 变更内容 |
|------|---------|
| `TreeNode.tsx` | 选中态：左侧绿色竖线替代绿色背景；hover：淡绿背景替代灰色背景 |

### 3.3 Header 组件 (`apps/web/src/pages/blogs/components/blog-editor/`)

| 文件 | 变更内容 |
|------|---------|
| `blog-editor-header.tsx` | 悬浮背景、状态圆点、绿色发布按钮渐变 |

---

## 4. 实现优先级

### Phase 1: Sidebar 重构
1. 移除 Sidebar 所有边框，添加阴影
2. Tab 改为圆点指示器
3. TreeNode 选中态改为绿色竖线
4. 操作按钮 hover 效果

### Phase 2: Header 重构
1. 悬浮背景 + 模糊效果
2. 状态指示改为发光圆点
3. 按钮样式统一

---

## 5. 附录

### 5.1 交互状态对照

| 状态 | 亮色模式 | 暗色模式 |
|------|---------|---------|
| Default | `transparent` | `transparent` |
| Hover | `rgba(34,197,94,0.08)` | `rgba(74,222,128,0.1)` |
| Selected | `border-left: 2px solid #22c55e` + `rgba(34,197,94,0.06)` | `border-left: 2px solid #4ade80` + `rgba(74,222,128,0.08)` |
| Active/Pressed | `#16a34a` | `#22c55e` |
| Disabled | `opacity: 0.5` | `opacity: 0.5` |

### 5.2 阴影系统

| 位置 | 亮色模式 | 暗色模式 |
|------|---------|---------|
| Sidebar 分隔 | `4px 0 24px rgba(0,0,0,0.06)` | `4px 0 24px rgba(0,0,0,0.4)` |
| Header 底部 | `0 2px 12px rgba(0,0,0,0.04)` | `0 2px 12px rgba(0,0,0,0.2)` |
| 发布按钮 | `0 2px 8px rgba(34,197,94,0.3)` | `0 2px 8px rgba(34,197,94,0.3)` |

### 5.3 Tab 圆点指示器 CSS

```css
/* 未选中圆点 */
.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db; /* 亮色模式 */
  background: #3f3f46;  /* 暗色模式 */
  transition: all 0.2s ease;
}

/* 选中圆点 - 发光效果 */
.tab-dot.active {
  background: #22c55e; /* 亮色模式 */
  background: #4ade80;  /* 暗色模式 */
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5); /* 亮色模式 */
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.5); /* 暗色模式 */
}

/* Hover 放大 */
.tab-dot:hover:not(.active) {
  transform: scale(1.2);
}
```

### 5.4 Header 层级

- Header z-index: `10`（确保在内容之上）
- Header 阴影覆盖下方内容，形成悬浮感

### 5.5 状态圆点 CSS

```css
/* 在线状态 - 发光效果 */
.status-dot.online {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e; /* 亮色模式 */
  background: #4ade80;  /* 暗色模式 */
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}
```

---

**审批状态**: ✅ 已批准，等待实现
