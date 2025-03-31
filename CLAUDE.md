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

## Coding Principles

- **包管理**: pnpm workspace 仓库，安装 npm 包统一使用 `pnpm`（`pnpm add` / `pnpm -w`），禁止 npm/yarn
- **设计原则**: 遵循 SOLID；如无必要勿增实体，避免过度设计

## Commit Convention

Conventional Commits enforced via commitlint. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Subject max 100 chars, header max 500 chars.

- 禁止使用 `--no-verify` 绕过 commitlint 校验。

## Environment Variables

Copy `apps/server/.env.example` to `.env`. Docker dev infrastructure (`pnpm dev:env`) provides MySQL and MinIO. Key vars: `PORT` (3100), `MYSQL_*`, `JWT_SECRET` (32+ chars), `CORS_ORIGIN`, `OPENAI_API_KEY/BASE_URL/MODEL`. Web: `VITE_SOCKET_IO_URL` (optional).

## Local Rules Navigation

更细粒度的规则按需加载，不要在本文件重复：

- `apps/web/CLAUDE.md` — 前端架构：@rabjs/react 状态管理、Auth、路由、协同编辑、组件组织规范、图标规范
- `apps/server/CLAUDE.md` — 后端架构：请求流、IOC、响应封装、Auth、日志、ID 生成
- `apps/server/src/db/CLAUDE.md` — Drizzle ORM schema 与迁移规范
- `.claude/rules/design-system.md` — 设计系统（编辑 web/client 源码时自动附加）
- `.claude/rules/rs-react.md` — @rabjs/react 核心用法（编辑 `*.service.ts` / `*.tsx` 时自动附加）
- `.claude/rules/page-component-service.md` — 页面级 Service 注册模式（编辑 `pages/**` 时自动附加）
- `.claude/rules/docker.md` — Docker 镜像构建注意事项（编辑 Dockerfile / workflows 时自动附加）

## CatPaw IDE 规则镜像

`.catpaw/rules/` 及各子树 `.catpaw/rules/readme.md` 是上述规则的 CatPaw IDE 镜像：正文必须与对应 `CLAUDE.md` / `.claude/rules/*.md` 逐字节一致，仅 frontmatter 不同（CatPaw 用 `ruleType` + `globs` + `paths`）。修改任何一侧规则时，必须同步更新另一侧同名文件。
