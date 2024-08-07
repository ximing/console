# Blog Directory Tree Refactor - react-arborist with Drag-Drop Support

## 1. Overview

Refactor the blog sidebar directory tree from a custom recursive implementation to use `react-arborist` for tree rendering and native drag-drop support. The goal is to enable:
- Drag directories to reparent them into other directories
- Drag blogs to move them between directories
- Ghost preview during drag operations

**Status:** Spec approved, implementation pending

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Sidebar                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              react-arborist Tree (DnD)                   │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │ │
│  │  │  Custom Node   │  │  Custom Node   │  │  Root Blogs │ │ │
│  │  │  (Directory)   │  │    (Blog)      │  │   List      │ │ │
│  │  └───────────────┘  └───────────────┘  └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

react-arborist handles tree rendering and drag-drop state. Custom node renderers display directory/blog content. On drop events, existing service methods are called.

---

## 3. Data Model

### Unified Tree Node Type

```typescript
type TreeNodeData =
  | { id: string; type: 'directory'; name: string; children?: TreeNodeData[] }
  | { id: string; type: 'blog'; title: string; directoryId?: string }
```

### Service Integration

- **DirectoryService.buildTree()**: Already returns nested `DirectoryTreeNode[]` — adapt to `TreeNodeData[]`
- **BlogService.blogs**: Flat list grouped by `directoryId` and inserted as children under directory nodes
- **Root-level blogs** (no `directoryId`): Displayed as separate section or handled via virtual root node

### Icon Mapping

| Type | Icon (collapsed) | Icon (expanded) |
|------|------------------|------------------|
| directory | `Folder` | `FolderOpen` |
| blog | `FileText` | — |

---

## 4. Component Structure

### New Files

```
apps/web/src/pages/blogs/components/directory-tree/
├── index.tsx              # Main wrapper component (view from @rabjs/react)
├── types.ts              # TreeNodeData type definitions
├── tree-data.ts          # Transform services → react-arborist data
├── nodes/
│   ├── directory-node.tsx   # Custom node renderer for directories
│   └── blog-node.tsx        # Custom node renderer for blogs
└── hooks/
    ├── use-drop-handler.ts  # onDrop logic → service calls
    └── use-tree-state.ts    # Expanded state, selection state
```

### Modified Files

- `apps/web/src/pages/blogs/components/directory-tree.tsx` — Import from new `index.tsx` or replace entirely

### Sidebar Integration

No changes to props — the new `DirectoryTree` component maintains the same interface.

---

## 5. react-arborist Setup

```tsx
import { Tree } from 'react-arborist';

<Tree
  data={treeData}
  openIds={expandedIds}
  onOpenChange={setExpandedIds}
  onDrop={handleDrop}
  draggable
  enableFatFingers
>
  {NodeRenderer}
</Tree>
```

### Node Renderer

```tsx
function NodeRenderer({ node, style, dragHandle }: NodeRendererProps) {
  if (node.data.type === 'directory') {
    return <DirectoryNode node={node} style={style} dragHandle={dragHandle} />;
  }
  return <BlogNode node={node} style={style} dragHandle={dragHandle} />;
}
```

---

## 6. Drop Handler Logic

```typescript
const handleDrop = ({ dragNode, dropNode, dropTargetId }) => {
  const dragData = dragNode.data;
  const dropTarget = dropNode?.data;

  if (dragData.type === 'blog') {
    // Move blog to target directory (or root if dropped outside a directory)
    blogService.moveBlog(dragData.id, dropTarget?.type === 'directory' ? dropTarget.id : null);
  } else if (dragData.type === 'directory') {
    // Prevent invalid drops
    if (dropTarget?.id === dragData.id) return; // Can't drop into self
    if (isDescendant(dropTarget, dragData.id)) return; // Can't drop into descendant

    // Reparent directory to target
    directoryService.updateDirectory(dragData.id, {
      parentId: dropTarget?.type === 'directory' ? dropTarget.id : null
    });
  }
};
```

### Validation Rules

1. **Directory cannot be its own parent**: Check `dragData.id !== dropTarget.id`
2. **Directory cannot be dropped into its descendant**: Traverse up from `dropTarget` to detect cycle
3. **Blog can always be moved** (even to root, which clears `directoryId`)

---

## 7. Visual Feedback

| Feature | Implementation |
|---------|----------------|
| Ghost preview | react-arborist built-in (semi-transparent dragged node) |
| Drop indicator | Built-in `DropIndicator` component |
| Folder highlight on hover | Built-in `isDropTarget` prop on Node |
| Current styling | Preserved (hover states, active states, colors) |

### Preserved UI Elements

- "全部博客" option at top (static element outside tree)
- Hover action buttons (+, folder+) on directory hover
- Context menu support (right-click)
- Selection highlighting

---

## 8. Error Handling

- **API failures**: Service layer shows toast notification, silently reverts local state
- **Invalid drops**: Validation in `handleDrop` prevents API calls for invalid operations
- **Loading states**: `directoryService.loading` / `blogService.loading` continue to be used in Sidebar

---

## 9. Dependencies

Add to `apps/web/package.json`:

```json
{
  "react-arborist": "^3.x"
}
```

---

## 10. Testing

1. **Unit tests**: `tree-data.ts` transform functions
2. **Integration tests**: Drag-drop flow with mocked service calls
3. **Manual verification**: Browser testing for:
   - Drag directory into another directory (reparent)
   - Drag blog into directory (move)
   - Drag blog to root (clear directoryId)
   - Invalid drops (directory into self/descendant)

---

## 11. Files Summary

| File | Action |
|------|--------|
| `directory-tree/types.ts` | Create |
| `directory-tree/tree-data.ts` | Create |
| `directory-tree/nodes/directory-node.tsx` | Create |
| `directory-tree/nodes/blog-node.tsx` | Create |
| `directory-tree/hooks/use-drop-handler.ts` | Create |
| `directory-tree/hooks/use-tree-state.ts` | Create |
| `directory-tree/index.tsx` | Create |
| `directory-tree.tsx` | Modify (import from new index or replace) |
| `package.json` (web) | Add react-arborist dependency |
