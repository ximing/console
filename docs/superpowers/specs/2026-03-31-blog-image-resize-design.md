# Blog Image Resize Feature Design

## Overview

Add drag-to-resize capability to images in the Tiptap-based blog editor. Users can click on images to reveal resize handles, then drag to resize while maintaining aspect ratio.

## User Experience

### Interaction Flow
1. User clicks on an image in the editor
2. Image shows dashed bounding box with 8 resize handles (corners + edges)
3. User drags any handle to resize the image
4. Aspect ratio is automatically maintained
5. User clicks outside to deselect and hide handles

### Visual Design

#### Resize Handles
- **Style**: Small white squares (10x10px) with 1px dark border (#333)
- **Positions**: 4 corners + 4 edge midpoints (top, right, bottom, left)
- **Cursor**: `nwse-resize` on corners, `ns-resize` on top/bottom, `ew-resize` on left/right
- **Bounding box**: 1px dashed border (#333), offset 4px from image edges

#### Handle Visibility
- Handles appear when image is selected (via click or selection)
- Handles remain visible while image is selected
- Clicking outside the image deselects it and hides handles
- Clicking on an already-selected image does NOT deselect (prevents accidental deselection)
- Handles are not shown for other media types (audio, video, tables)

## Technical Approach

### Architecture
Create a custom Tiptap NodeView (`ImageResizer`) as a React component that:
1. Uses `NodeViewWrapper` pattern (standard Tiptap React integration)
2. Listens to node selection changes within the node view
3. Renders an overlay with 8 draggable handles
4. Updates the image node's `width` and `height` attributes on resize

### File Structure
```
apps/web/src/pages/blogs/editor/
├── extensions/
│   └── image-with-resize.ts      # Custom image extension with resize attributes
└── components/
    └── image-resizer.tsx         # NodeView React component for resize handles
```

### Integration with Tiptap

#### Custom Image Extension with NodeView
Create `image-with-resize.ts` that extends TiptapImage with a NodeView for resize handles:
```typescript
import TiptapImage from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { ImageResizer } from './components/image-resizer';

export const ImageWithResize = TiptapImage.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageResizer);
  },
});
```

**Note:** `TiptapImage` already provides `width` and `height` attributes by default, so no custom attribute extension is needed.

#### NodeView Component Pattern
The `ImageResizer` component uses standard Tiptap NodeView integration:
```typescript
import { NodeViewWrapper } from '@tiptap/react';

export const ImageResizer = NodeViewWrapper(({ node, selected }) => {
  // Render handles when selected
  if (!selected) return null;
  // ... handle rendering and drag logic
});
```

#### Update tiptap.config.ts
Replace `TiptapImage` with the custom extension:
```typescript
import { ImageWithResize } from './extensions/image-with-resize';

const imageExtensions = ImageWithResize.configure({
  HTMLAttributes: {
    class: 'max-w-full h-auto',
  },
});
```

### Resize Logic

#### State
- `isResizing`: boolean
- `startPos`: { x: number, y: number }
- `startDim`: { width: number, height: number }
- `aspectRatio`: number (calculated from natural dimensions on first selection)

#### Drag Calculations
1. **On handle mousedown**:
   - Prevent default and stop propagation
   - Store initial mouse position
   - Store initial image dimensions
   - Calculate aspect ratio = width / height

2. **On document mousemove**:
   - Calculate deltaX and deltaY from start position
   - For corner handles: use the larger delta to determine new width, then calculate height
   - For edge handles: update only the corresponding dimension
   - Clamp: min 50px, max = min(containerWidth, naturalWidth)
   - Apply aspect ratio: height = width / aspectRatio

3. **On document mouseup**:
   - Update the Tiptap node with `width` and `height` attributes
   - Remove document-level event listeners

#### Click vs Drag Distinction
- If total mouse movement < 3px on mouseup, treat as click (deselect)
- If movement >= 3px, treat as resize and persist dimensions

### Edge Cases

| Case | Handling |
|------|----------|
| Animated GIFs | Do not apply resize handles; allow natural playback |
| Images without width/height | On first click, get `naturalWidth`/`naturalHeight` for aspect ratio |
| Images at container max | Cap resize at `editor.contentContainer.offsetWidth` |
| Resize cancelled (Escape) | Rollback to original dimensions, deselect |
| Touch/mobile | Not in initial scope; handles are desktop-only |
| Keyboard accessibility | Not in initial scope |
| Images inside links | Resize the image, link remains intact |
| Memory leaks | All document listeners removed on mouseup or component unmount |
| Undo/redo | Dimensions stored in node attributes, naturally supported by ProseMirror |

### Style Isolation
The resize overlay styles should use a unique prefix to avoid conflicts:
```css
.image-resizer-overlay { pointer-events: none; position: absolute; inset: -4px; }
.image-resizer-handle {
  pointer-events: auto;
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border: 1px solid #333;
  box-sizing: border-box;
}
```

## Component Specs

### ImageResizer NodeView

**Props (Tiptap NodeView props):**
- `node`: ProseMirror Node
- `selected`: boolean
- `updateAttributes`: (attrs: object) => void

**Local State:**
- `isResizing`: boolean
- `startPos`: { x: number, y: number }
- `startDim`: { width: number, height: number }

**Lifecycle:**
1. `onMouseDown` on handle → start resize tracking, add document listeners
2. `onMouseMove` on document → calculate new dimensions, update local state
3. `onMouseUp` on document → if delta > 3px, call `updateAttributes()`, remove listeners
4. `onUnmount` → cleanup all listeners

## Testing Considerations

1. Click image → handles appear
2. Click outside → handles disappear
3. Drag corner handle → aspect ratio maintained
4. Drag edge handle → single dimension changes
5. Resize to minimum (50px) → stops at 50px
6. Resize to maximum → stops at container/original width
7. Resize persists after deselect
8. Undo/redo preserves resize
9. Escape cancels resize
10. Rapid click (no drag) → click behavior, not resize
