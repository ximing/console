# 博客编辑器实时协作 — 设计文档

> 日期：2026-04-01
> 状态：已批准

## 1. 目标

为博客编辑器添加实时协作功能，支持多名已登录用户同时编辑同一篇博客，实时看到彼此的光标和内容变更。

## 2. 技术选型

- **CRDT 框架**：yjs（v13/v14）
- **编辑器绑定**：@tiptap/extension-collaboration + @tiptap/y-tiptap
- **WebSocket 同步**：y-websocket（嵌入 Express，/collab-ws 路由）
- ** Awareness**：y-protocols（远程光标/在线状态）
- **持久化**：MySQL 定期快照 + Y.Doc 内存协作源

## 3. 架构

```
Browser (TipTap Editor)
  └── @tiptap/extension-collaboration → binds TipTap ↔ Y.Doc
        ↓ WebSocket /collab-ws?room=blog:{id}&token={jwt}
      Express Server (port 3000)
        └── /collab-ws 路由 → y-websocket server handler
                                   ↓
                              Y.Doc (per blog, in-memory)
                                   ↓ periodic (30s)
                                MySQL (blogs.content_snapshot)
```

## 4. 前端

### 4.1 新增文件

- `apps/web/src/pages/blogs/editor/collaboration-provider.ts` — Y.Doc + WebsocketProvider 管理生命周期
- `apps/web/src/pages/blogs/editor/collab-cursor-badge.tsx` — 远程用户 Cursor 渲染组件

### 4.2 修改文件

- `apps/web/src/pages/blogs/editor/editor.tsx` — 集成 Collaboration + CollaborationCursor 扩展
- `apps/web/src/pages/blogs/editor/tiptap.config.ts` — StarterKit 关闭 `undoRedo`（由 Yjs UndoManager 接管）
- `apps/web/src/services/blog.service.ts` — 添加 `saveSnapshot(blogId, content)` 方法

### 4.3 Provider 生命周期

```
BlogEditor mount
  → new Y.Doc()
  → new WebsocketProvider({ docName: `blog:${blogId}` })
  → provider.connect()
  → editor.setContent(initialContent) // on first sync

BlogEditor unmount
  → provider.destroy()
  → Y.Doc destroyed
```

### 4.4 TipTap 配置变更

StarterKit 扩展需要关闭内置 undoRedo：

```ts
StarterKit.configure({
  undoRedo: false, // Yjs UndoManager接管
})
```

添加协作扩展：

```ts
import Collaboration from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/y-tiptap';

Collaboration.configure({ document: ydoc }),
CollaborationCursor.configure({
  provider: websocketProvider,
  user: { name: currentUser.name, color: userColor },
}),
```

### 4.5 Cursor/Presence

- 用户信息通过 `provider.awareness.setLocalStateField('user', {...})` 设置
- 远程用户光标通过 CollaborationCursor 扩展自动渲染为带名字的彩色光标
- 在线用户列表从 `provider.awareness.getStates()` 读取，显示在工具栏右侧
- 用户颜色从预设调色板分配：`['#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6']`，按用户 ID hash 选择

### 4.6 在线用户列表组件

- 组件文件：`apps/web/src/pages/blogs/editor/components/collab-presence.tsx`
- 展示位置：编辑器工具栏右侧
- 显示内容：当前在线用户的头像/名字，颜色标签

## 5. 后端

### 5.1 新增文件

- `apps/server/src/services/collaboration.service.ts` — Yjs 文档生命周期管理（per blog doc 缓存）
- `apps/server/src/middlewares/collab-auth.ts` — JWT 验证中间件（从 query token 提取并验证用户）

### 5.2 修改文件

- `apps/server/src/app.ts` — 注册 /collab-ws 路由，挂载 y-websocket server

### 5.3 y-websocket 集成

```ts
import { setupWSConnection } from 'y-websocket/bin/utils';
import jwt from 'jsonwebtoken';
import { config } from './config/config.js';

app.use('/collab-ws', (req: any, socket: any, next: any) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const room = url.searchParams.get('room');

  if (!token) {
    socket.destroy();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string };
    (req as any).user = { id: decoded.id };
    next();
  } catch {
    socket.destroy();
  }
}, (req: any, socket: any) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const room = url.searchParams.get('room') || '';
  setupWSConnection(req, socket, { docName: room });
});
```

### 5.4 JWT 认证

Token 从 WebSocket URL query 参数 `?room=blog:xxx&token=jwt` 传递，使用 `jwt.verify(token, config.jwt.secret)` 验证（与 `auth-handler.ts` 一致的模式）。验证失败则销毁 socket 连接。

## 6. 数据模型

### 6.1 MySQL schema 变更

```sql
ALTER TABLE blogs ADD COLUMN content_snapshot LONGTEXT COMMENT 'Y.Doc 协作内容快照';
ALTER TABLE blogs ADD COLUMN last_snapshot_at DATETIME COMMENT '上次快照时间';
```

**说明**：
- 现有 `content` 字段（TipTap JSON）在非协作流程中继续使用（普通保存/发布时更新）
- `content_snapshot` 专门存储协作 Y.Doc 的 JSON 快照，用于协作断线后恢复
- 两者在协作模式下独立更新，不互相覆盖

### 6.2 快照策略

- **间隔**：30 秒
- **触发条件**：Y.Doc 有未持久化的变更时保存（通过 Y.Doc 的 `shouldPersist` 脏标记判断）
- **更新内容**：`blogs.content_snapshot` + `blogs.last_snapshot_at`（不影响原有 `content` 字段）
- **初始化**：用户加入时，若 MySQL 有 `content_snapshot` 则加载并注入 Y.Doc；否则从空文档开始

## 7. Awareness 配置

```ts
provider.awareness.setLocalStateField('user', {
  name: currentUser.name,
  color: userColor, // 从预设调色板分配，如 ['#ffaabb', '#ff6633', '#33ff99', ...]
  id: currentUser.id,
});
```

远程 Cursor 通过 `@tiptap/y-tiptap` 的 CollaborationCursor 扩展自动渲染。

## 8. Undo/Redo

- TipTap 内置的 undoRedo 已禁用
- Yjs UndoManager 接管，支持「只撤销自己本地修改」的行为
- 通过 `trackedOrigins` 配置区分本地和远程变更

## 9. 错误处理

| 场景 | 处理 |
|------|------|
| WebSocket 断开 | y-websocket 自动重连 |
| 用户未登录 | 访问编辑器页面前检查 auth，重定向到登录 |
| Token 过期 | WebSocket 断开，前端提示重新登录 |
| MySQL 快照失败 | 记录 error log，继续协作，下次重试 |
| Y.Doc 文档过大 | 增量同步，按需传输，非全量 |

## 10. 待实现清单

- [ ] 安装前端依赖：yjs, y-protocols, @tiptap/extension-collaboration, @tiptap/y-tiptap, y-websocket
- [ ] 创建 collaboration-provider.ts（Y.Doc + WebsocketProvider 管理）
- [ ] 修改 tiptap.config.ts（StarterKit undoRedo: false）
- [ ] 修改 blog-editor-page.tsx（集成 Collaboration + CollaborationCursor）
- [ ] 创建 collab-auth.ts 中间件（JWT 验证，使用 jwt.verify）
- [ ] 修改 app.ts（注册 /collab-ws 路由，y-websocket 集成）
- [ ] 创建 collaboration.service.ts（Y.Doc 生命周期管理）
- [ ] MySQL schema 迁移（新增 content_snapshot, last_snapshot_at 字段）
- [ ] blog.service.ts 添加 saveSnapshot 方法
- [ ] 创建 collab-presence.tsx 组件（在线用户列表，工具栏右侧）
- [ ] 30 秒定时快照逻辑（Y.Doc dirty → MySQL snapshot）
- [ ] 初始化流程（从 MySQL content_snapshot 加载到 Y.Doc）
