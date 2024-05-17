# PRD: 用户API Token管理与通知创建接口

## Introduction

在系统设置中增加用户API Token管理功能，允许用户生成和管理个人API访问令牌。同时在通知服务中增加创建通知的API接口，支持用户通过API调用创建通知事件。

当前系统使用单一的全局BA Token（通过环境变量配置），无法支持多用户场景。本功能将实现用户级别的Token管理，使每个用户可以拥有自己的API访问凭证。

## Goals

- 允许用户在设置页面生成个人API Token
- Token创建后仅显示一次，之后无法再次查看（安全考虑）
- 允许用户撤销（删除）已创建的Token
- 提供创建通知的API接口，复用现有NotificationService能力
- 使用Bearer Token方式进行API鉴权

## User Stories

### US-001: 创建用户Token表和迁移

**Description:** 作为开发者，我需要在数据库中存储用户的API Token，以便后续进行用户级别鉴权。

**Acceptance Criteria:**

- [ ] 在数据库中创建 `user_api_tokens` 表
- [ ] 字段包括：id, userId, name, token(哈希存储), prefix(用于显示), createdAt, expiresAt, lastUsedAt
- [ ] 生成并运行数据库迁移
- [ ] Typecheck通过

### US-002: 添加Token管理Service层

**Description:** 作为开发者，我需要实现Token的生成、存储、验证和删除逻辑。

**Acceptance Criteria:**

- [ ] 创建 ApiTokenService
- [ ] 实现 generateToken(userId, name) - 生成Token并返回明文（仅一次）
- [ ] 实现 hashToken(token) - 使用bcrypt哈希存储
- [ ] 实现 validateToken(token) - 验证Token并返回关联的userId
- [ ] 实现 deleteToken(id, userId) - 删除指定Token
- [ ] 实现 listTokens(userId) - 列出用户的Token（不包含token值）
- [ ] 实现 updateLastUsed(id) - 更新最后使用时间
- [ ] Typecheck通过

### US-001: 添加Token生成API接口

**Description:** 作为用户，我想要在设置页面生成API Token，以便通过API访问系统功能。

**Acceptance Criteria:**

- [ ] 添加 POST /api/v1/user/api-tokens 接口
- [ ] 请求体: { name: string }
- [ ] 响应: { id, name, token, prefix, createdAt }
- [ ] 返回的token仅显示一次，后续无法查看
- [ ] 需要用户登录认证
- [ ] Typecheck通过
- [ ] Verify in browser using dev-browser skill

### US-002: 添加Token列表API接口

**Description:** 作为用户，我想要查看我已创建的API Token列表（不包括Token值）。

**Acceptance Criteria:**

- [ ] 添加 GET /api/v1/user/api-tokens 接口
- [ ] 响应: { tokens: [{ id, name, prefix, createdAt, expiresAt, lastUsedAt }] }
- [ ] 不返回token的明文或哈希值
- [ ] 需要用户登录认证
- [ ] Typecheck通过
- [ ] Verify in browser using dev-browser skill

### US-003: 删除Token API接口

**Description:** 作为用户，我想要撤销（删除）不再需要的API Token。

**Acceptance Criteria:**

- [ ] 添加 DELETE /api/v1/user/api-tokens/:id 接口
- [ ] 只能删除属于当前用户的Token
- [ ] 返回删除成功状态
- [ ] 需要用户登录认证
- [ ] Typecheck通过
- [ ] Verify in browser using dev-browser skill

### US-004: 创建通知API接口

**Description:** 作为用户，我想要通过API创建通知事件。

**Acceptance Criteria:**

- [ ] 在 NotificationBAController 中添加 POST /api/v1/ba/notifications 接口
- [ ] 请求体使用现有 CreateNotificationDto
- [ ] 复用现有 NotificationService.createNotification()
- [ ] 使用Bearer Token进行用户级别鉴权（验证用户Token而非全局Token）
- [ ] 返回创建的NotificationDto
- [ ] Typecheck通过

### US-005: BA认证拦截器增强

**Description:** 作为开发者，我需要增强BA认证拦截器，支持用户Token验证。

**Acceptance Criteria:**

- [ ] 修改 baAuthInterceptor 支持两种模式：
  - 全局BA Token (config.ba.token) - 保持向后兼容
  - 用户API Token - 通过 ApiTokenService 验证
- [ ] 优先验证用户Token，失败后再验证全局Token
- [ ] 验证成功时将userId附加到request以便后续使用
- [ ] 更新最后使用时间
- [ ] Typecheck通过

### US-006: 前端设置页面Token管理UI

**Description:** 作为用户，我想要在设置页面管理我的API Token。

**Acceptance Criteria:**

- [ ] 在设置页面添加"API Token"区块
- [ ] 显示"生成新Token"按钮
- [ ] 点击生成时弹出输入框让用户输入Token名称
- [ ] 创建成功后Modal显示Token（仅此一次）
- [ ] 列表显示所有已创建的Token（名称、前缀、创建时间）
- [ ] 每个Token显示删除按钮
- [ ] Typecheck通过
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 创建 `user_api_tokens` 表，包含 id, userId, name, token, prefix, createdAt, expiresAt, lastUsedAt 字段
- FR-2: Token使用SHA-256哈希存储，不存储明文
- FR-3: Token显示时保留前6位字符作为前缀（如 `aimo_abc123...`）
- FR-4: 生成Token时返回完整明文，仅此一次展示
- FR-5: 用户只能查看和删除自己的Token
- FR-6: POST /api/v1/ba/notifications 接口支持创建通知
- FR-7: BA认证支持两种Token验证方式：全局Token和用户Token
- FR-8: 验证用户Token时自动更新 lastUsedAt 字段

## Non-Goals

- 不支持Token自动续期
- 不支持Token过期时间自定义（暂时使用永不过期）
- 不支持Token权限细分
- 不支持webhook通知渠道的具体推送逻辑（仅存储）
- 不修改现有NotificationService的业务逻辑

## Technical Considerations

- Token存储使用SHA-256哈希（与bcrypt不同，更适合API Token场景）
- 使用唯一索引防止Token重复
- 用户ID作为外键关联users表
- 前端使用Modal组件展示Token
- API Token前缀使用 `aimo_` 便于识别

## Success Metrics

- 用户可以在3步内完成Token生成
- Token验证响应时间小于100ms
- 前端页面加载时间不受影响

## Open Questions

- Token是否需要设置过期时间？（当前设计为永不过期）
- 是否需要限制每个用户的Token数量？（当前无限制）
- 是否需要支持Token权限细分？（当前为全部权限）
