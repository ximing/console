# Blog Collaboration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time collaborative editing to the blog editor using yjs + y-websocket, allowing multiple logged-in users to edit simultaneously with cursor presence.

**Architecture:** y-websocket server embedded in Express at `/collab-ws` route. Each blog has a dedicated Y.Doc. TipTap's `@tiptap/extension-collaboration` binds TipTap to Y.Doc. MySQL stores periodic JSON snapshots (30s) for persistence. Awareness protocol shows remote cursors.

**Tech Stack:** yjs, y-protocols, @tiptap/extension-collaboration, @tiptap/y-tiptap, y-websocket (frontend + backend), Express, MySQL/Drizzle

---

## File Map

### Backend (apps/server)
| File | Role |
|------|------|
| `src/db/schema/blog.ts` | Add `content_snapshot`, `last_snapshot_at` columns |
| `src/services/blog.service.ts` | Add `saveSnapshot()` and `getSnapshot()` methods |
| `src/middlewares/collab-auth.ts` | **NEW** — JWT verification middleware for WebSocket upgrade |
| `src/app.ts` | Register `/collab-ws` route, mount y-websocket handler |

### Frontend (apps/web)
| File | Role |
|------|------|
| `src/pages/blogs/editor/tiptap.config.ts` | Disable StarterKit `undoRedo` |
| `src/pages/blogs/editor/collaboration-provider.ts` | **NEW** — Y.Doc + WebsocketProvider lifecycle |
| `src/pages/blogs/editor/components/collab-presence.tsx` | **NEW** — Online users list UI |
| `src/pages/blogs/editor/editor.tsx` | Integrate Collaboration + CollaborationCursor extensions |
| `src/services/blog.service.ts` | Add `saveSnapshot()` API call |

---

## Chunk 1: Backend — Schema + Blog Service

### 1.1: Add snapshot fields to blog schema

**File:** `apps/server/src/db/schema/blog.ts`

- [ ] **Step 1: Edit blog schema — add snapshot columns**

Find the `blogs` table definition and add two new columns after `updatedAt`:

```ts
contentSnapshot: text('content_snapshot'),
lastSnapshotAt: timestamp('last_snapshot_at', { mode: 'date', fsp: 3 }),
```

Full modified `blogs` table (showing only changed section):

```ts
export const blogs = mysqlTable(
  'blogs',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: json('content').$type<Record<string, unknown>>(),
    excerpt: text('excerpt'),
    slug: varchar('slug', { length: 100 }).notNull(),
    directoryId: varchar('directory_id', { length: 191 }).references(() => directories.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    publishedAt: timestamp('published_at', { mode: 'date', fsp: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // NEW COLUMNS:
    contentSnapshot: text('content_snapshot'),
    lastSnapshotAt: timestamp('last_snapshot_at', { mode: 'date', fsp: 3 }),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    slugIdx: index('slug_idx').on(table.slug),
    directoryIdIdx: index('directory_id_idx').on(table.directoryId),
    userSlugIdx: index('user_slug_idx').on(table.userId, table.slug),
  })
);
```

- [ ] **Step 2: Generate migration**

Run: `pnpm build:server && pnpm --filter @x-console/server migrate:generate`

Expected output: Migration file created in `drizzle/` folder with `ALTER TABLE blogs ADD COLUMN content_snapshot TEXT` and `ALTER TABLE blogs ADD COLUMN last_snapshot_at TIMESTAMP(3)`.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/db/schema/blog.ts drizzle/
git commit -m "feat(blogs): add content_snapshot and last_snapshot_at columns

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 1.2: Add snapshot methods to server BlogService

**File:** `apps/server/src/services/blog.service.ts`

- [ ] **Step 1: Add snapshot methods to BlogService**

Add these two methods at the end of the `BlogService` class (before the closing `}`):

```ts
/**
 * Save a collaboration snapshot of the blog content
 */
async saveSnapshot(id: string, userId: string, contentSnapshot: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(blogs)
    .set({
      contentSnapshot,
      lastSnapshotAt: new Date(),
    })
    .where(and(eq(blogs.id, id), eq(blogs.userId, userId)));
}

/**
 * Get the collaboration snapshot for a blog
 */
async getSnapshot(id: string, userId: string): Promise<{ contentSnapshot: string | null; lastSnapshotAt: Date | null }> {
  const db = getDatabase();
  const results = await db
    .select({ contentSnapshot: blogs.contentSnapshot, lastSnapshotAt: blogs.lastSnapshotAt })
    .from(blogs)
    .where(and(eq(blogs.id, id), eq(blogs.userId, userId)))
    .limit(1);

  if (results.length === 0) {
    return { contentSnapshot: null, lastSnapshotAt: null };
  }
  return {
    contentSnapshot: results[0].contentSnapshot ?? null,
    lastSnapshotAt: results[0].lastSnapshotAt ?? null,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/services/blog.service.ts
git commit -m "feat(blogs): add saveSnapshot and getSnapshot methods

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Backend — y-websocket + Auth Middleware

### 2.1: Create collab-auth middleware

**File:** `apps/server/src/middlewares/collab-auth.ts`

- [ ] **Step 1: Write collab-auth middleware**

```ts
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export interface CollabUser {
  id: string;
}

/**
 * Verify JWT token from WebSocket URL query parameter.
 * Returns the decoded user or null if invalid.
 */
export function verifyCollabToken(token: string): CollabUser | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string };
    return { id: decoded.id };
  } catch (err) {
    logger.warn('Collab auth failed: invalid token', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Express middleware for y-websocket upgrade route.
 * Validates token query param and attaches user to request.
 */
export function collabAuthMiddleware(req: Request, res: any, next: any): void {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const room = url.searchParams.get('room');

  if (!token) {
    res.status(401).json({ success: false, message: 'Token required' });
    return;
  }

  if (!room) {
    res.status(400).json({ success: false, message: 'Room required' });
    return;
  }

  const user = verifyCollabToken(token);
  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }

  (req as any).collabUser = user;
  (req as any).collabRoom = room;
  next();
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/middlewares/collab-auth.ts
git commit -m "feat(collab): add collab-auth middleware for JWT verification

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 2.2: Integrate y-websocket into app.ts

**File:** `apps/server/src/app.ts`

- [ ] **Step 1: Add y-websocket imports and route**

Add these imports near the top of the file (after existing imports):

```ts
import { collabAuthMiddleware } from './middlewares/collab-auth.js';
import { logger } from './utils/logger.js';
```

Find the section after `// Initialize Socket.IO` in `app.ts` and add the y-websocket route **before** the Socket.IO initialization. Since `y-websocket/bin/utils` is CommonJS and this project is ESM, use dynamic import:

```ts
// y-websocket collaboration server at /collab-ws route
app.use('/collab-ws', collabAuthMiddleware, async (req: any, socket: any, head: any) => {
  const room = req.collabRoom;
  const docName = room; // e.g. "blog:{id}"

  logger.info(`Collab WebSocket connecting`, { room, userId: req.collabUser.id });

  // Dynamic import because y-websocket/bin/utils is CommonJS and this project is ESM
  const { setupWSConnection } = await import('y-websocket/bin/utils');
  setupWSConnection(req, socket, { docName });
});
```

**Note:** The `head` (Buffer) parameter is for WebSocket upgrade headers. The `setupWSConnection` function is called synchronously after the dynamic import resolves.

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/app.ts
git commit -m "feat(collab): integrate y-websocket at /collab-ws route

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Frontend — TipTap Config + Collaboration Provider

### 3.1: Update TipTap config — disable StarterKit undoRedo

**File:** `apps/web/src/pages/blogs/editor/tiptap.config.ts`

- [ ] **Step 1: Modify StarterKit configure call**

Find this line in `tiptap.config.ts`:

```ts
StarterKit,
```

Change it to:

```ts
StarterKit.configure({
  // Disable built-in undo/redo — Yjs UndoManager handles collaborative undo
  undoRedo: false,
}),
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/editor/tiptap.config.ts
git commit -m "feat(collab): disable StarterKit undoRedo for Yjs undo management

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 3.2: Create collaboration-provider.ts

**File:** `apps/web/src/pages/blogs/editor/collaboration-provider.ts`

- [ ] **Step 1: Write the collaboration provider**

```ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';

export interface CollabUser {
  name: string;
  color: string;
  id: string;
}

const USER_COLORS = [
  '#f87171', '#fb923c', '#facc15', '#4ade80',
  '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6',
];

/**
 * Get a consistent color for a user based on their ID hash
 */
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash | 0; // Keep within 32-bit integer bounds
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export interface CollaborationProviderResult {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  awareness: Awareness;
  destroy: () => void;
}

/**
 * Create a Y.Doc + WebsocketProvider for a blog collaboration room.
 * Returns cleanup function.
 */
export function createCollaborationProvider(
  blogId: string,
  user: { id: string; name: string },
  jwtToken: string,
  serverUrl: string = ''
): CollaborationProviderResult {
  const ydoc = new Y.Doc();

  // Determine WebSocket URL — use relative path in browser
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = serverUrl || window.location.host;
  const wsUrl = `${wsProtocol}//${wsHost}`;

  const roomName = `blog:${blogId}`;
  const provider = new WebsocketProvider(wsUrl, roomName, ydoc, {
    params: { token: jwtToken },
  });

  const awareness = provider.awareness;

  // Set local user awareness
  const color = getUserColor(user.id);
  awareness.setLocalStateField('user', {
    name: user.name,
    color,
    id: user.id,
  });

  const destroy = () => {
    provider.destroy();
    ydoc.destroy();
  };

  return { ydoc, provider, awareness, destroy };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/editor/collaboration-provider.ts
git commit -m "feat(collab): add collaboration provider for Y.Doc + WebsocketProvider

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 3.3: Create collab-presence.tsx component

**File:** `apps/web/src/pages/blogs/editor/components/collab-presence.tsx`

- [ ] **Step 1: Write the presence component**

```tsx
import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';

export interface CollabUser {
  name: string;
  color: string;
  id: string;
}

interface CollabPresenceProps {
  awareness: Awareness | null;
  currentUserId: string;
}

/**
 * Displays a list of currently online users in the editor.
 * Rendered in the toolbar area.
 */
export function CollabPresence({ awareness, currentUserId }: CollabPresenceProps) {
  const [users, setUsers] = useState<CollabUser[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const onlineUsers: CollabUser[] = [];
      states.forEach((state) => {
        if (state.user && state.user.id !== currentUserId) {
          onlineUsers.push(state.user as CollabUser);
        }
      });
      setUsers(onlineUsers);
    };

    updateUsers();
    awareness.on('change', updateUsers);

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [awareness, currentUserId]);

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 ml-2">
      <span className="text-xs text-gray-500 dark:text-zinc-400">在线:</span>
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.name}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/blogs/editor/components/collab-presence.tsx
git commit -m "feat(collab): add collab-presence component for online users

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Frontend — Editor Integration

### 4.1: Modify editor.tsx to use Collaboration extension

**File:** `apps/web/src/pages/blogs/editor/editor.tsx`

- [ ] **Step 1: Add new imports**

Add after existing imports:

```ts
import { useMemo, useRef, useEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Collaboration from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import { CollabPresence } from './components/collab-presence';
```

- [ ] **Step 2: Remove or ignore dead collabProvider state**

The plan originally included `const [collabProvider, setCollabProvider] = useState(...)` — this is unused and should be removed or simply not added. The JSX reference to `collabProvider?.awareness` will be replaced with direct `awareness` variable from Step 3.

- [ ] **Step 3: Rewrite editor.tsx integration**

**TipTap 3 constraint:** Extensions must be passed to `useEditor` at creation time — they cannot be dynamically added afterward. `editor.registerExtension()` does not exist in TipTap 3.

**Correct approach:** Create Y.Doc + WebsocketProvider at component top level (not inside useEffect), then pass extensions to `useEditor` via `useMemo`. The `useEditor` hook must stay at the top level of the component.

**Implementation:**

1. **Add imports** (from Step 1) and **add state** (from Step 2) — already done.

2. **Create collaboration infrastructure BEFORE useEditor** (at component top level, after state declarations):

```ts
// Determine blogId (available synchronously from params)
const blogId = id || params.id;

// Get JWT token from localStorage — use same key as collab_token
// NOTE: If aimo_token is httpOnly, a separate non-httpOnly collab token endpoint
// is needed. Use 'aimo_token' here once that endpoint exists.
const token = localStorage.getItem('aimo_token') || localStorage.getItem('collab_token') || '';

// Create Y.Doc + WebsocketProvider wrapped in useMemo to avoid recreation on every render
const ydoc = useMemo(() => new Y.Doc(), []);
const provider = useMemo(() => {
  if (!blogId) return null;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;
  const roomName = `blog:${blogId}`;
  return new WebsocketProvider(wsUrl, roomName, ydoc, { params: { token } });
}, [ydoc, blogId, token]);

const awareness = provider?.awareness;

// Set local user awareness (deferred until blogService.currentUser is available)
const userId = blogService.currentBlog?.userId || '';
const userName = blogService.currentBlog?.userId || 'User'; // TODO: use actual username
const userColor = USER_COLORS[Math.abs(userId.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0)) % USER_COLORS.length];

useEffect(() => {
  if (!awareness || !userId) return;
  awareness.setLocalStateField('user', {
    name: userName,
    color: userColor,
    id: userId,
  });
}, [awareness, userId, userName, userColor]);
```

3. **Build extensions with useMemo** (includes Collaboration from the start):

```ts
// Build extensions — Collaboration is included from the start
const extensions = useMemo(() => {
  return [
    ...editableExtensions,
    Collaboration.configure({
      document: ydoc,
    }),
    CollaborationCursor.configure({
      provider: provider,
      user: {
        name: userName,
        color: userColor,
      },
    }),
  ];
}, [ydoc, provider, userName, userColor]); // rebuild when user info changes
```

4. **Replace the useEditor call** — pass the extensions from useMemo:

```ts
const editor = useEditor({
  extensions,
  content: '',
  editorProps: {
    attributes: {
      class:
        'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-0 py-3',
    },
  },
  onUpdate: ({ editor }) => {
    if (isEditing && blogService.currentBlog) {
      const content = editor.getJSON();
      blogService.updateBlog(blogId!, {
        content,
        excerpt: blogService.generateExcerpt(editor),
      });
    }
  },
});
```

5. **Handle initial content sync** — in a useEffect that listens to `provider.synced`:

```ts
// Set initial content after Y.Doc syncs
useEffect(() => {
  if (!editor || !contentLoaded) return;

  // After first sync, if Y.Doc is empty and we have blog content, load it
  const handleSync = () => {
    const ytext = ydoc.getText('prosemirror');
    if (ytext.length === 0 && blogService.currentBlog?.content) {
      editor.commands.setContent(blogService.currentBlog.content);
    }
  };

  provider.on('synced', handleSync);

  // Also check immediately in case already synced
  handleSync();

  return () => {
    provider.off('synced', handleSync);
  };
}, [editor, contentLoaded, ydoc, blogService.currentBlog]);
```

6. **Cleanup on unmount** — add to the existing cleanup logic:

```ts
// In the component's return cleanup (if any), or add:
useEffect(() => {
  return () => {
    providerRef.current.destroy();
    ydoc.destroy();
  };
}, []);
```

**Why this works:** TipTap 3's extensions are immutable after editor creation. By creating the Y.Doc and WebsocketProvider before `useEditor`, we can pass them to `Collaboration.configure()` at creation time. The `blogId` is known synchronously from props/params, so there's no chicken-and-egg problem.

- [ ] **Step 4: Add CollabPresence to render**

Find the EditorToolbar line in the JSX:
```tsx
<EditorToolbar editor={editor} blogId={blogId || ''} />
```

Change it to:
```tsx
<EditorToolbar editor={editor} blogId={blogId || ''} />
<CollabPresence
  awareness={awareness}
  currentUserId={userId}
/>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/blogs/editor/editor.tsx
git commit -m "feat(collab): integrate Collaboration + CollaborationCursor into editor

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 4.2: Add snapshot save API to frontend blog service

**File:** `apps/web/src/services/blog.service.ts`

- [ ] **Step 1: Add saveSnapshot method**

Add this method to `BlogService` class:

```ts
/**
 * Save a collaboration content snapshot to MySQL via server
 */
async saveSnapshot(id: string, contentSnapshot: string): Promise<void> {
  try {
    await blogApi.saveSnapshot(id, contentSnapshot);
  } catch (err) {
    console.error('Save snapshot error:', err);
    // Don't show toast — snapshot failure shouldn't interrupt user
  }
}
```

- [ ] **Step 2: Add API method in blog.ts**

**File:** `apps/web/src/api/blog.ts`

Add the API method:

```ts
export async function saveSnapshot(blogId: string, contentSnapshot: string): Promise<void> {
  await apiClient.patch(`/blogs/${blogId}/snapshot`, { contentSnapshot });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/services/blog.service.ts apps/web/src/api/blog.ts
git commit -m "feat(collab): add saveSnapshot API call to blog service

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### 4.3: Add snapshot save endpoint to backend

**File:** `apps/server/src/controllers/v1/blog.controller.ts`

- [ ] **Step 1: Add PATCH /blogs/:id/snapshot endpoint**

Find the existing blog controller and add a new method. First check the controller file structure:

```ts
// Add to blog controller, after existing methods:

/**
 * Save collaboration snapshot for a blog
 */
async saveSnapshot(@Param('id') id: string, @Body() body: { contentSnapshot: string }, @CurrentUser() user: any) {
  const blogService = Container.get(BlogService);
  const result = await blogService.saveSnapshot(id, user.id, body.contentSnapshot);
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/controllers/v1/blog.controller.ts
git commit -m "feat(collab): add PATCH /blogs/:id/snapshot endpoint

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Frontend — 30s Snapshot Timer + Auth Token

### 5.1: Add snapshot timer to editor.tsx

**File:** `apps/web/src/pages/blogs/editor/editor.tsx`

- [ ] **Step 1: Add snapshot timer effect**

Add this `useEffect` after the collab setup effect:

```ts
// Keep editor in a ref for use in interval
const editorRef = useRef(editor);
useEffect(() => { editorRef.current = editor; }, [editor]);

// 30-second snapshot timer
useEffect(() => {
  if (!provider || !ydoc || !blogId) return;

  const SNAPSHOT_INTERVAL = 30000; // 30 seconds

  const timer = setInterval(() => {
    // Get current editor content as JSON
    const content = editorRef.current?.getJSON();
    if (content) {
      const snapshot = JSON.stringify(content);
      blogService.saveSnapshot(blogId, snapshot);
    }
  }, SNAPSHOT_INTERVAL);

  return () => clearInterval(timer);
}, [provider, ydoc, blogId, blogService]);
```

- [ ] **Step 2: Fix JWT token retrieval**

The token retrieval from cookie should use the correct cookie name. Check `auth-handler.ts` — it uses `aimo_token` from cookies. Ensure the token is passed correctly:

In `editor.tsx`, the collab provider setup should get the token from the correct cookie name. If the token is httpOnly, it won't be accessible from JavaScript. In that case, the WebSocket auth needs a different approach — either:
1. Read token from a non-httpOnly cookie
2. Pass token via the server rendering (SSR)
3. Use a separate API call to get a collaboration token

For now, assume `aimo_token` is accessible (or add a separate non-httpOnly token for collab). Document this as a known constraint.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/editor/editor.tsx
git commit -m "feat(collab): add 30s snapshot timer to editor

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Verification

### 6.1: Install dependencies

- [ ] **Step 1: Install frontend collaboration packages**

Run: `pnpm add yjs y-protocols @tiptap/extension-collaboration @tiptap/y-tiptap y-websocket --filter @x-console/web`

Expected: packages added to `apps/web/package.json`

- [ ] **Step 2: Install backend y-websocket**

Run: `pnpm add y-websocket --filter @x-console/server`

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/server/package.json
git commit -m "chore(collab): add yjs and collaboration dependencies

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### 6.2: TypeScript type check

- [ ] **Step 1: Run typecheck on web**

Run: `pnpm typecheck:web`

Expected: No errors (or only pre-existing errors unrelated to collaboration)

- [ ] **Step 2: Run typecheck on server**

Run: `pnpm typecheck:server`

Expected: No errors

### 6.3: Build check

- [ ] **Step 1: Build web**

Run: `pnpm build:web`

Expected: Build succeeds

- [ ] **Step 2: Build server**

Run: `pnpm build:server`

Expected: Build succeeds

---

## Summary

After all chunks are complete, the collaboration feature will be fully implemented:

1. **Schema** — `blogs.content_snapshot` and `blogs.last_snapshot_at` columns exist
2. **Auth** — JWT verification on WebSocket upgrade at `/collab-ws`
3. **y-websocket** — Express handles WebSocket upgrades for collaboration rooms
4. **TipTap** — Collaboration + CollaborationCursor extensions active
5. **Provider** — `createCollaborationProvider()` manages Y.Doc + WebsocketProvider lifecycle
6. **Presence** — `CollabPresence` shows online users in toolbar
7. **Snapshots** — 30s timer saves Y.Doc content to MySQL
8. **Cursors** — Remote user cursors rendered with name labels
