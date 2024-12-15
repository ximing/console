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
pnpm dev:env          # Start Docker infrastructure (MySQL, MinIO)
```

### Building

```bash
pnpm build            # Build all packages
pnpm build:web        # Build web app
pnpm build:server     # Build server
pnpm build:client     # Build Electron app
```

### Testing & Linting

```bash
pnpm lint             # Run ESLint on all packages
pnpm lint:fix         # Auto-fix ESLint issues
pnpm format           # Format code with Prettier
pnpm typecheck        # Run TypeScript type checking
```

### Database Migrations (Server)

```bash
pnpm --filter @x-console/server migrate           # Run migrations
pnpm --filter @x-console/server migrate:generate  # Generate new migration
pnpm --filter @x-console/server migrate:studio    # Open Drizzle Studio
```

## Architecture

### Apps

- **apps/web**: React 19 frontend with Vite, Tailwind CSS, React Router, @rabjs/react for reactive state management
- **apps/server**: Express.js backend with TypeScript, Drizzle ORM (MySQL), Socket.io, LangChain for AI features
- **apps/client**: Electron desktop client wrapping the web app
- **apps/cli**: CLI tool for various console operations

### Packages

- **packages/dto**: Shared TypeScript DTOs with class-validator for validation
- **packages/logger**: Winston-based logging library

### Server Structure (apps/server/src)

- `actions/` - Business logic actions (called by controllers, handle core operations)
- `controllers/` - HTTP controllers using routing-controllers
- `services/` - Service layer with Dependency injection via typedi
- `db/` - Database schema and migrations (Drizzle ORM)
- `middlewares/` - Express middlewares
- `config/` - Configuration files
- `api/` - API client utilities (GitHub API, etc.)

### Web Structure (apps/web/src)

- `pages/` - Route pages
- `components/` - React components
- `services/` - API services
- `api/` - API client utilities (Axios-based)

### Component Organization Convention

Components in `pages/*/components/` follow a consistent directory structure:

```
components/
├── feature-name/                 # Feature module (all related code together)
│   ├── index.ts                 # Barrel export for all public APIs
│   ├── feature-name.ts          # Main component
│   ├── feature-name.service.ts  # Service class (if using @rabjs/react)
│   ├── feature-name-header.tsx  # Sub-components (header, footer, etc.)
│   ├── feature-name-content.tsx
│   ├── helper-component.tsx      # Helper components used only by this feature
│   └── hooks/                   # Custom hooks
│       └── useHook.ts
```

**Rules:**
1. All components related to a feature go into a subdirectory named after the feature
2. Use `index.ts` barrel exports for clean public APIs
3. Keep hooks in a `hooks/` subdirectory within the feature folder
4. Sub-components that are only used by the parent feature stay in the same directory
5. When moving files, always update relative import paths (count `../` carefully from new location)
6. Shared utilities (like `editor/`) go under the feature that owns them, not at the component root

## Key Technologies

- **State Management**: @rabjs/react (reactive state management with observer pattern)
- **Database**: MySQL with Drizzle ORM
- **AI**: LangChain + LangGraph integration
- **Real-time**: Socket.io with Redis adapter
- **API Validation**: Zod on server, class-validator in DTOs
- **Dependency Injection**: typedi (server), @rabjs/react services (web)

## Environment Variables

Copy `.env.example` to `.env` for each app before development. The server requires MySQL, Redis, and S3-compatible storage configuration.

## Docker Infrastructure

The dev infrastructure runs MySQL 8.0 and MinIO (S3-compatible storage) via docker-compose.dev.yml.
