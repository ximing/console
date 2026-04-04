# Blog 协作 MySQL 同步实现计划

## 概述

实现协作编辑内容到 MySQL `blogs.content` 的实时同步，移除冗余的定时快照和 debouncedSave 机制。

## 架构设计

### 数据流

```
协作编辑 → Hocuspocus debounce(1s) → yjs_documents (二进制)
                                          ↓
                                    onStoreDocument
                                          ↓
                                    同步到 blogs.content
```

### Hocuspocus 持久化机制

| 配置 | 值 | 说明 |
|------|------|------|
| debounce | 1000ms | 1秒防抖 |
| maxDebounce | 10000ms | 最大 10 秒必定执行 |
| unloadImmediately | true | 断开时立即 flush |

**频次**：用户停止编辑 1 秒后触发持久化，最多延迟 10 秒。

---

## 改动清单

### 1. YjsService 改用 mysql2 原生 API（二进制存储）

**文件**: `apps/server/src/services/yjs.service.ts`

**改动**:
- 改用 mysql2/promise 原生查询，直接操作 Buffer
- 移除 base64 编解码，直接存储二进制

```typescript
// 存储：直接传 Buffer，mysql2 原生支持
async saveYjsState(docName: string, data: Uint8Array): Promise<void> {
  const pool = getPool(); // mysql2 connection pool
  const buffer = Buffer.from(data);
  await pool.query(
    'INSERT INTO yjs_documents (doc_name, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?, updated_at = NOW()',
    [docName, buffer, buffer]
  );
}

// 读取：mysql2 返回的已经是 Buffer
async getYjsState(docName: string): Promise<Uint8Array | null> {
  const pool = getPool();
  const [rows] = await pool.query('SELECT data FROM yjs_documents WHERE doc_name = ?', [docName]);
  if (!rows[0]?.data) return null;
  return new Uint8Array(rows[0].data);
}
```

### 2. collaboration.ts 配置 debounce: 1000

**文件**: `apps/server/src/collaboration.ts`

**改动**: Hocuspocus 初始化时设置 debounce 为 1000ms

```typescript
const hocuspocus = new Hocuspocus({
  // ... 其他配置
  debounce: 1000, // 1秒
});
```

### 3. 实现 onStoreDocument 同步到 blogs.content

**文件**: `apps/server/src/collaboration.ts`

**改动**: 在 `onStoreDocument` 中同步到 `blogs.content`

```typescript
async onStoreDocument({ documentName, document, context }) {
  // 1. 提取 blog ID
  const blogId = documentName.replace('blog:', '');
  if (!blogId) return;

  // 2. 从 Y.Doc 提取 Tiptap JSON 内容
  const content = extractTiptapContent(document);

  // 3. 更新 blogs 表
  const blogService = Container.get(BlogService);
  await blogService.updateBlogContent(blogId, context.user.id, content);
}
```

### 4. 新增 Yjs → Tiptap JSON 转换服务

**文件**: `apps/server/src/services/yjs-content.service.ts` (新增)

**职责**: 将 Yjs 文档状态转换为 Tiptap JSON

```typescript
import * as Y from 'yjs';

export function extractTiptapContent(yDoc: Y.Doc): Record<string, unknown> {
  // 从 Y.Doc 重建 Tiptap JSON 结构
  // Y.Doc 内存有完整文档树
  const content = yDoc.get('content');

  // 转换逻辑...
  return tiptapJson;
}
```

### 5. BlogService 新增 updateBlogContent 方法

**文件**: `apps/server/src/services/blog.service.ts`

**改动**: 新增只更新 content 的方法

```typescript
async updateBlogContent(id: string, userId: string, content: Record<string, unknown>): Promise<void> {
  const db = getDatabase();
  await db
    .update(blogs)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(blogs.id, id), eq(blogs.userId, userId)));
}
```

### 6. Web 端：协作模式下跳过 HTTP 保存

**文件**: `apps/web/src/pages/blogs/components/blog-editor/blog-editor.service.ts`

**改动**: 协作模式跳过 debouncedSave

```typescript
// BlogEditorService 新增
private isCollaborationMode = false;

setCollaborationMode(enabled: boolean) {
  this.isCollaborationMode = enabled;
}

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

### 7. Web 端：移除定时快照

**文件**: `apps/web/src/pages/blogs/components/blog-editor/blog-editor-page.tsx`

**改动**: 移除 snapshotInterval setInterval

```typescript
// 移除以下代码：
const snapshotInterval = 30000;
const timer = setInterval(() => {
  const content = editor.getJSON();
  blogEditor.blogService.saveSnapshot(pageId, JSON.stringify(content));
}, snapshotInterval);

return () => clearInterval(timer);
```

---

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 修改 | `apps/server/src/services/yjs.service.ts` | 改用 mysql2 原生 Buffer |
| 修改 | `apps/server/src/collaboration.ts` | debounce:1000 + onStoreDocument 同步 |
| 新增 | `apps/server/src/services/yjs-content.service.ts` | Yjs → Tiptap JSON 转换 |
| 修改 | `apps/server/src/services/blog.service.ts` | 新增 updateBlogContent |
| 修改 | `apps/web/src/pages/blogs/components/blog-editor/blog-editor.service.ts` | 协作模式跳过 HTTP 保存 |
| 修改 | `apps/web/src/pages/blogs/components/blog-editor/blog-editor-page.tsx` | 移除定时快照 |

---

## 实现顺序

### Phase 1: 服务端 - Yjs 二进制存储
1. 修改 `yjs.service.ts` 改用 mysql2 原生 API
2. 测试二进制存储/读取

### Phase 2: 服务端 - 同步到 blogs
1. 新增 `yjs-content.service.ts`
2. 修改 `blog.service.ts` 新增 `updateBlogContent`
3. 修改 `collaboration.ts` 实现 `onStoreDocument` 同步 + debounce:1000

### Phase 3: Web 端 - 移除冗余保存
1. 修改 `blog-editor.service.ts` 协作模式判断
2. 修改 `blog-editor-page.tsx` 移除定时快照

---

## 测试验证

1. **协作编辑后非协作打开**: `blogs.content` 与 `yjs_documents` 内容一致
2. **多用户协作**: 所有更改正确同步到 `blogs.content`
3. **二进制存储**: 确认 `yjs_documents.data` 是二进制非 base64
4. **Web 端无冗余请求**: Network 面板确认无 30s 快照请求

---

## 风险与注意事项

1. **Yjs → Tiptap JSON 转换**: 需要正确处理 Y.Doc 结构
2. **并发写入**: `onStoreDocument` 和 HTTP 保存可能并发，只保留协作作为写入源
3. **contentSnapshot 字段**: 保留作为备份，可后续清理
