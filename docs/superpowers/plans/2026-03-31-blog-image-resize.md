# Blog Image Resize Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-to-resize handles to images in the Tiptap blog editor with aspect ratio locking.

**Architecture:** Modify the existing `CustomImageNodeView` component to add resize handles when the image is selected. The existing URL fetching logic is preserved.

**Tech Stack:** Tiptap, React, TypeScript

---

## File Structure

```
apps/web/src/pages/blogs/editor/extensions/
└── custom-image-nodeview.tsx    # MODIFY: Add resize handles to existing NodeView
    custom-image.ts              # NO CHANGES NEEDED - already has NodeView renderer
```

---

## Chunk 1: Add Resize Handles to CustomImageNodeView

**Files:**
- Modify: `apps/web/src/pages/blogs/editor/extensions/custom-image-nodeview.tsx`
- Test: Manual testing in browser

- [ ] **Step 1: Read the existing CustomImageNodeView to understand its structure**

The existing component:
- Fetches image URL from `/api/v1/blogs/media/url?path=...`
- Shows loading/error states
- Renders `<img>` with URL fetched from API

- [ ] **Step 2: Add resize state and refs to CustomImageNodeView**

Modify `custom-image-nodeview.tsx`. Add the following imports and interface:

```tsx
import { NodeViewWrapper } from '@tiptap/react';
import { useState, useEffect, useRef, useCallback } from 'react';

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
```

- [ ] **Step 3: Add resize state to the component**

Modify the component function signature to receive `selected` prop and add state:

```tsx
interface CustomImageNodeViewProps {
  node: {
    attrs: {
      path: string;
      alt?: string;
      title?: string;
      width?: number;
      height?: number;
    };
  };
  selected: boolean;  // Add this - Tiptap provides it
  updateAttributes: (attrs: Record<string, number | null>) => void;  // Add this
}

export function CustomImageNodeView({ node, selected, updateAttributes }: CustomImageNodeViewProps) {
  const { path, alt, title, width, height } = node.attrs;
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Resize state
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
```

- [ ] **Step 4: Add resize refs, callbacks, and effects**

Add ALL of the following after the existing `useEffect` for URL fetching, in this exact order:

```tsx
  // imgRef already declared in Step 3

  // Refs for values accessed in callbacks to avoid stale closures
  const updateAttrsRef = useRef(updateAttributes);
  const localDimRef = useRef(localDimensions);

  // Keep refs in sync when values change
  useEffect(() => {
    updateAttrsRef.current = updateAttributes;
  }, [updateAttributes]);

  useEffect(() => {
    localDimRef.current = localDimensions;
  }, [localDimensions]);

  // Resize event handlers stored in refs (initialized once)
  const handleMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const handleMouseUpRef = useRef<(() => void) | null>(null);

  // Initialize handlers on first render
  if (!handleMouseMoveRef.current) {
    handleMouseMoveRef.current = (e: MouseEvent) => {
      setResizeState(prev => {
        if (!prev.isResizing || !prev.handle) return prev;

        const deltaX = e.clientX - prev.startPos.x;
        const deltaY = e.clientY - prev.startPos.y;
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const { startDim, aspectRatio, handle } = prev;

        let newWidth = startDim.width;
        let newHeight = startDim.height;

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
    };

    handleMouseUpRef.current = () => {
      setResizeState(prev => {
        if (!prev.isResizing) return prev;

        document.removeEventListener('mousemove', handleMouseMoveRef.current!);
        document.removeEventListener('mouseup', handleMouseUpRef.current!);

        if (localDimRef.current && prev.totalMovement >= 3) {
          updateAttrsRef.current({
            width: localDimRef.current.width,
            height: localDimRef.current.height,
          });
        } else if (prev.totalMovement < 3) {
          setLocalDimensions(null);
        }

        return { ...prev, isResizing: false, handle: null, totalMovement: 0 };
      });
    };
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: HandlePosition) => {
      e.preventDefault();
      e.stopPropagation();

      const img = imgRef.current;
      if (!img) return;

      // Get current dimensions
      const currentWidth = localDimRef.current?.width ?? width ?? img.naturalWidth ?? img.getBoundingClientRect().width;
      const currentHeight = localDimRef.current?.height ?? height ?? img.naturalHeight ?? img.getBoundingClientRect().height;

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

      document.addEventListener('mousemove', handleMouseMoveRef.current!);
      document.addEventListener('mouseup', handleMouseUpRef.current!);
    },
    [width, height]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveRef.current!);
      document.removeEventListener('mouseup', handleMouseUpRef.current!);
    };
  }, []);

  // Reset local dimensions when selection changes
  useEffect(() => {
    if (!selected) {
      setLocalDimensions(null);
      setResizeState(prev => ({ ...prev, isResizing: false, handle: null, totalMovement: 0 }));
    }
  }, [selected]);

  // Handle escape key - depends only on isResizing boolean
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && resizeState.isResizing) {
        document.removeEventListener('mousemove', handleMouseMoveRef.current!);
        document.removeEventListener('mouseup', handleMouseUpRef.current!);
        setLocalDimensions(null);
        setResizeState(prev => ({ ...prev, isResizing: false, handle: null, totalMovement: 0 }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [resizeState.isResizing]);
```

- [ ] **Step 5: Add CSS styles for resize handles**

Add this CSS block to the file or to a CSS file imported by the component:

```tsx
// Add as a style tag in the component or import from CSS file
const resizeStyles = `
  .image-resizer-overlay {
    pointer-events: none;
    position: absolute;
    inset: 0;
    z-index: 10;
    outline: 1px dashed #333;
  }

  .image-resizer-handle {
    pointer-events: auto;
    position: absolute;
    width: 10px;
    height: 10px;
    background: white;
    border: 1px solid #333;
    box-sizing: border-box;
  }

  .image-resizer-handle.top-left { top: -5px; left: -5px; cursor: nwse-resize; }
  .image-resizer-handle.top-center { top: -5px; left: calc(50% - 5px); cursor: ns-resize; }
  .image-resizer-handle.top-right { top: -5px; right: -5px; cursor: nesw-resize; }
  .image-resizer-handle.middle-left { top: calc(50% - 5px); left: -5px; cursor: ew-resize; }
  .image-resizer-handle.middle-right { top: calc(50% - 5px); right: -5px; cursor: ew-resize; }
  .image-resizer-handle.bottom-left { bottom: -5px; left: -5px; cursor: nesw-resize; }
  .image-resizer-handle.bottom-center { bottom: -5px; left: calc(50% - 5px); cursor: ns-resize; }
  .image-resizer-handle.bottom-right { bottom: -5px; right: -5px; cursor: nwse-resize; }
`;
```

- [ ] **Step 6: Update the image render section**

Replace the existing `<img>` render with:

```tsx
  const currentWidth = localDimensions?.width ?? width;
  const currentHeight = localDimensions?.height ?? height;

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

  const handles: HandlePosition[] = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right',
  ];

  if (loading || !url) {
    return (
      <NodeViewWrapper>
        <style>{resizeStyles}</style>
        <div
          className="bg-gray-200 dark:bg-dark-700 animate-pulse flex items-center justify-center"
          style={{
            width: currentWidth || '100%',
            height: currentHeight || 200,
            maxWidth: '100%',
          }}
        >
          <span className="text-gray-400 text-sm">{loading ? 'Loading...' : 'Error'}</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (error) {
    return (
      <NodeViewWrapper>
        <style>{resizeStyles}</style>
        <div
          className="bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
          style={{
            width: currentWidth || '100%',
            height: currentHeight || 200,
          }}
        >
          <span className="text-red-500 text-sm">Failed to load image</span>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <style>{resizeStyles}</style>
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
          src={url}
          alt={alt || ''}
          title={title}
          width={currentWidth}
          height={currentHeight}
          className="max-w-full h-auto"
          draggable={true}
        />
        {selected && (
          <div className="image-resizer-overlay">
            {handles.map(handle => (
              <div
                key={handle}
                className={handleClasses[handle]}
                onMouseDown={e => handleMouseDown(e, handle)}
              />
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
```

- [ ] **Step 7: Test manually**

Run the app and:
1. Insert an image into the blog editor
2. Click on the image - verify handles appear
3. Click outside - verify handles disappear
4. Drag corner handles - verify aspect ratio is maintained
5. Drag edge handles - verify single dimension changes
6. Verify the loading state still works
7. Verify the error state still works

---

## Chunk 2: Integration and Edge Cases

**Files:**
- None - verify existing integration

- [ ] **Step 1: Verify tiptap.config.ts doesn't need changes**

The existing config already uses `CustomImage` which has `addNodeView()`. No changes needed.

- [ ] **Step 2: Test undo/redo**

1. Insert an image
2. Resize it
3. Press Ctrl+Z to undo - verify image returns to original size
4. Press Ctrl+Y to redo - verify resize is reapplied

- [ ] **Step 3: Test edge cases**

1. Insert image without dimensions - verify natural size used
2. Resize to very small (below 50px) - verify stops at 50px
3. Resize very large - verify doesn't exceed natural size
4. Press Escape during resize - verify cancelled
5. Click image (no drag) - verify no resize persisted
6. Refresh page - verify dimensions persist

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/blogs/editor/extensions/custom-image-nodeview.tsx
git commit -m "feat(blogs): add drag-to-resize handles for images

- Add resize handles (8 points) to CustomImageNodeView
- Aspect ratio locked during resize
- Min size: 50px, Max size: natural dimensions
- Escape cancels resize, Ctrl+Z/Y undo/redo works
- Loading/error states preserved

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Chunk | Tasks | Files Changed |
|-------|-------|---------------|
| 1 | Add resize handles to CustomImageNodeView | `custom-image-nodeview.tsx` |
| 2 | Integration and edge case testing | None (verification only) |
