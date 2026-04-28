# Token 配额展示改进实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页 Token 展示从单一数字升级为显示所有 11 个模型的详细配额信息，并优化布局

**Architecture:** 修改 `MiniMaxTokenService` 新增辅助方法，在 `home.tsx` 中用主卡片 + 小卡片网格替换原有的 4 栏 Stats Grid

**Tech Stack:** React + @rabjs/react + Tailwind CSS v4

---

## Chunk 1: MiniMaxTokenService 新增辅助方法

**Files:**
- Modify: `apps/web/src/services/minimax-token.service.ts:73-118`

---

- [ ] **Step 1: 添加 `getOtherModelRemains()` 方法**

在 `getMainModelRemain()` 后添加新方法。在 `formatNextRefreshTime()` 前插入：

```typescript
getOtherModelRemains(): MiniMaxModelRemain[] {
  return this.modelRemains.filter((m) => m.model_name !== 'MiniMax-M*');
}
```

- [ ] **Step 2: 添加 `getProgressColor()` 方法**

在 `formatNextRefreshTime()` 前插入：

```typescript
getProgressColor(percentage: number): string {
  if (percentage > 30) return 'bg-green-500';
  if (percentage > 10) return 'bg-yellow-500';
  return 'bg-red-500';
}
```

- [ ] **Step 3: 添加 `getProgressPercentage()` 辅助方法**

在 `getProgressColor()` 后添加：

```typescript
getProgressPercentage(model: MiniMaxModelRemain): number {
  if (model.current_interval_total_count === 0) return 0;
  return Math.round(
    ((model.current_interval_total_count - model.current_interval_usage_count) /
      model.current_interval_total_count) *
      100
  );
}
```

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/services/minimax-token.service.ts
git commit -m "feat(web): add getOtherModelRemains, getProgressColor and getProgressPercentage to MiniMaxTokenService"
```

---

## Chunk 2: home.tsx 布局改造

**Files:**
- Modify: `apps/web/src/pages/home/home.tsx:123-197`（替换 Stats Grid）
- Modify: `apps/web/src/pages/home/home.tsx:96-121`（Greeting 区域增加时间）

---

- [ ] **Step 1: 在 Greeting 区域添加时间显示**

找到 `home.tsx` 第 96-121 行的 Greeting div，在 `<p className="text-gray-500...` 后添加时间：

```tsx
<p className="text-gray-500 dark:text-gray-400 text-lg">欢迎回来，开始您的工作吧</p>
<div className="mt-2 text-sm text-gray-400 dark:text-gray-500">
  {currentTime.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
</div>
```

- [ ] **Step 2: 替换 Stats Grid 为 Token Row（同时移除 Time/Task/Notification 卡片）**

找到第 123-197 行的 `<div className="grid grid-cols-2 md:grid-cols-4 gap-4">` 整块替换为：
（说明：Stats Grid 的 4 栏卡片（Time/Token/Task/Notification）全部移除，由新的 Token Row 替代）

```tsx
{/* Token 独占一行 */}
<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
  {/* 主 Token 卡片 */}
  <div className="lg:col-span-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
    {(() => {
      const mainModel = tokenService.getMainModelRemain();
      if (!mainModel) {
        return <div className="text-gray-400">加载中...</div>;
      }
      const remaining = mainModel.current_interval_total_count - mainModel.current_interval_usage_count;
      const percentage = tokenService.getProgressPercentage(mainModel);
      const color = tokenService.getProgressColor(percentage);
      return (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{mainModel.model_name}</span>
            </div>
            <button
              onClick={() => tokenService.refresh()}
              disabled={tokenService.refreshing}
              className="p-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 text-green-600 dark:text-green-400 ${tokenService.refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            {remaining.toLocaleString()}
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>剩余 {percentage}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} transition-all duration-300`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>本周: {(mainModel.current_weekly_total_count - mainModel.current_weekly_usage_count).toLocaleString()} / {mainModel.current_weekly_total_count.toLocaleString()}</span>
            <span className={mainModel.remains_time < 3600000 ? 'text-red-500' : ''}>
              剩余 {tokenService.formatRemainsTime(mainModel.remains_time)}
            </span>
          </div>
        </>
      );
    })()}
  </div>

  {/* 其他模型小卡片网格 */}
  <div className="lg:col-span-3 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 content-start">
    {tokenService.getOtherModelRemains().map((model) => {
      const remaining = model.current_interval_total_count - model.current_interval_usage_count;
      const percentage = tokenService.getProgressPercentage(model);
      const color = tokenService.getProgressColor(percentage);
      const isEmpty = remaining === 0;
      return (
        <div
          key={model.model_name}
          className={`bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg p-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ${isEmpty ? 'opacity-50' : ''}`}
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1" title={model.model_name}>
            {model.model_name}
          </div>
          <div className={`text-lg font-bold ${isEmpty ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
            {remaining.toLocaleString()}
          </div>
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
            <div
              className={`h-full ${color} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
</div>
```

- [ ] **Step 3: 验证 UI 效果**

运行 `pnpm dev:web`，确认：
1. Greeting 区域下方显示当前日期
2. 原 Stats Grid 位置变为 Token Row：左侧主卡片（MiniMax-M* 大数字+进度条+本周配额+时间剩余），右侧小卡片网格（10个模型）
3. Time/Task/Notification 统计卡片已移除

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/pages/home/home.tsx
git commit -m "feat(web): 改进首页 Token 配额展示为详细卡片网格布局"
```
