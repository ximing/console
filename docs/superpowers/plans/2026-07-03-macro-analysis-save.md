# 保存原局宏观拆解 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在命主档案中保存 AI 返回的原局宏观拆解文本，生成 Prompt 时自动复用，避免每次重复分析。

**Architecture:** 在 `insight_profiles` 表加 `macro_analysis TEXT` 字段，通过现有 updateProfile API 保存；前端 `buildPrompt` 接受可选 `macroAnalysis` 参数，有值时替换第一部分指令为已有分析；PromptGenerator 组件加保存入口 + 档案有分析时显示 badge。

**Tech Stack:** Drizzle ORM (MySQL), Express/routing-controllers, React 19, @rabjs/react

## Global Constraints

- 不新增 API 接口，复用 `PUT /api/v1/insight/profiles/:id`
- 字段类型：`text('macro_analysis')` nullable，不加索引
- 前端 badge 颜色遵循设计系统：绿色 `text-green-600 dark:text-green-400`
- Commit 遵循 Conventional Commits：`feat(insight): ...`

---

### Task 1: 数据库 Schema + 服务层

**Files:**
- Modify: `apps/server/src/db/schema/insight-profiles.ts`
- Modify: `apps/server/src/services/insight.service.ts`

**Interfaces:**
- Produces: `macroAnalysis?: string | null` 字段在 DB schema 和 `CreateProfileInput` 中可用

- [ ] **Step 1: 在 schema 中加 `macroAnalysis` 字段**

打开 `apps/server/src/db/schema/insight-profiles.ts`，在 `customAspects` 行之后加一行：

```ts
// 在 customAspects 行之后添加
customAspects: json('custom_aspects').$type<string[]>(),
macroAnalysis: text('macro_analysis'),  // 新增
```

注意：需要在文件顶部的 import 中加上 `text`：

```ts
import { mysqlTable, varchar, int, json, timestamp, index, text } from 'drizzle-orm/mysql-core';
```

- [ ] **Step 2: 在服务层 `CreateProfileInput` 中加 `macroAnalysis`**

打开 `apps/server/src/services/insight.service.ts`，在 `CreateProfileInput` interface 中加：

```ts
export interface CreateProfileInput {
  // ... 现有字段 ...
  customAspects?: string[];
  macroAnalysis?: string | null;  // 新增
  sortOrder?: number;
}
```

`updateProfile` 方法的 `set({ ...input, updatedAt: new Date() })` 已动态铺开 input，无需其他改动。

- [ ] **Step 3: 构建服务端代码**

```bash
cd apps/server && pnpm build
```

预期：Build 成功，无 TypeScript 错误。

- [ ] **Step 4: 生成 migration**

```bash
pnpm --filter @x-console/server migrate:generate
```

预期：在 `apps/server/drizzle/` 目录下生成新 migration 文件，内容类似：
```sql
ALTER TABLE `insight_profiles` ADD `macro_analysis` text;
```

- [ ] **Step 5: 执行 migration（确保 DB 已启动）**

```bash
pnpm --filter @x-console/server migrate
```

预期：Migration 成功，无报错。

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/db/schema/insight-profiles.ts apps/server/src/services/insight.service.ts apps/server/drizzle/
git commit -m "feat(insight): add macroAnalysis field to insight_profiles schema"
```

---

### Task 2: 前端 DTO 类型更新

**Files:**
- Modify: `apps/web/src/api/insight.ts`

**Interfaces:**
- Consumes: DB 字段 `macro_analysis`（服务端已返回，因为 select 是 `select()` 全字段）
- Produces: `InsightProfileDto.macroAnalysis?: string | null` 可用于 PromptGenerator 和 buildPrompt

- [ ] **Step 1: 在 `InsightProfileDto` 中加 `macroAnalysis`**

打开 `apps/web/src/api/insight.ts`，在 `customAspects` 行之后加：

```ts
export interface InsightProfileDto {
  // ... 现有字段 ...
  customAspects: string[] | null;
  macroAnalysis?: string | null;  // 新增
  sortOrder: number;
  dayunList: DayunDto[];
  createdAt: string;
  updatedAt: string;
}
```

`CreateProfileInput` 通过 `Omit<InsightProfileDto, ...>` 派生，会自动包含 `macroAnalysis`，无需单独修改。

- [ ] **Step 2: 确认 TypeScript 编译无误**

```bash
cd apps/web && npx tsc --noEmit
```

预期：无 TypeScript 错误。

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/insight.ts
git commit -m "feat(insight): add macroAnalysis to InsightProfileDto"
```

---

### Task 3: Prompt Builder 逻辑更新

**Files:**
- Modify: `apps/web/src/pages/insight/utils/prompt-builder.ts`

**Interfaces:**
- Consumes: `macroAnalysis?: string` 可选参数
- Produces: `buildPrompt(profile, period, aspects, macroAnalysis?)` 有 macroAnalysis 时第一部分替换为已有分析文本

- [ ] **Step 1: 更新 `buildPrompt` 函数签名和逻辑**

打开 `apps/web/src/pages/insight/utils/prompt-builder.ts`，修改 `buildPrompt` 函数签名（第四个参数）：

```ts
export function buildPrompt(
  profile: InsightProfileDto,
  period: TimePeriod,
  aspects: string[],
  macroAnalysis?: string   // 新增
): string {
```

在函数体内，紧接现有 `let part3Label: string;` 赋值逻辑（即进入 `if/else if/else` 块之后、`return` 语句之前），加入：

```ts
const part1 = macroAnalysis
  ? `## 第一部分：原局宏观拆解（已有分析，无需重复）\n${macroAnalysis}`
  : `## 第一部分：原局宏观拆解（四大流派独立分析）
请勿强行统一结论，如实呈现各派分歧：
1. 子平法：判定正格或变格，分析格局的清浊成败，取用神与喜忌。
2. 旺衰派：分析日主的客观旺衰（得令、得地、得势情况），判断是扶弱还是抑强，明确喜、用、忌、仇五行。
3. 调候派：结合月令气候特点，判断命局寒暖燥湿，提取调候用神。
4. 盲派（重点防混淆）：严格摒弃旺衰逻辑。明确划分"宾主"与"体用"；分析主要做功神与废神；阐述各字之间的做功方式与效率（谁在做功？用什么方式制/化？效率高低？）。`;
```

然后在 return 模板字符串中把原来硬编码的第一部分内容替换为 `${part1}`，保持第二部分、第三部分不变。

完整的 return 语句结构如下（`…` 表示保持不变的内容）：

```ts
  return `# 角色设定
你是一位精通中国传统命理学的八字大师，深谙子平法、旺衰派、调候派及盲派命理，能够客观、严谨地拆解八字，并提供切实可行的建议。请严格按照要求，各流派分别论述，切勿将不同流派的理论混杂（例如不要在盲派分析中谈论日主旺衰），各流派有分歧之处如实呈现，不强行统一。

# 命主信息
【八字原局】
${buildBaziSection(profile)}
${birthInfo ? birthInfo + '\n' : ''}【${dayunLine}】

# 时间背景 - ${periodLabel}
${timeBackground}

# 分析框架与执行路径

${part1}

## 第二部分：五行刑冲合害与气势流通（动态分析）
- 剖析原局地支之间的刑冲合害关系。
- 重点分析：${part2TimeDesc} 的介入，对原局产生了哪些具体的"引动"（如刑冲合害破、暗合、墓库开启等）？
- 生克制化：五行生克是否有情，制化是否得力。
- 命局整体气势是否流通顺畅，${periodLabel}有无郁结滞塞之处。

## 第三部分：${part3Label}专属运势与行动建议
请结合上述所有分析，聚焦【${aspectLine}】维度，输出针对"${part3Label}"的具体指导：
1. 运势吉凶断言：基于流年流月${isShortPeriod ? '流日' : ''}对原局的引动，${part3Label}在以上方面最可能发生什么具体表象？各派结论如有出入，请分别列出。
2. 实操建议：给出具体、可执行的行动建议。各派结论如有出入，分别列出供参考，不必回避分歧。`;
```

- [ ] **Step 2: 确认 TypeScript 编译无误**

```bash
cd apps/web && npx tsc --noEmit
```

预期：无错误。

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/insight/utils/prompt-builder.ts
git commit -m "feat(insight): buildPrompt accepts macroAnalysis to replace part 1 instructions"
```

---

### Task 4: PromptGenerator UI — Badge + 保存入口

**Files:**
- Modify: `apps/web/src/pages/insight/components/prompt-generator/prompt-generator.tsx`

**Interfaces:**
- Consumes: `profile.macroAnalysis?: string | null`（Task 2 产出）、`buildPrompt(..., macroAnalysis?)` 签名（Task 3 产出）、`service.updateProfile(id, { macroAnalysis })`

**Produces:** 完整 UI 功能

- [ ] **Step 1: 加状态变量**

在 `PromptGenerator` 组件顶部，现有 state 之后加：

```ts
const [showSaveAnalysis, setShowSaveAnalysis] = useState(false);
const [analysisText, setAnalysisText] = useState('');
const [savingAnalysis, setSavingAnalysis] = useState(false);
const [saveAnalysisError, setSaveAnalysisError] = useState<string | null>(null);
```

- [ ] **Step 2: 在命主信息区加 badge**

找到显示命主姓名的这行：

```tsx
<h2 className="text-base font-semibold text-gray-800 dark:text-zinc-200">{profile.name}</h2>
```

改为：

```tsx
<div className="flex items-center gap-2">
  <h2 className="text-base font-semibold text-gray-800 dark:text-zinc-200">{profile.name}</h2>
  {profile.macroAnalysis && (
    <span
      title="已保存原局宏观拆解，生成 Prompt 时将自动使用"
      className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded"
    >
      ✓ 已有原局分析
    </span>
  )}
</div>
```

- [ ] **Step 3: 修改 `handleGenerate` 传入 `macroAnalysis`**

找到：

```ts
const handleGenerate = () => {
  if (!profile) return;
  setPrompt(buildPrompt(profile, period, selectedAspects));
};
```

改为：

```ts
const handleGenerate = () => {
  if (!profile) return;
  setPrompt(buildPrompt(profile, period, selectedAspects, profile.macroAnalysis ?? undefined));
};
```

- [ ] **Step 4: 在"生成 Prompt"按钮下方加"保存原局分析"区域**

找到"生成 Prompt"按钮的 `<button>` 元素，在它之后（`{prompt && (` 之前）插入：

```tsx
<div className="space-y-2">
  <button
    type="button"
    onClick={() => {
      setAnalysisText(profile.macroAnalysis ?? '');
      setSaveAnalysisError(null);
      setShowSaveAnalysis((v) => !v);
    }}
    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm text-gray-600 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
  >
    {showSaveAnalysis ? '收起' : '保存原局分析'}
  </button>

  {showSaveAnalysis && (
    <div className="space-y-2">
      <textarea
        className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xs text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-green-500 font-mono leading-relaxed resize-none"
        rows={10}
        placeholder="粘贴 AI 返回的第一部分分析内容（原局宏观拆解）..."
        value={analysisText}
        onChange={(e) => setAnalysisText(e.target.value)}
      />
      {saveAnalysisError && (
        <p className="text-xs text-red-500">{saveAnalysisError}</p>
      )}
      <button
        type="button"
        disabled={savingAnalysis}
        onClick={async () => {
          setSavingAnalysis(true);
          setSaveAnalysisError(null);
          const ok = await service.updateProfile(profile.id, {
            macroAnalysis: analysisText.trim() || null,
          });
          setSavingAnalysis(false);
          if (ok) {
            setShowSaveAnalysis(false);
          } else {
            setSaveAnalysisError('保存失败，请重试');
          }
        }}
        className="w-full py-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white text-sm font-medium hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {savingAnalysis ? '保存中…' : '保存'}
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 5: 确认 TypeScript 编译无误**

```bash
cd apps/web && npx tsc --noEmit
```

预期：无错误。

- [ ] **Step 6: 启动开发服务并手动验证**

```bash
pnpm dev:web
```

验证以下流程：
1. 选中一个命主档案，名称旁无 badge（无已保存分析）
2. 点击"保存原局分析"，展开 textarea
3. 输入测试文本，点"保存"，按钮显示"保存中…"，成功后 textarea 收起
4. 名称旁出现"✓ 已有原局分析" badge
5. 点击"生成 Prompt"，生成内容的第一部分显示"已有分析，无需重复"加上保存的文本
6. 再次点"保存原局分析"，textarea 预填已有内容（可更新）
7. 清空文本保存，badge 消失，Prompt 恢复原始四大流派分析指令

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/insight/components/prompt-generator/prompt-generator.tsx
git commit -m "feat(insight): add macro analysis save UI with badge and textarea"
```
