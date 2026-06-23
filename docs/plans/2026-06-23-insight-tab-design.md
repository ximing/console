# 不惑（Insight）Tab 设计文档

**日期：** 2026-06-23  
**状态：** 已确认，待实现

## 概述

新增侧边栏 Tab「不惑 / Insight」，核心功能是：根据用户预存的八字+大运档案，结合自动计算的流年/流月/流日干支，生成可复制到 ChatGPT 的格式化分析 Prompt。

不在应用内调用大模型，用户自行粘贴 Prompt 到 ChatGPT 进行询问。

## 技术方案

**方案 A（已选）：** 纯前端计算 + 后端只做 CRUD

- 八字/大运数据存 DB，前端读取
- 流年/流月/流日计算在前端（`lunar-javascript` 库）
- Prompt 在前端组装，直接复制
- 后端只提供档案增删改查接口

## 数据模型

### `insight_profiles`（命主档案）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(191) PK | |
| `user_id` | varchar(191) FK | 关联用户 |
| `name` | varchar(50) | 命主名称（自己/妈妈/老公） |
| `year_gan` | varchar(4) | 年柱天干 |
| `year_zhi` | varchar(4) | 年柱地支 |
| `month_gan` | varchar(4) | 月柱天干 |
| `month_zhi` | varchar(4) | 月柱地支 |
| `day_gan` | varchar(4) | 日柱天干 |
| `day_zhi` | varchar(4) | 日柱地支 |
| `hour_gan` | varchar(4) | 时柱天干 |
| `hour_zhi` | varchar(4) | 时柱地支 |
| `year_detail` | json | 年柱复合数据（见下） |
| `month_detail` | json | 月柱复合数据 |
| `day_detail` | json | 日柱复合数据 |
| `hour_detail` | json | 时柱复合数据 |
| `shenshas` | json | 全局神煞列表（跨柱） |
| `birth_year` | int | 出生公历年份（用于大运起算） |
| `custom_aspects` | json | 用户自定义分析方向数组 |
| `sort_order` | int | 排序 |
| `created_at` | timestamp(3) | |
| `updated_at` | timestamp(3) | |

**`*_detail` JSON 结构（每柱）：**

```json
{
  "shishen_gan": "比肩",
  "shishen_gan_sub": "正印",
  "canggan": [
    { "gan": "癸", "shishen": "正印" },
    { "gan": "辛", "shishen": "偏印" }
  ],
  "nayin": "海中金",
  "shenshas": ["天乙贵人", "文昌"]
}
```

**`shenshas`（全局）JSON 结构：**

```json
["驿马", "桃花", "羊刃", "华盖"]
```

### `insight_dayun`（大运列表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(191) PK | |
| `profile_id` | varchar(191) FK | |
| `gan` | varchar(4) | 天干 |
| `zhi` | varchar(4) | 地支 |
| `start_year` | int | 该步大运起运公历年份 |
| `sort_order` | int | 第几步大运（1、2、3…） |

系统根据 `today.year >= start_year && today.year < next_dayun.start_year` 自动判定当前大运。

## 后端 API

路由前缀：`/api/v1/insight`，均走 cookie JWT auth。

### 档案 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/profiles` | 获取当前用户所有档案（含大运列表） |
| POST | `/profiles` | 创建档案 |
| PUT | `/profiles/:id` | 更新档案 |
| DELETE | `/profiles/:id` | 删除档案 |

### 大运管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/profiles/:profileId/dayun` | 批量替换保存大运列表 |

## 前端结构

### 路由 & 导航

- 新增路由 `/insight` → `InsightPage`
- `layout.tsx` 侧边栏新增图标按钮（`Compass` 图标，lucide-react）
- `App.tsx` 新增 `<Route path="/insight/*">`

### 页面布局

```
InsightPage（左右分栏）
├── 左栏：命主档案列表
│   ├── 档案卡片（名称 + 八字概览）
│   ├── 点击切换当前档案
│   └── 新建 / 编辑 / 删除入口
└── 右栏：Prompt 生成区
    ├── 当前命主信息展示
    │   ├── 八字格（天干行 / 地支行，2×4）
    │   └── 当前大运（自动计算）+ 流年/流月/流日
    ├── 时间段选择（单选）
    ├── 分析方向多选（预设 + 自定义）
    ├── 生成 Prompt 按钮
    └── Prompt 输出框（带一键复制）
```

### 文件结构

```
apps/web/src/pages/insight/
├── index.tsx
├── insight.tsx
├── insight.service.ts
├── components/
│   ├── profile-list/
│   │   ├── index.ts
│   │   ├── profile-list.tsx
│   │   └── profile-card.tsx
│   ├── profile-form/
│   │   ├── index.ts
│   │   ├── profile-form.tsx        # 新建/编辑弹窗
│   │   └── dayun-editor.tsx        # 大运列表编辑器（内嵌）
│   ├── bazi-display/
│   │   ├── index.ts
│   │   └── bazi-display.tsx        # 2×4 天干/地支展示
│   ├── prompt-generator/
│   │   ├── index.ts
│   │   ├── prompt-generator.tsx
│   │   └── time-period-selector.tsx
│   └── aspect-selector/
│       ├── index.ts
│       └── aspect-selector.tsx
└── utils/
    ├── ganzhi.ts                   # 流年/流月/流日计算（基于 lunar-javascript）
    └── prompt-builder.ts           # Prompt 组装逻辑
```

### 预设分析方向（13项）

`事业` / `财富` / `感情婚姻` / `健康` / `学业` / `家庭` / `子女` / `父母` / `出行` / `贵人` / `官非诉讼` / `住宅置业` / `名誉声望`

用户可在档案设置中自定义添加方向，存入 `custom_aspects` JSON 字段。

### 时间段选项

`今天` / `明天` / `后天` / `未来一周` / `未来一个月` / `未来三个月` / `未来半年` / `未来一年`

## Prompt 生成逻辑

### 流年/流月/流日计算

使用 `lunar-javascript` 库，根据所选时间段计算对应日期的干支：

- 今天/明天/后天：具体日期的流年干支 + 流月干支 + 流日干支
- 未来一周：列出7天的流日干支序列
- 未来一个月/三月/半年/一年：列出涉及的流月干支序列（标注年份）

### 生成 Prompt 模板

```
【命主信息】
八字：
  天干：{年干}  {月干}  {日干}  {时干}
  地支：{年支}  {月支}  {日支}  {时支}

当前大运：天干 {大运干}，地支 {大运支}（{start_year}年起）

【时间背景 - {时间段描述}】
流年：天干 {xxx}，地支 {xxx}
流月：天干 {xxx}，地支 {xxx}
流日：天干 {xxx}，地支 {xxx}（短期分析适用）

【分析请求】
请结合八字原局、当前大运、流年流月流日，重点从以下方面进行详细分析和建议：
{感情婚姻、事业、财富...}

时间范围：{今天 / 未来一周 / 未来一年...}
```

### 前端 API 文件

`apps/web/src/api/insight.ts` — 封装 profile + dayun 的增删改查请求。
