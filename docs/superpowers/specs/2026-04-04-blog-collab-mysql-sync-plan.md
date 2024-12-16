# Blog 协作 MySQL 同步实现计划

## 概述

实现协作编辑内容到 MySQL `blogs.content` 的实时同步，移除冗余的定时快照和 debouncedSave 机制。

## 问题分析

### 当前架构问题

```
协作编辑 → Yjs 状态 → yjs_documents 表  ← 服务器端 WebSocket 持久化
                                     ↓
                               ❌ 不同步
                                     ↓
Web 端快照(30s) → blogs.content  ← HTTP 保存（冗余）
Web 端 debouncedSave → blogs.content  ← HTTP 保存（冗余）
```

### 后果

1. 非协作打开博客时，看到的是 `blogs.content`（旧内容），而不是 `yjs_documents`（新内容）
2. 定时快照浪费资源
3. 两份内容可能不一致

## 目标架构

```
协作编辑 → Hocuspocus → onStoreDocument → 同步到 blogs.content
```

协作会话中，服务器端作为唯一数据写入源，Web 端不再执行 HTTP 保存。

---

## 改动计划

### 1. 服务端：实现 onStoreDocument 同步

**文件**: `apps/server/src/collaboration.ts`

**改动**: 在 `onStoreDocument` 回调中，将 Yjs 内容同步到 `blogs.content`

**实现要点**:
- `onStoreDocument` 在每次协作内容变化时触发
- 需要从 `documentName` 提取 blog ID（如 `blog:xxx` → `xxx`）
- 将 Yjs 状态转换为 Tiptap JSON
- 调用 `BlogService.updateBlog()` 更新 `blogs.content`

**伪代码**:
```typescript
async onStoreDocument({ documentName, document, context }) {
  // 1. 提取 blog ID
  const blogId = documentName.replace('blog:', '');

  // 2. 从 Yjs document 提取内容
  const content = extractTiptapJsonFromYjs(document);

  // 3. 更新 blogs 表
  await blogService.updateBlog(blogId, context.user.id, { content });
}
```

### 2. 服务端：实现 Yjs → Tiptap JSON 转换

**新增文件**: `apps/server/src/services/yjs-content.service.ts`

**职责**: 将 Yjs 文档状态转换为 Tiptap JSON

**实现方式**:
- 使用 Yjs 的 `getText()` / `getMap()` 等 API 读取内容
- 重建 Tiptap JSON 结构
- 或者：直接存储 Yjs XML Fragment 结构到 `blogs.content`

**注意**: 需要确定 Tiptap JSON 的确切结构，确保转换正确。

### 3. Web 端：协作模式下跳过 HTTP 保存

**文件**: `apps/web/src/pages/blogs/components/blog-editor/blog-editor.service.ts`

**改动**: 在协作模式下，不执行 `debouncedSave`

**实现要点**:
- `BlogEditorService` 需要知道是否处于协作模式
- 可通过 `provider.isConnected` 或独立的状态标记
- 协作连接时，`handleUpdate` 不触发 `debouncedSave`

**伪代码**:
```typescript
private setupEditorListener(editor: Editor) {
  const handleUpdate = () => {
    this.contentJsonRef = editor.getJSON();
    // 协作模式下不执行 HTTP 保存
    if (!this.isCollaborationMode) {
      this.debouncedSave();
    }
  };
  // ...
}
```

### 4. Web 端：移除定时快照

**文件**: `apps/web/src/pages/blogs/components/blog-editor/blog-editor-page.tsx`

**改动**: 移除 `snapshotInterval` 和 `setInterval` 快照逻辑

**移除代码**:
```typescript
// 删除这些
const snapshotInterval = 30000;
const timer = setInterval(() => {
  const content = editor.getJSON();
  blogEditor.blogService.saveSnapshot(pageId, JSON.stringify(content));
}, snapshotInterval);

return () => clearInterval(timer);
```

### 5. 服务端：初始化时从 blogs.content 加载（可选）

**文件**: `apps/server/src/collaboration.ts` - `Database.fetch` 或 `onLoadDocument`

**场景**: 新协作会话，但 `yjs_documents` 无数据时

**实现**:
```typescript
fetch: async ({ documentName }) => {
  const yjsService = Container.get(YjsService);
  let state = await yjsService.getYjsState(documentName);

  if (!state) {
    // 从 blogs.content 初始化
    const blogId = documentName.replace('blog:', '');
    const blog = await blogService.getBlog(blogId, userId);
    if (blog?.content) {
      // 转换为 Yjs 状态
      state = convertTiptapToYjs(blog.content);
    }
  }
  return state;
}
```

---

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 修改 | `apps/server/src/collaboration.ts` | 实现 onStoreDocument 同步 |
| 新增 | `apps/server/src/services/yjs-content.service.ts` | Yjs → Tiptap JSON 转换 |
| 修改 | `apps/web/src/pages/blogs/components/blog-editor/blog-editor.service.ts` | 协作模式跳过 HTTP 保存 |
| 修改 | `apps/web/src/pages/blogs/components/blog-editor/blog-editor-page.tsx` | 移除定时快照 |

---

## 实现顺序

1. **Phase 1**: 服务端同步（`onStoreDocument`）
   - 新增 `yjs-content.service.ts`
   - 修改 `collaboration.ts` 实现同步

2. **Phase 2**: Web 端移除冗余保存
   - 修改 `blog-editor.service.ts` 协作模式判断
   - 修改 `blog-editor-page.tsx` 移除定时快照

3. **Phase 3** (可选): 初始化同步
   - 在 `Database.fetch` 中实现从 `blogs.content` 初始化 Yjs

---

## 测试验证

1. **协作编辑后非协作打开**: 内容一致
2. **多用户协作**: 所有更改正确同步到 `blogs.content`
3. **Web 端不再发送冗余 HTTP 请求**（可通过 Network 面板验证）
4. **服务器端 `onStoreDocument` 日志**: 确认同步触发

---

## 风险与注意事项

1. **转换准确性**: Yjs → Tiptap JSON 转换需要确保格式兼容
2. **性能**: `onStoreDocument` 每次变化都调用，需注意数据库写入频率
3. **上下文获取**: `onStoreDocument` 中获取 `userId` 需要从 `context` 传递
4. **contentSnapshot 字段**: 原有的快照机制可考虑保留作为备份或移除
