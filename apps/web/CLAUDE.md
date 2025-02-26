# Web Architecture Details

## API Layer

- Shared axios instance in `utils/request.ts` with `withCredentials: true` (cookie auth)
- Request interceptor: adds `X-Runtime-Env` header (electron/web), serializes Date query params to timestamps
- Response interceptor: unwraps `response.data` on success; on 401 clears localStorage (`aimo_token`, `aimo_user`) and redirects to `/auth`; handles 403/404/500 with console errors; network errors return `{ code: -1, message }`
- API files in `src/api/` are pure functions organized by domain

## Auth Flow Details

1. `main.tsx` renders `<AuthInitializer>`, calls `authService.checkAuth()`
2. `checkAuth()` reads `aimo_user` from localStorage, then calls `userApi.getUserInfo()` (cookie-authed) to validate session
3. On success, connects Socket.IO
4. `ProtectedRoute` reads `authService.isAuthenticated`, redirects to `/auth` if false
5. On 401 from any API call, axios interceptor clears both localStorage keys and redirects
6. User info persisted as `aimo_user` (JSON) in localStorage for fast hydration

## @rabjs/react Service Patterns

- Many services export both the class and a standalone instance: `export const authService = new AuthService()` for use in non-React code
- For circular-dependency avoidance, lazy-load via dynamic `import()``
- App root wrapped with `bindServices(App, [])` + `<RSRoot><RSStrict>` in `main.tsx`

## Tiptap Collaboration (Hocuspocus/Yjs)

- `useCollaboration.ts` creates Y.Doc per blog page (destroyed and recreated when `pageId` changes to prevent content mixing)
- `HocuspocusProvider` connects to `ws://{host}/collaboration` with document name `blog:{pageId}`
- `IndexeddbPersistence` for offline-first local caching (key: `blog-{pageId}`)
- Content seeding: when editor first syncs and is empty, blog's saved `content` JSON from REST API is injected via `editor.commands.setContent()`
- `BlogEditorService.setCollaborationMode(true)` disables debounced HTTP auto-save — Hocuspocus server handles persistence
- REST endpoint still provides snapshot save/load (`saveSnapshot`/`getSnapshot`) as fallback
- `CollabAvatars` component reads `awareness.getStates()` to show up to 5 online user avatars

## Layout Details

- Left sidebar (70px fixed): logo top, icon navigation middle (Memo/Zap, Tasks, Notifications with unread badge, GitHub, Blog, Apps), settings/theme/user menu bottom
- Each page composes its own Layout wrapper (not applied at route level in App.tsx)
- macOS Electron: adds 30px drag area at top for traffic light buttons, extra top padding on logo
