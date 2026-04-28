---
paths:
  - "apps/web/src/**/*.{ts,tsx,css}"
  - "apps/client/src/**/*.{ts,tsx,css}"
---

# Design System Rules

## Design Principles

- **无边框约束** — 用背景色差和阴影代替所有边框分隔
- **绿色主色** — 所有交互状态（hover、active、selected）使用绿色 (#22c55e)
- **克制点缀** — 点缀色仅在少数关键位置使用，不滥用
- **悬浮呼吸感** — 透明背景、模糊效果、hover 上浮营造层次

## Color System

### 亮色模式

| 用途 | 颜色 |
|------|------|
| 主色调 | `#22c55e` / `#16a34a` |
| 选中态文字 | `text-green-600` |
| Hover 背景 | `bg-green-50/60` |
| 背景 | `#FFFFFF` / `#F9FAFB` |

### 暗色模式

| 用途 | 颜色 |
|------|------|
| 主色调 | `#4ade80` / `#22c55e` |
| 选中态文字 | `text-green-400` |
| Hover 背景 | `bg-green-900/15` |
| 背景 | `#09090b` / `#18181b` |

## Component Specs

### Sidebar / Header

- 无边框分隔 — 靠 `box-shadow` 柔和阴影分隔
- Header 悬浮背景 — `bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl`
- Tab 指示器 — 底部绿色下划线 (`border-b-2 border-green-500`)
- 操作区间距 — `gap-3` (12px) 保持通透

### TreeNode / List Items

- 选中态 — 文字变绿色 + `font-medium`，无背景
- Hover — 极淡绿色背景 `bg-green-50/60 dark:bg-green-900/15`
- 图标 — 保持原有颜色，仅文字颜色变化

### Buttons

- 主要按钮 — 绿色渐变 `bg-gradient-to-br from-green-500 to-green-600`
- Hover 效果 — `hover:-translate-y-0.5` 上浮 + 光晕加深
- Active 态 — 淡绿色背景 + 绿色文字

## Shadows

| 位置 | 亮色模式 | 暗色模式 |
|------|---------|---------|
| Sidebar 分隔 | `4px 0 24px rgba(0,0,0,0.06)` | `4px 0 24px rgba(0,0,0,0.4)` |
| Header 底部 | `0 2px 12px rgba(0,0,0,0.04)` | `0 2px 12px rgba(0,0,0,0.2)` |
| 主要按钮 | `0 2px 8px rgba(34,197,94,0.3)` | — |

## Interactions

- 过渡动画 — `transition-all duration-150` 统一使用 150ms
- Hover 上浮 — `hover:-translate-y-0.5` 用于按钮和卡片
- 状态圆点发光 — `shadow-[0_0_6px_rgba(34,197,94,0.6)]`
