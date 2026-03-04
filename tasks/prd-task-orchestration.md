# PRD: 任务编排系统 (Task Orchestration)

## Introduction

实现一个任务编排能力，允许用户创建自定义工作流。用户可以设置触发器（手动触发、定时触发），从服务端预注册的功能列表中选择要执行的操作，并查看任务执行历史记录（成功状态、失败原因等）。

这个功能让用户能够将重复性的操作自动化，提高工作效率。

## Goals

- 用户可以创建、编辑、删除任务编排
- 支持两种触发方式：手动触发和定时触发（CRON 表达式）
- 用户可以从预注册的动作列表中选择执行的操作
- 系统记录每次任务执行的详细日志（执行时间、状态、结果/失败原因）
- 用户可以查看任务执行历史
- 用户可以手动触发任意已保存的任务

## User Stories

### US-001: 创建任务编排
**Description:** 作为用户，我想创建一个任务编排，定义触发条件和执行动作。

**Acceptance Criteria:**
- [ ] 提供创建任务编排的 UI 界面（页面或弹窗）
- [ ] 用户可以设置任务名称（必填）
- [ ] 用户可以选择触发类型：手动或定时
- [ ] 如果选择定时触发，需要提供 CRON 表达式输入框（带常用模板下拉）
- [ ] 用户可以从预注册动作列表中选择一个或多个动作
- [ ] 保存任务编排到数据库
- [ ] 后端 API 创建任务接口完成
- [ ] 前端创建任务表单完成
- [ ] Typecheck 和 lint 通过

### US-002: 查看任务列表
**Description:** 作为用户，我想查看我创建的所有任务编排。

**Acceptance Criteria:**
- [ ] 显示任务列表页面
- [ ] 每行显示：任务名称、触发类型、下次执行时间、状态（启用/禁用）
- [ ] 支持启用/禁用任务切换
- [ ] 支持删除任务（带确认对话框）
- [ ] 支持编辑任务
- [ ] 后端 API 列表/详情/删除接口完成
- [ ] 前端任务列表页面完成
- [ ] Typecheck 和 lint 通过

### US-003: 手动触发任务
**Description:** 作为用户，我想手动执行一个任务。

**Acceptance Criteria:**
- [ ] 任务列表每行有"执行"按钮
- [ ] 点击执行按钮立即触发任务
- [ ] 执行完成后显示成功/失败结果
- [ ] 后端手动触发 API 完成
- [ ] 前端触发功能完成
- [ ] Typecheck 和 lint 通过
- [ ] Verify in browser using dev-browser skill

### US-004: 定时任务调度
**Description:** 作为系统，我需要根据 CRON 表达式自动触发已启用的任务。

**Acceptance Criteria:**
- [ ] 后端实现定时任务调度器（基于 node-cron 或类似库）
- [ ] 只调度状态为"启用"的任务
- [ ] 任务执行后记录执行日志
- [ ] 调度器在服务启动时自动启动
- [ ] 调度器在服务关闭时优雅停止
- [ ] Typecheck 和 lint 通过

### US-005:机制
**Description:** 执行动作注册 作为开发者，我想注册新的动作供用户选择。

**Acceptance Criteria:**
- [ ] 定义动作注册接口（ActionHandler）
- [ ] 提供内置动作示例（如：发送 HTTP 请求、创建 Memo）
- [ ] 动作可接收配置参数
- [ ] 动作执行结果统一格式（成功/失败及详情）
- [ ] Typecheck 和 lint 通过

### US-006: 执行日志记录
**Description:** 作为用户，我想查看任务的执行历史。

**Acceptance Criteria:**
- [ ] 每次任务执行生成一条日志记录
- [ ] 日志包含：执行时间、任务 ID、状态（success/failed）、失败原因（如果有）
- [ ] 用户可以在任务详情页查看执行历史
- [ ] 后端执行日志存储和查询 API 完成
- [ ] 前端执行历史展示完成
- [ ] Typecheck 和 lint 通过

## Functional Requirements

### FR-1: 任务 CRUD
- FR-1.1: 创建任务：名称、触发类型、CRON 表达式、动作列表
- FR-1.2: 编辑任务：修改上述字段
- FR-1.3: 删除任务：物理删除，连带删除相关执行日志
- FR-1.4: 启用/禁用任务：禁用后定时调度器不执行

### FR-2: 触发器
- FR-2.1: 手动触发：用户点击执行按钮立即触发
- FR-2.2: 定时触发：基于 CRON 表达式，支持秒/分/时/日/月/周
- FR-2.3: 提供常用 CRON 模板（每小时、每天、每周）
- FR-2.4: 验证 CRON 表达式格式有效性

### FR-3: 动作系统
- FR-3.1: 动作在服务端注册，动态加载
- FR-3.2: 每个动作有：唯一标识、名称、描述、参数 schema
- FR-3.3: 动作执行是原子的，成功或失败
- FR-3.4: 动作执行超时控制（默认 30 秒）
- FR-3.5: 至少实现一个示例动作（如 HTTP 请求动作）

### FR-4: 执行日志
- FR-4.1: 记录任务执行的开始时间、结束时间、状态
- FR-4.2: 失败时记录错误信息（错误类型、错误消息）
- FR-4.3: 成功时记录执行结果摘要
- FR-4.4: 执行日志保留策略（可配置，默认 30 天）

### FR-5: 调度器
- FR-5.1: 调度器每分钟检查一次是否有任务需要执行
- FR-5.2: 支持并发执行（同一任务不会重叠执行）
- FR-5.3: 调度器日志记录

## Non-Goals

- 不支持任务之间的依赖关系（如任务 A 完成后触发任务 B）
- 不支持条件分支（if/else）
- 不支持循环执行
- 不支持任务执行结果作为下一个任务的输入参数
- 不支持外部 Webhook 触发
- 不支持团队/组织级别的任务管理

## Technical Considerations

### 数据模型

```typescript
// Task 任务
{
  id: string;
  name: string;
  triggerType: 'manual' | 'scheduled';
  cronExpression: string | null;  // scheduled 时必填
  enabled: boolean;
  actionId: string;              // 动作标识
  actionConfig: Record<string, any>;  // 动作配置参数
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ExecutionLog 执行日志
{
  id: string;
  taskId: string;
  status: 'success' | 'failed';
  startedAt: Date;
  finishedAt: Date;
  errorMessage: string | null;
  errorType: string | null;
  result: Record<string, any> | null;
}
```

### 动作注册机制

```typescript
interface ActionHandler {
  id: string;
  name: string;
  description: string;
  paramSchema: JSONSchema;
  execute(config: Record<string, any>): Promise<ActionResult>;
}

interface ActionResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}
```

### 调度器实现
- 使用 node-cron 或 node-schedule 库
- 每个任务作为独立的 cron job 注册
- 任务执行使用 try-catch 包装，捕获所有异常

### 已有代码复用
- 使用现有的 DTO 定义
- 复用现有的数据库连接（如果有 MySQL）或使用新表
- 使用现有的错误码常量

## Success Metrics

- 用户可以在 1 分钟内创建一个新的任务编排
- 手动触发任务后 5 秒内显示执行结果
- 执行日志查询响应时间 < 500ms

## Open Questions

- 需要支持哪些预注册动作？（HTTP 请求、创建 Memo、发送通知等）
- 执行日志是否需要分页展示？
- 是否需要支持动作参数加密存储？
- 是否需要支持任务执行结果通知用户？
