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

#### Custom Image Extension with NodeView and Attributes
Create `image-with-resize.ts` that extends TiptapImage with a NodeView for resize handles and explicit width/height attributes:
```typescript
import TiptapImage from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageResizer } from '../components/image-resizer';

export const ImageWithResize = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width') || null,
        renderHTML: attributes => attributes.width ? { width: attributes.width } : {},
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height') || null,
        renderHTML: attributes => attributes.height ? { height: attributes.height } : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageResizer);
  },
});
```

**Note:** The `width` and `height` attributes default to `null`, meaning images render at their natural size until resized.

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
   - Store initial image dimensions from `getBoundingClientRect()`
   - Calculate aspect ratio = width / height
   - If image has `naturalWidth`/`naturalHeight`, store those as max bounds

2. **On document mousemove**:
   - Calculate deltaX and deltaY from start position
   - For corner handles: use the larger delta to determine new width, then calculate height
   - For edge handles: update only the corresponding dimension
   - Clamp: min 50px, max = min(contentContainerWidth, naturalWidth or currentWidth)
   - Apply aspect ratio: height = width / aspectRatio

3. **On document mouseup**:
   - Update the Tiptap node with `width` and `height` attributes
   - Remove document-level event listeners

#### Aspect Ratio Initialization
- On first handle mousedown, if image has no explicit width/height set:
  - Wait for `img.naturalWidth` to be available (may need to wait for `onload`)
  - If natural dimensions not yet available, use `img.getBoundingClientRect()` as fallback
  - Store aspect ratio for the duration of the resize operation

#### Click vs Drag Distinction
- If total mouse movement < 3px on mouseup, treat as click (deselect)
- If movement >= 3px, treat as resize and persist dimensions

### Edge Cases

| Case | Handling |
|------|----------|
| Animated GIFs | Allow resize on GIFs; animation continues at new size |
| Images without width/height | On first handle mousedown, wait for `img.onload` if needed, else use `getBoundingClientRect()` |
| Images at container max | Cap resize at the editor's content container width (`editor.view.dom.offsetWidth`) |
| Images with float | Overlay renders but float layout may cause positioning issues; do not apply resize to floated images in v1 |
| Resize cancelled (Escape) | Rollback to original dimensions, deselect |
| Touch/mobile | Not in initial scope; handles are desktop-only |
| Keyboard accessibility | Not in initial scope |
| Images inside links | Resize the image, link remains intact |
| Memory leaks | All document listeners removed on mouseup or component unmount |
| Undo/redo | Dimensions stored in node attributes, naturally supported by ProseMirror |
| Copy/paste | Width/height attributes preserved via parseHTML/renderHTML |

### Style Isolation
The resize overlay styles should use a unique prefix. Handles are positioned at the image corners and edges, not extending beyond:
```css
/* Overlay container - positions itself relative to the image via CSS class on the img */
.image-resizer-overlay {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 10;
  outline: 1px dashed #333;
}

/* Individual handle styling - positioned at corners and edges */
.image-resizer-handle {
  pointer-events: auto;
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border: 1px solid #333;
  box-sizing: border-box;
}

/* Handle positions */
.image-resizer-handle.top-left { top: -5px; left: -5px; cursor: nwse-resize; }
.image-resizer-handle.top-center { top: -5px; left: calc(50% - 5px); cursor: ns-resize; }
.image-resizer-handle.top-right { top: -5px; right: -5px; cursor: nesw-resize; }
.image-resizer-handle.middle-left { top: calc(50% - 5px); left: -5px; cursor: ew-resize; }
.image-resizer-handle.middle-right { top: calc(50% - 5px); right: -5px; cursor: ew-resize; }
.image-resizer-handle.bottom-left { bottom: -5px; left: -5px; cursor: nesw-resize; }
.image-resizer-handle.bottom-center { bottom: -5px; left: calc(50% - 5px); cursor: ns-resize; }
.image-resizer-handle.bottom-right { bottom: -5px; right: -5px; cursor: nwse-resize; }
```

**Note:** Handles extend 5px outside the image bounds (from -5px to +5px) so they're easily clickable.

**CSS Scope:** Do NOT apply global `position: relative` to all images. Instead, the NodeView wrapper applies `position: relative` to the image via inline style or a scoped class when the image is selected.

## Component Specs

### ImageResizer NodeView

**Props (Tiptap NodeView props):**
- `node`: ProseMirror Node
- `selected`: boolean
- `updateAttributes`: (attrs: object) => void
- `editor`: Tiptap Editor instance (available via context or passed as prop)

**Accessing Editor in NodeView:**
The NodeView can access the editor instance via `useEditor` hook from `@tiptap/react` since the editor context is available. Alternatively, the extension can pass the editor via `ReactNodeViewRenderer` options.

**Local State:**
- `isResizing`: boolean
- `startPos`: { x: number, y: number }
- `startDim`: { width: number, height: number }
- `aspectRatio`: number | null

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
