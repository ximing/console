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
- Handles appear on image click
- Handles are hidden when clicking outside the image
- Handles are not shown for other media types (audio, video, tables)

## Technical Approach

### Architecture
Create a custom React component `ImageResizer` that:
1. Listens to Tiptap editor selection changes
2. When an image node is selected, renders an overlay with handles
3. Handles mouse drag events to calculate new dimensions
4. Updates the Tiptap image node with new width/height attributes

### File Structure
```
apps/web/src/pages/blogs/editor/
├── extensions/
│   └── image-resize.ts          # Custom image extension with resize attributes
├── components/
│   └── image-resizer.tsx         # React component for resize handles
```

### Key Implementation Details

#### Image Node Attributes
Extend TiptapImage with:
- `width`: number (current width in px)
- `height`: number (current height in px)
- `aspectRatio`: number (stored on initial render, used for locked resize)

#### Resize Logic
- On handle drag start: Store initial image dimensions and mouse position
- On drag: Calculate delta, apply to dimension opposite to drag direction (if corner) or direct dimension (if edge)
- Maintain aspect ratio: newHeight = newWidth / storedAspectRatio
- Clamp dimensions: Min 50px, Max container width
- On drag end: Update Tiptap node with final dimensions

#### Event Handling
- Handle mousedown: Prevent default, store start position
- Handle mousemove (document): Calculate new dimensions, update local state
- Handle mouseup (document): Call Tiptap command to update image attributes

### Edge Cases
- Images without explicit width/height: Use natural dimensions on first click, then enable resize
- Very small images: Minimum resize dimension is 50px
- Images at container max-width: Resize up to original or container, whichever is smaller
- Multiple images: Only one image shows handles at a time
- Click vs drag: Small movement (< 3px) on mouseup = click, not resize

## Component Specs

### ImageResizer Component

**Props:**
- `editor`: Tiptap Editor instance
- `image`: HTMLImageElement reference
- `onResizeEnd`: (width: number, height: number) => void

**States:**
- `isResizing`: boolean
- `startPos`: { x: number, y: number }
- `startDim`: { width: number, height: number }

**Render:**
- Returns null if no image selected
- Renders overlay div with 8 positioned handle divs
- Overlay has `pointer-events: none` except for handles
- Handles have `pointer-events: auto`

## Testing Considerations

1. Click image → handles appear
2. Click outside → handles disappear
3. Drag corner handle → aspect ratio maintained
4. Drag edge handle → single dimension changes
5. Drag to minimum (50px) → stops at 50px
6. Drag to maximum → stops at container/original width
7. Resize persists after deselect
8. Resize works with undo/redo
