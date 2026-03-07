# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

X-Console is a monorepo containing a web application, backend server, and Electron desktop client. It uses pnpm workspaces with Turbo for build orchestration.

## Commands

### Development

```bash
pnpm dev              # Run all apps in dev mode
pnpm dev:web          # Run web frontend (React + Vite)
pnpm dev:server       # Run backend server (Express + TypeScript)
pnpm dev:client       # Run Electron desktop client
```

### Building

```bash
pnpm build            # Build all packages
pnpm build:web       # Build web app
pnpm build:server    # Build server
pnpm build:client    # Build Electron app
```

### Testing & Linting

```bash
pnpm lint             # Run ESLint on all packages
pnpm lint:fix         # Auto-fix ESLint issues
pnpm format           # Format code with Prettier
```

### Database Migrations (Server)

```bash
pnpm --filter @x-console/server migrate           # Run migrations
pnpm --filter @x-console/server migrate:generate # Generate new migration
pnpm --filter @x-console/server migrate:studio   # Open Drizzle Studio
```

## Architecture

### Apps

- **apps/web**: React 19 frontend with Vite, Tailwind CSS, uses @rabjs/react for reactive state management
- **apps/server**: Express.js backend with TypeScript, Drizzle ORM (MySQL), Socket.io, LangChain for AI features
- **apps/client**: Electron desktop client wrapping the web app
- **apps/cli**: CLI tool (not yet fully explored)

### Packages

- **packages/dto**: Shared TypeScript DTOs with class-validator for validation
- **packages/logger**: Winston-based logging library

### Server Structure (apps/server/src)

- `actions/` - Business logic actions
- `controllers/` - HTTP controllers (routing-controllers)
- `services/` - Service layer (Dependency injection via typedi)
- `db/` - Database schema and migrations (Drizzle ORM)
- `middlewares/` - Express middlewares
- `config/` - Configuration files

### Web Structure (apps/web/src)

- `pages/` - Route pages
- `components/` - React components
- `services/` - API services
- `api/` - API client utilities

## Key Technologies

- **State Management**: @rabjs/react (reactive state management library)
- **Database**: MySQL with Drizzle ORM
- **AI**: LangChain + LangGraph integration
- **Real-time**: Socket.io with Redis adapter
- **API Validation**: Zod on server, class-validator in DTOs

## Environment Variables

Copy `.env.example` to `.env` for each app before development. The server requires MySQL, Redis, and S3-compatible storage configuration.

## Docker Development

```bash
docker compose -f docker-compose.dev.yml up -d  # Start dev infrastructure
```
