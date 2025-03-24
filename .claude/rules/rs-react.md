---
description: "@rabjs/react 状态管理核心用法（精简）。编辑 *.service.ts / *.tsx 时参考；完整 API 见 km.rs-react skill。"
paths:
  - "apps/web/src/**/*.service.ts"
  - "apps/web/src/**/*.tsx"
---

# @rabjs/react 核心用法（精简）

完整 API 与进阶主题请使用 **km.rs-react** skill（`/km.rs-react`）。以下仅列高频要点。

## 三步核心模式

```ts
// 1. Service：业务逻辑容器（属性自动 observable，方法自动 action）
export class CounterService extends Service {
  count = 0;
  get double() { return this.count * 2; }        // 计算属性用 getter
  increment() { this.count++; }
  async fetch() { this.count = await fetch('/api').then(r => r.json()); }
}

// 2. 响应式组件：observer / view 包裹
const CounterContent = observer(() => {
  const s = useService(CounterService);
  return <div>{s.count}</div>;
});

// 3. bindServices 注册并导出
export default bindServices(CounterContent, [CounterService]);
```

## 全局 vs 组件作用域

| 注册方式 | 生命周期 | 适用 |
| -------- | -------- | --- |
| `register(Svc)` | 应用级单例 | 认证、主题、全局配置 |
| `bindServices(Cmp, [Svc])` | 绑定组件生命周期 | 页面/表单状态 |

- 全局 Service 用 `register`，**禁止** `bindServices`；组件级反之。
- `bindServices` 已自动注入 observer，无需再包裹。
- 跨 Service 取依赖：getter + `resolve(OtherSvc)`（仅能访问当前/父级/全局，不能访问兄弟容器）。
- 异步状态：`service.$model.method.loading` / `.error`。

## 常见坑

- 组件不更新 → 忘了 `observer`/`view`，或在 render 外访问了 observable。
- `useService` 报错 → 对应 Service 未在 `bindServices`/`register` 中注册。
- 不要解构 observable（`const { count } = service` 会破坏响应性）。

> 详细参考：km.rs-react skill；页面级 Service 注册模式见 `.claude/rules/page-component-service.md`。
