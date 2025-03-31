---
ruleType: Always
description: Web 前端架构规则（与 apps/web/CLAUDE.md 正文保持一致）
---
# Web Architecture

React 19 + Vite + Tailwind CSS v4 + React Router + @rabjs/react + Tiptap v3.

## State Management (@rabjs/react)

Services extend `Service`, declare state as class properties. Mutations trigger re-renders in observing components.

- **Register**: all services `register()`-ed in `main.tsx`
- **Consume**: `useService(AuthService)` hook or `view(() => ...)` / `observer(() => ...)` HOCs
- **Cross-service**: `resolve(OtherService)` for singleton access
- 核心用法见 `.claude/rules/rs-react.md`（编辑 `*.service.ts` / `*.tsx` 时自动附加）；页面级 Service 注册模式见 `.claude/rules/page-component-service.md`

### Service Patterns

- Many services export both the class and a standalone instance: `export const authService = new AuthService()` for use in non-React code
- For circular-dependency avoidance, lazy-load via dynamic `import()`
- App root wrapped with `bindServices(App, [])` + `<RSRoot><RSStrict>` in `main.tsx`

## API Layer

- Shared axios instance in `utils/request.ts` with `withCredentials: true` (cookie auth)
- Request interceptor: adds `X-Runtime-Env` header (electron/web), serializes Date query params to timestamps
- Response interceptor: unwraps `response.data` on success; on 401 clears localStorage (`aimo_token`, `aimo_user`) and redirects to `/auth`; handles 403/404/500 with console errors; network errors return `{ code: -1, message }`
- API files in `src/api/` are pure functions organized by domain

## Auth

Dual token: **cookie** (httpOnly, for REST APIs via `withCredentials: true`) + **Bearer token** (localStorage `aimo_token`, for Socket.IO and Hocuspocus WebSocket auth).

1. `main.tsx` renders `<AuthInitializer>`, calls `authService.checkAuth()`
2. `checkAuth()` reads `aimo_user` from localStorage, then calls `userApi.getUserInfo()` (cookie-authed) to validate session
3. On success, connects Socket.IO
4. `ProtectedRoute` reads `authService.isAuthenticated`, redirects to `/auth` if false
5. On 401 from any API call, axios interceptor clears both localStorage keys and redirects
6. User info persisted as `aimo_user` (JSON) in localStorage for fast hydration

## Routing

`HashRouter` for Electron, `BrowserRouter` for web. Content routes wrapped in `<ProtectedRoute>`. `utils/navigation.ts` stores `navigate` in a closure for imperative redirects from non-component code.

## Tiptap Collaboration (Hocuspocus/Yjs)

- `useCollaboration.ts` creates Y.Doc per blog page (destroyed and recreated when `pageId` changes to prevent content mixing)
- `HocuspocusProvider` connects to `ws://{host}/collaboration` with document name `blog:{pageId}`
- `IndexeddbPersistence` for offline-first local caching (key: `blog-{pageId}`)
- Content seeding: when editor first syncs and is empty, blog's saved `content` JSON from REST API is injected via `editor.commands.setContent()`
- `BlogEditorService.setCollaborationMode(true)` disables debounced HTTP auto-save — Hocuspocus server handles persistence
- REST endpoint still provides snapshot save/load (`saveSnapshot`/`getSnapshot`) as fallback
- `CollabAvatars` component reads `awareness.getStates()` to show up to 5 online user avatars

## Icons

所有图标使用 `lucide-react`，禁止引入其他图标库，保持图标库统一。

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

## Layout Details

- Left sidebar (70px fixed): logo top, icon navigation middle (Memo/Zap, Tasks, Notifications with unread badge, GitHub, Blog, Apps), settings/theme/user menu bottom
- Each page composes its own Layout wrapper (not applied at route level in App.tsx)
- macOS Electron: adds 30px drag area at top for traffic light buttons, extra top padding on logo
