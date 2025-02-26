# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

X-Console is a monorepo containing a web application, backend server, and Electron desktop client. It uses pnpm workspaces with Turbo for build orchestration.

## Commands

```bash
pnpm dev              # Run all apps in dev mode
pnpm dev:web          # Run web frontend (React + Vite)
pnpm dev:server       # Run backend server (Express + TypeScript)
pnpm dev:client       # Run Electron desktop client
pnpm dev:env          # Start Docker infrastructure (MySQL, MinIO)

pnpm build            # Build all packages
pnpm lint             # Run ESLint on all packages (via Turbo)
pnpm lint:fix         # Auto-fix ESLint issues
pnpm format           # Format code with Prettier
pnpm --filter @x-console/server test   # Run server tests (Jest)

pnpm --filter @x-console/server migrate           # Run migrations
pnpm --filter @x-console/server migrate:generate  # Generate new migration
pnpm --filter @x-console/server migrate:studio    # Open Drizzle Studio
```

## Architecture

- **apps/web**: React 19 + Vite + Tailwind CSS v4 + React Router + @rabjs/react + Tiptap v3
- **apps/server**: Express.js + TypeScript + Drizzle ORM (MySQL) + Socket.io + LangChain
- **apps/client**: Electron desktop client wrapping the web app
- **apps/cli**: CLI tool for operations and notifications
- **packages/dto**: Type-only shared package (`.d.ts` only), DTOs with class-validator
- **packages/logger**: Winston-based logging with daily file rotation
- **config/**: Shared eslint-config, typescript-config, jest-presets, rollup-config

## Server Architecture (apps/server/src)

### Request Flow

```
HTTP Request → authHandler middleware → routing-controllers → Controller → Service → Drizzle ORM
```

- **Controllers** (`controllers/v1/`): `@JsonController('/api/v1/...')` + `@Service()`. Receive `@Body()` DTOs, `@CurrentUser()`, delegate to injected services.
- **Services** (`services/`): TypeDI singletons, access DB via `getDatabase()` singleton, cross-service via constructor injection.
- **Actions** (`actions/`): Plugin system for task scheduler, implement `ActionHandler`, self-register into `ActionRegistry`.

### Auto-Registration (IOC)

`initIOC()` dynamically imports all files in `actions/`, `cron/`, `modules/`, `sources/`, `controllers/`, `services/`. Adding a new service/controller file is sufficient — no manual registration needed.

### Response Envelope

`ResponseUtil.success(data)` / `ResponseUtil.error(ErrorCode.XXX)` → `{ code, msg, data }`. Error codes: 0=success, 1-99=system, 1000-1999=user, 2000-2999=db, 3000-3999=business, 4000-4999=attachment.

### Auth

- **Cookie JWT (web UI)**: `aimo_token` httpOnly cookie, verified by `authHandler`, `@CurrentUser()` reads `req.user`
- **BA Token (API)**: `/api/v1/ba/*` routes use `baAuthInterceptor`, validates user API tokens or global `BA_AUTH_TOKEN`
- **WebSocket**: Socket.IO and Hocuspocus verify JWT from cookie or query param

### Database Conventions

- One file per table in `db/schema/`, re-exported from `schema/index.ts`
- `varchar(191)` for keys, `timestamp(fsp: 3)` for millisecond precision, `.$type<T>()` for JSON columns
- Migrations run automatically on startup
- Use `withTransaction()` from `transaction.ts` for transactional ops
- **See `apps/server/src/db/CLAUDE.md` for detailed schema and migration patterns**

## Web Architecture (apps/web/src)

### State Management (@rabjs/react)

Services extend `Service`, declare state as class properties. Mutations trigger re-renders in observing components.
- **Register**: all services `register()`-ed in `main.tsx`
- **Consume**: `useService(AuthService)` hook or `view(() => ...)` / `observer(() => ...)` HOCs
- **Cross-service**: `resolve(OtherService)` for singleton access

### Auth

Dual token: **cookie** (httpOnly, for REST APIs via `withCredentials: true`) + **Bearer token** (localStorage `aimo_token`, for Socket.IO and Hocuspocus WebSocket auth). `<AuthInitializer>` calls `authService.checkAuth()` on load. 401s clear localStorage and redirect to `/auth`.

### Routing

`HashRouter` for Electron, `BrowserRouter` for web. Content routes wrapped in `<ProtectedRoute>`. `utils/navigation.ts` stores `navigate` in a closure for imperative redirects from non-component code.

### Collaboration (Hocuspocus/Yjs)

`useCollaboration.ts` creates Y.Doc per blog page, connects HocuspocusProvider, uses IndexedDB for offline cache. Collaboration mode disables HTTP auto-save — server persists via WebSocket.

## Component Organization Convention

Components in `pages/*/components/` follow a consistent directory structure:

```
components/
├── feature-name/                 # Feature module (all related code together)
│   ├── index.ts                 # Barrel export for all public APIs
│   ├── feature-name.ts          # Main component
│   ├── feature-name.service.ts  # Service class (if using @rabjs/react)
│   ├── feature-name-header.tsx  # Sub-components
│   ├── hooks/                   # Custom hooks
```

1. All components related to a feature go into a subdirectory named after the feature
2. Use `index.ts` barrel exports for clean public APIs
3. Keep hooks in a `hooks/` subdirectory within the feature folder
4. Sub-components that are only used by the parent feature stay in the same directory
5. When moving files, always update relative import paths (count `../` carefully)
6. Shared utilities go under the feature that owns them, not at the component root

## Commit Convention

Conventional Commits enforced via commitlint. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Subject max 100 chars, header max 500 chars.

## Environment Variables

Copy `apps/server/.env.example` to `.env`. Docker dev infrastructure (`pnpm dev:env`) provides MySQL and MinIO. Key vars: `PORT` (3100), `MYSQL_*`, `JWT_SECRET` (32+ chars), `CORS_ORIGIN`, `OPENAI_API_KEY/BASE_URL/MODEL`. Web: `VITE_SOCKET_IO_URL` (optional).

## Design System

- **无边框约束** — 用背景色差和阴影代替边框分隔
- **绿色主色** — 交互状态用绿色 (#22c55e 亮 / #4ade80 暗)
- **克制点缀** — 点缀色仅在关键位置使用
- **悬浮呼吸感** — 透明背景、模糊效果、hover 上浮

### Quick Reference

| Element | Light | Dark |
|---------|-------|------|
| 选中态文字 | `text-green-600` | `text-green-400` |
| Hover 背景 | `bg-green-50/60` | `bg-green-900/15` |
| 主按钮 | `bg-gradient-to-br from-green-500 to-green-600` | same |
| Header 背景 | `bg-white/90 backdrop-blur-xl` | `bg-zinc-900/90 backdrop-blur-xl` |
| Sidebar 阴影 | `4px 0 24px rgba(0,0,0,0.06)` | `4px 0 24px rgba(0,0,0,0.4)` |
| 过渡动画 | `transition-all duration-150` | same |
| Hover 上浮 | `hover:-translate-y-0.5` | same |
