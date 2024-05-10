# PRD: 大模型设置功能

## Introduction

在设置中增加大模型配置功能，允许用户配置多个不同的大模型服务（包括 OpenAI、DeepSeek、OpenRouter 等兼容 OpenAI API 的服务），为后续 AI 对话场景提供统一的模型调用能力。用户可以配置多个模型，并在使用时选择具体使用哪个模型。

## Goals

- 用户可以在设置页面配置多个大模型
- 支持配置不同的大模型提供方（OpenAI、DeepSeek、OpenRouter 等）
- 提供统一的调用接口，调用方只需传入模型提供方和模型名称即可
- 模型配置持久化到数据库
- 支持自定义 API Base URL（用于代理服务）

## User Stories

### US-001: 创建大模型配置数据库表

**Description:** 作为开发者，我需要创建数据库表来存储用户的大模型配置，以便数据能够持久化。

**Acceptance Criteria:**

- [ ] 创建 `user_models` 表，包含字段：id、userId、name、provider、apiBaseUrl、apiKey、modelName、isDefault、createdAt、updatedAt
- [ ] provider 字段存储模型提供方标识（如 openai、deepseek、openrouter）
- [ ] apiBaseUrl 字段可选，用于配置自定义 API 地址
- [ ] isDefault 字段标识默认使用的模型
- [ ] 每个用户可以配置多个模型
- [ ] Typecheck 通过

### US-002: 后端 - 添加模型配置 CRUD 接口

**Description:** 作为开发者，我需要提供后端 API 来管理用户的大模型配置。

**Acceptance Criteria:**

- [ ] POST /api/v1/user-models - 创建模型配置
- [ ] GET /api/v1/user-models - 获取用户所有模型配置
- [ ] GET /api/v1/user-models/:id - 获取单个模型配置详情
- [ ] PUT /api/v1/user-models/:id - 更新模型配置
- [ ] DELETE /api/v1/user-models/:id - 删除模型配置
- [ ] 接口需要用户登录认证
- [ ] Typecheck 通过

### US-003: 后端 - 统一模型调用服务

**Description:** 作为开发者，我需要提供一个统一的大模型调用服务，调用方只需传入模型提供方和模型名称即可。

**Acceptance Criteria:**

- [ ] 创建 LLMService，提供统一的 chat 方法
- [ ] chat 方法接收参数：provider、model、messages
- [ ] 根据 provider 查找用户配置的模型（包含 apiKey 和 apiBaseUrl）
- [ ] 使用 OpenAI 兼容格式调用对应 API
- [ ] 返回标准的 chat completion 响应
- [ ] 处理 API 调用错误并返回友好错误信息
- [ ] Typecheck 通过

### US-004: 前端 - 设置页面添加大模型配置入口

**Description:** 作为用户，我需要在设置页面能够访问大模型配置功能。

**Acceptance Criteria:**

- [ ] 在设置页面添加"大模型设置"入口/标签页
- [ ] 显示已配置的模型列表
- [ ] 显示"添加模型"按钮
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-005: 前端 - 添加/编辑模型配置表单

**Description:** 作为用户，我需要填写模型配置信息，包括模型名称、提供方、API Key 等。

**Acceptance Criteria:**

- [ ] 表单字段：模型名称（显示用）、模型提供方（下拉选择）、API Base URL（可选）、API Key、模型名称（实际调用用）
- [ ] 提供方下拉选项：OpenAI、DeepSeek、OpenRouter、其他（兼容 OpenAI）
- [ ] API Key 字段为密码类型
- [ ] 支持设置为默认模型
- [ ] 表单验证：模型名称和 API Key 必填
- [ ] 保存成功后自动刷新列表
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-006: 前端 - 模型列表展示与操作

**Description:** 作为用户，我需要查看已配置的模型列表，并对模型进行编辑、删除、设为默认等操作。

**Acceptance Criteria:**

- [ ] 列表展示每个模型的：名称、提供方、模型名称、默认标识
- [ ] 每个模型有编辑、删除按钮
- [ ] 提供"设为默认"操作
- [ ] 默认模型有明显的标识
- [ ] 删除前有确认弹窗
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-007: 前端 - API 调用封装

**Description:** 作为前端开发者，我需要封装 API 调用方法供其他模块使用。

**Acceptation Criteria:**

- [ ] 在 api/ 目录添加 user-model.api.ts
- [ ] 提供 createModel、getModels、updateModel、deleteModel 方法
- [ ] 使用 axios 进行请求
- [ ] Typecheck 通过

## Functional Requirements

- FR-1: 创建 `user_models` 数据库表存储用户模型配置
- FR-2: 提供模型配置的 CRUD API 接口
- FR-3: 创建统一的 LLMService，支持传入 provider 和 model 调用
- FR-4: 支持自定义 API Base URL（用于 OpenRouter 等代理服务）
- FR-5: 前端设置页面添加大模型设置入口
- FR-6: 前端添加/编辑模型配置表单
- FR-7: 前端展示模型列表并支持编辑、删除、设为默认操作
- FR-8: API Key 在前端显示时需要脱敏处理

## Non-Goals

- 不支持本地部署的大模型
- 不提供模型能力测试功能
- 不自动检测 API Key 有效性
- 不支持团队/共享模型配置

## Technical Considerations

- 使用 OpenAI 兼容格式调用各类模型服务
- API Key 存储到数据库时可加密（未来考虑）
- 前端表单使用现有的 UI 组件
- 复用现有的认证机制

## Success Metrics

- 用户可以在 1 分钟内完成一个模型配置
- 模型调用延迟与直接调用官方 API 相当
- 支持至少 10 个模型配置

## Open Questions

- 是否需要限制每个用户可配置的模型数量？
- API Key 是否需要在当前版本加密存储？
