# Server Architecture

Express.js + TypeScript + Drizzle ORM (MySQL) + Socket.io + LangChain.

## Request Flow

```
HTTP Request → authHandler middleware → routing-controllers → Controller → Service → Drizzle ORM
```

- **Controllers** (`controllers/v1/`): `@JsonController('/api/v1/...')` + `@Service()`. Receive `@Body()` DTOs, `@CurrentUser()`, delegate to injected services.
- **Services** (`services/`): TypeDI singletons, access DB via `getDatabase()` singleton, cross-service via constructor injection.
- **Actions** (`actions/`): Plugin system for task scheduler, implement `ActionHandler`, self-register into `ActionRegistry`.

## Auto-Registration (IOC)

`initIOC()` dynamically imports all files in `actions/`, `cron/`, `modules/`, `sources/`, `controllers/`, `services/`. Adding a new service/controller file is sufficient — no manual registration needed.

## Startup Sequence (app.ts)

1. Load env vars → 2. `initIOC()` (auto-register services/controllers) → 3. `useContainer(Container)` (bridge TypeDI to routing-controllers) → 4. `initializeDatabase()` + `runMigrations()` → 5. Express middleware stack → 6. `useExpressServer()` (register controllers, `defaultErrorHandler: false`) → 7. Custom error handler → 8. `initCollab(server)` (Hocuspocus on `/collaboration`) → 9. `SocketIOService.initialize(server)` (on `/socket.io`)

## Config

All configuration flows from `.env` through `config/env.ts` (dotenv loader) into `config/config.ts` (typed singleton). Services import `config` directly. `drizzle.config.ts` reads env vars directly (not from config.ts to avoid circular imports).

## Response Envelope

`ResponseUtil.success(data)` / `ResponseUtil.error(ErrorCode.XXX)` → `{ code, msg, data }`. Error codes: 0=success, 1-99=system, 1000-1999=user, 2000-2999=db, 3000-3999=business, 4000-4999=attachment.

## Auth

Three auth channels:

- **Cookie JWT (web UI)**: `aimo_token` httpOnly cookie, verified by `authHandler`, `@CurrentUser()` reads `req.user`
- **BA Token (API)**: `/api/v1/ba/*` routes use `baAuthInterceptor`, validates user API tokens or global `BA_AUTH_TOKEN`
- **WebSocket**: Socket.IO and Hocuspocus verify JWT from cookie or query param

### Cookie JWT Flow

- Login/register signs JWT `{ id: user.id }` with `config.jwt.secret`, expiry 90 days
- Token set as `aimo_token` cookie (httpOnly, sameSite=lax, secure in production)
- `authHandler` middleware reads cookie or `Authorization: Bearer` header, verifies JWT, loads user from DB via `UserService`, sets `req.user`
- Paths under `/api/v1/auth/login`, `/register`, `/config` excluded from auth
- `currentUserChecker` in routing-controllers reads `req.user` so `@CurrentUser()` works

### BA Token Flow

- `/api/v1/ba/*` routes use `baAuthInterceptor`
- First tries token as user API token (validated by `ApiTokenService` against `user_api_tokens` table)
- Falls back to global `BA_AUTH_TOKEN` env var
- Requires `BA_AUTH_ENABLED=true`

### WebSocket Auth

- Socket.IO: reads JWT from `socket.handshake.auth.token`, `query.token`, or `aimo_token` cookie
- Hocuspocus: reads JWT from `aimo_token` cookie or `token` query param
- Both verify with `config.jwt.secret`, attach user info

## Socket.IO Service

- TypeDI singleton on same HTTP server, path `/socket.io`, supports `websocket` + `polling`
- Each authenticated socket joins `user:{userId}` room for multi-tab delivery
- `sendToUser()` emits typed `PushPayload` events (`PushEventType`: `notification`, `notification:update`)
- Redis adapter: if `REDIS_ENABLED=true`, creates dedicated pub/sub clients for horizontal scaling

## Action Plugin System

Actions implement `ActionHandler` interface (`id`, `name`, `execute()`, `paramSchema`). They register themselves in `ActionRegistry` at import time via `register.ts`. The task scheduler (`SchedulerService`) looks up actions by ID at execution time, decoupling scheduler from implementations.

## Database Conventions

- One file per table in `db/schema/`, re-exported from `schema/index.ts`
- `varchar(191)` for keys, `timestamp(fsp: 3)` for millisecond precision, `.$type<T>()` for JSON columns
- Migrations run automatically on startup
- Use `withTransaction()` from `transaction.ts` for transactional ops
- **See `src/db/CLAUDE.md` for detailed schema and migration patterns**

## Logging

服务端所有日志必须通过 `@x-console/logger` 输出，禁止 `console.log`/`console.error` 等原生方法。

- 实例: `src/utils/logger.ts`，导出 `logger` 及 `trace/debug/info/warn/error` 便捷方法
- 环境变量: `AIMO_LOG_DIR`（日志目录，默认 `./logs`）、`AIMO_LOG_LEVEL`（级别，默认 `info`）
- 结构化日志: 第二参数传对象；错误日志必须带上下文；敏感信息脱敏

## ID Generation

所有 ID 生成统一在 `src/utils/id.ts`，禁止在他处单独实现。

- `generateUid()` — 用户 ID（nanoid，`u` 前缀）
- 新增业务对象 ID 在此文件扩展；不要复用或重新实现 ID 生成逻辑

## Error Handling

Controllers catch exceptions and return `ResponseUtil.error(...)`. Uncaught errors bubble to Express `errorHandler` which checks for `HttpError` (routing-controllers) or returns 500. `defaultErrorHandler: false` in routing-controllers is essential — without it, routing-controllers swallows errors before reaching custom handler.

## Graceful Shutdown

SIGTERM/SIGINT handlers close HTTP server, stop scheduler, close MySQL pool, then exit.
