# 命主档案：保存原局宏观拆解

**日期：** 2026-07-03  
**状态：** 已批准

## 背景

命主档案当前的 Prompt 每次都让 AI 重新分析原局（第一部分：四大流派独立分析）。由于原局是固定的，用户拿到 AI 的分析结果后，后续每次生成 Prompt 都无需重复这一步骤。本功能允许用户将该分析文本保存到档案，后续自动复用。

## 功能范围

- 档案可保存一段原局宏观拆解的文本（AI 返回的第一部分内容）
- 有保存时：Prompt 第一部分替换为"已有分析"，AI 直接跳过重分析
- 无保存时：Prompt 保持现有四大流派分析指令，行为不变
- 保存操作入口在右侧 Prompt 区域

## 数据层

**`insight_profiles` 表新增字段：**

```sql
macro_analysis TEXT NULL
```

- 类型：`TEXT`（MySQL，足以容纳长文本）
- 可为空：未保存时为 `null`
- 无需索引

**Schema 文件：** `apps/server/src/db/schema/insight-profiles.ts`  
加入：`macroAnalysis: text('macro_analysis')`

**DTO：** `InsightProfileDto`（`apps/web/src/api/insight.ts`）  
加入：`macroAnalysis?: string | null`

**API：** 无需新接口。现有 `PUT /api/v1/insight/profiles/:id` 的 `updateProfile` 接受 `Partial<CreateProfileInput>`，直接传 `{ macroAnalysis }` 即可。  
`CreateProfileInput` 中加入 `macroAnalysis?: string | null`。

**Migration：** 运行 `migrate:generate` 生成迁移文件后 `migrate` 执行。

## Prompt 逻辑

**文件：** `apps/web/src/pages/insight/utils/prompt-builder.ts`

`buildPrompt` 函数签名加可选参数：

```ts
export function buildPrompt(
  profile: InsightProfileDto,
  period: TimePeriod,
  aspects: string[],
  macroAnalysis?: string   // 新增
): string
```

**有 `macroAnalysis` 时，** 第一部分替换为：

```
## 第一部分：原局宏观拆解（已有分析，无需重复）
{macroAnalysis}
```

**无 `macroAnalysis` 时，** 保持现有四大流派分析指令内容完全不变。

## UI

**文件：** `apps/web/src/pages/insight/components/prompt-generator/prompt-generator.tsx`

### 命主信息区

档案有 `macroAnalysis` 时，在命主姓名旁显示小标记：

```
✓ 已有原局分析
```

绿色小 badge，hover 可 tooltip 提示"已保存原局宏观拆解，生成 Prompt 时将自动使用"。

### Prompt 生成区

"生成 Prompt"按钮下方（不依赖是否已生成 Prompt，始终可见）加"保存原局分析"按钮。点击后展开一个 textarea（可折叠）：

- placeholder：`粘贴 AI 返回的第一部分分析内容（原局宏观拆解）...`
- 预填：若档案已有 `macroAnalysis`，则预填现有内容（方便更新）
- 确认按钮：`保存`，调用 `service.updateProfile(profile.id, { macroAnalysis: text })`
- 保存成功后：textarea 折叠，badge 显示更新

### 生成 Prompt 时

`handleGenerate` 调用 `buildPrompt` 时自动传入 `profile.macroAnalysis ?? undefined`，用户无需手动选择。

## InsightService

`apps/web/src/pages/insight/insight.service.ts` 的 `updateProfile` 已支持 `Partial<CreateProfileInput>`，无需修改服务层。本地 profiles 列表在 `updateProfile` 成功后已自动同步。

## 错误处理

- 保存失败时显示 toast 或行内错误提示（与现有错误处理风格一致）
- 网络失败不清空已有的本地内容

## 不在范围内

- 分流派单独存储（整段文本即可）
- 原局分析的版本历史
- 自动从 AI 返回内容中提取（用户手动粘贴）
