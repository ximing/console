# Blog Image Resize Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-to-resize handles to images in the Tiptap blog editor with aspect ratio locking.

**Architecture:** Extend the existing `CustomImage` Tiptap extension with a React NodeView that renders resize handles when the image is selected. The handles allow dragging to resize while maintaining aspect ratio.

**Tech Stack:** Tiptap, React, TypeScript, @rabjs/react (for view pattern)

---

## File Structure

```
apps/web/src/pages/blogs/editor/
├── extensions/
│   └── custom-image.ts           # MODIFY: Add NodeView and width/height attributes
└── components/
    └── image-resizer.tsx          # CREATE: NodeView component with resize handles

apps/web/src/pages/blogs/editor/tiptap.config.ts  # NO CHANGES NEEDED - already uses CustomImage
```

---

## Chunk 1: Create ImageResizer NodeView Component

**Files:**
- Create: `apps/web/src/pages/blogs/editor/components/image-resizer.tsx`
- Test: Manual testing in browser

- [ ] **Step 1: Create the ImageResizer NodeView component**

```tsx
import { NodeViewWrapper } from '@tiptap/react';
import { useEffect, useState, useRef, useCallback } from 'react';

interface ImageResizerProps {
  node: {
    attrs: {
      path: string;
      alt: string | null;
      title: string | null;
      width: number | null;
      height: number | null;
    };
  };
  selected: boolean;
  updateAttributes: (attrs: Record<string, number | null>) => void;
}

type HandlePosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface ResizeState {
  isResizing: boolean;
  startPos: { x: number; y: number };
  startDim: { width: number; height: number };
  aspectRatio: number;
  handle: HandlePosition | null;
  totalMovement: number;
}

export const ImageResizer = NodeViewWrapper<ImageResizerProps>(({ node, selected, updateAttributes }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    startPos: { x: 0, y: 0 },
    startDim: { width: 0, height: 0 },
    aspectRatio: 1,
    handle: null,
    totalMovement: 0,
  });

  const [localDimensions, setLocalDimensions] = useState<{ width: number; height: number } | null>(null);

  // Reset local dimensions when selection changes
  useEffect(() => {
    if (!selected) {
      setLocalDimensions(null);
      setResizeState(prev => ({ ...prev, isResizing: false, handle: null }));
    }
  }, [selected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Use refs for values accessed in callbacks to avoid dependency issues
  const nodeAttrsRef = useRef({ width: node.attrs.width, height: node.attrs.height });
  const updateAttrsRef = useRef(updateAttributes);
  const localDimRef = useRef(localDimensions);

  // Keep refs in sync
  useEffect(() => {
    nodeAttrsRef.current = { width: node.attrs.width, height: node.attrs.height };
  }, [node.attrs.width, node.attrs.height]);
  useEffect(() => {
    updateAttrsRef.current = updateAttributes;
  }, [updateAttributes]);
  useEffect(() => {
    localDimRef.current = localDimensions;
  }, [localDimensions]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: HandlePosition) => {
      e.preventDefault();
      e.stopPropagation();

      const img = imgRef.current;
      if (!img) return;

      // Get current dimensions - use refs to avoid stale closures
      const currentWidth = localDimRef.current?.width ?? nodeAttrsRef.current.width ?? img.naturalWidth ?? img.getBoundingClientRect().width;
      const currentHeight = localDimRef.current?.height ?? nodeAttrsRef.current.height ?? img.naturalHeight ?? img.getBoundingClientRect().height;

      // Guard against division by zero
      const safeHeight = currentHeight || currentWidth || 1;
      const aspectRatio = currentWidth / safeHeight;

      setResizeState({
        isResizing: true,
        startPos: { x: e.clientX, y: e.clientY },
        startDim: { width: currentWidth, height: currentHeight },
        aspectRatio,
        handle,
        totalMovement: 0,
      });

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [] // No deps - uses refs
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      setResizeState(prev => {
        if (!prev.isResizing || !prev.handle) return prev;

        const deltaX = e.clientX - prev.startPos.x;
        const deltaY = e.clientY - prev.startPos.y;
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const { startDim, aspectRatio, handle } = prev;

        let newWidth = startDim.width;
        let newHeight = startDim.height;

        // Calculate new dimensions based on handle position
        switch (handle) {
          case 'top-left':
          case 'top-right':
          case 'bottom-left':
          case 'bottom-right': {
            const absDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            newWidth = startDim.width + (handle.includes('right') ? absDelta : -absDelta);
            newHeight = newWidth / aspectRatio;
            break;
          }
          case 'top-center':
          case 'bottom-center': {
            newHeight = startDim.height + (handle === 'bottom-center' ? deltaY : -deltaY);
            newWidth = newHeight * aspectRatio;
            break;
          }
          case 'middle-left':
          case 'middle-right': {
            newWidth = startDim.width + (handle === 'middle-right' ? deltaX : -deltaX);
            newHeight = newWidth / aspectRatio;
            break;
          }
        }

        // Clamp dimensions
        const minSize = 50;
        const maxSize = 2000;
        const img = imgRef.current;
        const naturalWidth = img?.naturalWidth ?? maxSize;
        const maxAllowed = Math.min(maxSize, naturalWidth);

        newWidth = Math.max(minSize, Math.min(maxAllowed, newWidth));
        newHeight = Math.max(minSize, Math.min(maxAllowed, newHeight));

        setLocalDimensions({ width: Math.round(newWidth), height: Math.round(newHeight) });

        return { ...prev, totalMovement };
      });
    },
    [] // No deps - uses functional update
  );

  const handleMouseUp = useCallback(() => {
    setResizeState(prev => {
      if (!prev.isResizing) return prev;

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Only persist if there was actual movement (>= 3px)
      if (localDimRef.current && prev.totalMovement >= 3) {
        updateAttrsRef.current({
          width: localDimRef.current.width,
          height: localDimRef.current.height,
        });
      } else if (prev.totalMovement < 3) {
        // Reset if no meaningful resize occurred
        setLocalDimensions(null);
      }

      return { ...prev, isResizing: false, handle: null, totalMovement: 0 };
    });
  }, []); // No deps - uses functional update and refs

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && resizeState.isResizing) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        setLocalDimensions(null);
        setResizeState(prev => ({ ...prev, isResizing: false, handle: null, totalMovement: 0 }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [resizeState.isResizing]); // Only depends on isResizing

  const currentWidth = localDimensions?.width ?? node.attrs.width;
  const currentHeight = localDimensions?.height ?? node.attrs.height;

  const handleClasses: Record<HandlePosition, string> = {
    'top-left': 'image-resizer-handle top-left',
    'top-center': 'image-resizer-handle top-center',
    'top-right': 'image-resizer-handle top-right',
    'middle-left': 'image-resizer-handle middle-left',
    'middle-right': 'image-resizer-handle middle-right',
    'bottom-left': 'image-resizer-handle bottom-left',
    'bottom-center': 'image-resizer-handle bottom-center',
    'bottom-right': 'image-resizer-handle bottom-right',
  };

  const handleCursors: Record<HandlePosition, string> = {
    'top-left': 'nwse-resize',
    'top-center': 'ns-resize',
    'top-right': 'nesw-resize',
    'middle-left': 'ew-resize',
    'middle-right': 'ew-resize',
    'bottom-left': 'nesw-resize',
    'bottom-center': 'ns-resize',
    'bottom-right': 'nwse-resize',
  };

  const handles: HandlePosition[] = [
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ];

  return (
    <NodeViewWrapper>
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          width: currentWidth ? `${currentWidth}px` : undefined,
          height: currentHeight ? `${currentHeight}px` : undefined,
        }}
      >
        <img
          ref={imgRef}
          src={node.attrs.path}
          alt={node.attrs.alt ?? ''}
          title={node.attrs.title ?? undefined}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          data-path={node.attrs.path}
        />
        {selected && (
          <div className="image-resizer-overlay">
            {handles.map(handle => (
              <div
                key={handle}
                className={handleClasses[handle]}
                style={{ cursor: handleCursors[handle] }}
                onMouseDown={e => handleMouseDown(e, handle)}
              />
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
});
```

- [ ] **Step 2: Create CSS styles for the resize handles**

Add to `apps/web/src/pages/blogs/editor/components/image-resizer.css`:

```css
/* Overlay container */
.image-resizer-overlay {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 10;
  outline: 1px dashed #333;
}

/* Individual handle styling */
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

- [ ] **Step 3: Import CSS in the component file**

Add at the top of `image-resizer.tsx`:
```tsx
import './image-resizer.css';
```

- [ ] **Step 4: Test manually**

Run the app and:
1. Insert an image into the blog editor
2. Click on the image - verify handles appear
3. Click outside - verify handles disappear
4. Drag corner handles - verify aspect ratio is maintained
5. Drag edge handles - verify single dimension changes

---

## Chunk 2: Integrate ImageResizer with CustomImage Extension

**Files:**
- Modify: `apps/web/src/pages/blogs/editor/extensions/custom-image.ts`
- Test: Manual testing + verify undo/redo works

- [ ] **Step 1: Add ReactNodeViewRenderer to CustomImage extension**

Modify `custom-image.ts`:

```typescript
import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageResizer } from '../components/image-resizer';

export interface CustomImageOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: (options: { path: string; alt?: string; title?: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

export const CustomImage = Node.create<CustomImageOptions>({
  name: 'customImage',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      path: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('data-width') ? Number(element.getAttribute('data-width')) : null,
        renderHTML: attributes => attributes.width ? { 'data-width': attributes.width } : {},
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('data-height') ? Number(element.getAttribute('data-height')) : null,
        renderHTML: attributes => attributes.height ? { 'data-height': attributes.height } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-path]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-path': HTMLAttributes.path,
        'data-width': HTMLAttributes.width,
        'data-height': HTMLAttributes.height,
        alt: HTMLAttributes.alt,
        title: HTMLAttributes.title,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageResizer);
  },

  addCommands() {
    return {
      setCustomImage:
        (options: { path: string; alt?: string; title?: string; width?: number; height?: number }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
```

- [ ] **Step 2: Verify the extension compiles**

Run: `pnpm typecheck --filter @x-console/web`
Expected: No TypeScript errors

- [ ] **Step 3: Test resize with undo/redo**

1. Insert an image
2. Resize it
3. Press Ctrl+Z to undo
4. Verify image returns to original size
5. Press Ctrl-Y to redo
6. Verify resize is reapplied

---

## Chunk 3: Final Integration and Testing

**Files:**
- Review: `apps/web/src/pages/blogs/editor/tiptap.config.ts`
- Test: Full workflow

- [ ] **Step 1: Verify tiptap.config.ts integration**

The existing config already uses `CustomImage`. No changes needed:

```typescript
// Already configured:
const imageExtensions = CustomImage.configure({
  HTMLAttributes: {
    class: 'max-w-full h-auto',
  },
});
```

- [ ] **Step 2: Full workflow test**

1. Open blog editor
2. Insert multiple images
3. Resize each image independently
4. Verify clicking one image only shows its handles
5. Verify clicking outside hides handles
6. Verify undo/redo works for all images
7. Save and refresh - verify dimensions persist
8. Copy/paste image - verify dimensions preserved

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/editor/components/image-resizer.tsx apps/web/src/pages/blogs/editor/components/image-resizer.css apps/web/src/pages/blogs/editor/extensions/custom-image.ts
git commit -m "feat(blogs): add drag-to-resize handles for images

- Add ImageResizer NodeView component with 8 resize handles
- Extend CustomImage with NodeView renderer
- Aspect ratio locked during resize
- Min size: 50px, Max size: natural dimensions
- Escape cancels resize, Ctrl+Z/Y undo/redo works

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Chunk | Tasks | Files Changed |
|-------|-------|---------------|
| 1 | Create ImageResizer NodeView component with resize handles | `image-resizer.tsx`, `image-resizer.css` (new) |
| 2 | Integrate with CustomImage extension | `custom-image.ts` |
| 3 | Final integration and testing | None (verification only) |
