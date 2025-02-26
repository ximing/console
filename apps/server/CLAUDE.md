# Server Architecture Details

## Startup Sequence (app.ts)

1. Load env vars → 2. `initIOC()` (auto-register services/controllers) → 3. `useContainer(Container)` (bridge TypeDI to routing-controllers) → 4. `initializeDatabase()` + `runMigrations()` → 5. Express middleware stack → 6. `useExpressServer()` (register controllers, `defaultErrorHandler: false`) → 7. Custom error handler → 8. `initCollab(server)` (Hocuspocus on `/collaboration`) → 9. `SocketIOService.initialize(server)` (on `/socket.io`)

## Config

All configuration flows from `.env` through `config/env.ts` (dotenv loader) into `config/config.ts` (typed singleton). Services import `config` directly. `drizzle.config.ts` reads env vars directly (not from config.ts to avoid circular imports).

## Auth Details

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

## Error Handling

Controllers catch exceptions and return `ResponseUtil.error(...)`. Uncaught errors bubble to Express `errorHandler` which checks for `HttpError` (routing-controllers) or returns 500. `defaultErrorHandler: false` in routing-controllers is essential — without it, routing-controllers swallows errors before reaching custom handler.

## Graceful Shutdown

SIGTERM/SIGINT handlers close HTTP server, stop scheduler, close MySQL pool, then exit.
