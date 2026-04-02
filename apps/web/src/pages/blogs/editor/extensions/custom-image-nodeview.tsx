import { NodeViewWrapper } from '@tiptap/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { isTempPath } from '../../../../utils/editor';

type HandlePosition = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ResizeState {
  isResizing: boolean;
  startPos: { x: number; y: number };
  startDim: { width: number; height: number };
  aspectRatio: number;
  handle: HandlePosition | null;
}

interface CustomImageNodeViewProps {
  node: {
    attrs: {
      path?: string;
      alt?: string;
      title?: string;
      width?: number;
      height?: number;
      uploadStatus?: string | null;
    };
  };
  selected: boolean;
  updateAttributes: (attrs: Record<string, number | string | null>) => void;
}

export function CustomImageNodeView({ node, selected, updateAttributes }: CustomImageNodeViewProps) {
  const path = node.attrs?.path;
  const alt = node.attrs?.alt;
  const title = node.attrs?.title;
  const width = node.attrs?.width;
  const height = node.attrs?.height;
  const uploadStatus = node.attrs?.uploadStatus;

  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Check if this is a placeholder (temp path or uploading status)
  const isPlaceholder = isTempPath(path) || uploadStatus === 'uploading';

  const imgRef = useRef<HTMLImageElement>(null);
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    startPos: { x: 0, y: 0 },
    startDim: { width: 0, height: 0 },
    aspectRatio: 1,
    handle: null,
  });
  const [localDimensions, setLocalDimensions] = useState<{ width: number; height: number } | null>(null);

  // Refs for event handlers to avoid stale closures
  const resizeStateRef = useRef(resizeState);
  resizeStateRef.current = resizeState;

  // Use ref for local dimensions during drag to avoid recreating handleMouseMove
  const localDimensionsRef = useRef(localDimensions);

  // Keep ref in sync with state
  useEffect(() => {
    localDimensionsRef.current = localDimensions;
  }, [localDimensions]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const state = resizeStateRef.current;
    if (!state.isResizing || !state.handle) return;

    const deltaX = e.clientX - state.startPos.x;
    const deltaY = e.clientY - state.startPos.y;

    let newWidth = state.startDim.width;
    let newHeight = state.startDim.height;

    // Calculate movement based on handle position
    switch (state.handle) {
      case 'top-left':
        newWidth = state.startDim.width - deltaX;
        newHeight = state.startDim.height - deltaY;
        break;
      case 'top-center':
        newHeight = state.startDim.height - deltaY;
        break;
      case 'top-right':
        newWidth = state.startDim.width + deltaX;
        newHeight = state.startDim.height - deltaY;
        break;
      case 'middle-left':
        newWidth = state.startDim.width - deltaX;
        break;
      case 'middle-right':
        newWidth = state.startDim.width + deltaX;
        break;
      case 'bottom-left':
        newWidth = state.startDim.width - deltaX;
        newHeight = state.startDim.height + deltaY;
        break;
      case 'bottom-center':
        newHeight = state.startDim.height + deltaY;
        break;
      case 'bottom-right':
        newWidth = state.startDim.width + deltaX;
        newHeight = state.startDim.height + deltaY;
        break;
    }

    // Apply minimum constraints
    newWidth = Math.max(50, newWidth);
    newHeight = Math.max(50, newHeight);

    // Apply aspect ratio locking based on handle type
    const aspectRatio = state.aspectRatio;
    const isCornerHandle = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(state.handle!);
    const isVerticalEdge = ['top-center', 'bottom-center'].includes(state.handle!);
    const isHorizontalEdge = ['middle-left', 'middle-right'].includes(state.handle!);

    if (isCornerHandle) {
      // For corner handles, use aspect ratio to constrain the secondary dimension
      newHeight = newWidth / aspectRatio;
    } else if (isVerticalEdge) {
      // top-center, bottom-center: constrain width based on height
      newWidth = newHeight * aspectRatio;
    } else if (isHorizontalEdge) {
      // middle-left, middle-right: constrain height based on width
      newHeight = newWidth / aspectRatio;
    }

    // Apply minimum constraints again after aspect ratio correction
    newWidth = Math.max(50, newWidth);
    newHeight = Math.max(50, newHeight);

    localDimensionsRef.current = { width: newWidth, height: newHeight };
    setLocalDimensions({ width: newWidth, height: newHeight });
  }, []);

  const handleMouseUp = useCallback(() => {
    const state = resizeStateRef.current;
    if (!state.isResizing) return;

    const finalDimensions = localDimensionsRef.current;
    if (finalDimensions) {
      // Apply the final dimensions
      updateAttributes({
        width: Math.round(finalDimensions.width),
        height: Math.round(finalDimensions.height),
      });
    }

    setResizeState((prev) => ({
      ...prev,
      isResizing: false,
      handle: null,
    }));
    localDimensionsRef.current = null;
    setLocalDimensions(null);

    document.removeEventListener('mousemove', handleMouseMove);
    // eslint-disable-next-line react-hooks/immutability
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, updateAttributes]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: HandlePosition) => {
      e.preventDefault();
      e.stopPropagation();

      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      const currentWidth = localDimensions?.width ?? rect.width;
      const currentHeight = localDimensions?.height ?? rect.height;

      setResizeState({
        isResizing: true,
        startPos: { x: e.clientX, y: e.clientY },
        startDim: { width: currentWidth, height: currentHeight },
        aspectRatio: currentWidth / currentHeight,
        handle,
      });

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp, localDimensions]
  );

  const resizeStyles = `
    .image-resizer-wrapper {
      user-select: none;
      -webkit-user-select: none;
      position: relative !important;
    }
    .image-resizer-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 2px solid #3b82f6;
      pointer-events: none;
    }
    .image-resizer-handle {
      position: absolute;
      width: 12px;
      height: 12px;
      background: white;
      border: 2px solid #3b82f6;
      border-radius: 2px;
      pointer-events: auto;
      z-index: 10;
    }
    .image-resizer-handle.top-left { top: -6px; left: -6px; cursor: nwse-resize; }
    .image-resizer-handle.top-center { top: -6px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
    .image-resizer-handle.top-right { top: -6px; right: -6px; cursor: nesw-resize; }
    .image-resizer-handle.middle-left { top: 50%; left: -6px; transform: translateY(-50%); cursor: ew-resize; }
    .image-resizer-handle.middle-right { top: 50%; right: -6px; transform: translateY(-50%); cursor: ew-resize; }
    .image-resizer-handle.bottom-left { bottom: -6px; left: -6px; cursor: nesw-resize; }
    .image-resizer-handle.bottom-center { bottom: -6px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
    .image-resizer-handle.bottom-right { bottom: -6px; right: -6px; cursor: nwse-resize; }
  `;

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Reset local dimensions when selection is lost
  useEffect(() => {
    if (!selected) {
      setLocalDimensions(null);
      if (resizeStateRef.current.isResizing) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        setResizeState((prev) => ({
          ...prev,
          isResizing: false,
          handle: null,
        }));
      }
    }
  }, [selected, handleMouseMove, handleMouseUp]);

  // Handle Escape key to cancel resize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && resizeStateRef.current.isResizing) {
        setResizeState((prev) => ({
          ...prev,
          isResizing: false,
          handle: null,
        }));
        setLocalDimensions(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!path || isPlaceholder) {
      setLoading(false);
      setUrl(null);
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    const url = `/api/v1/blogs/media/url?path=${encodeURIComponent(path)}`;

    fetch(url, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.code === 0 && data.data?.url) {
          setUrl(data.data.url);
        } else {
          setFetchError(data.msg || 'Failed to get URL');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(err.message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, isPlaceholder]);

  // Error state
  if (fetchError) {
    return (
      <NodeViewWrapper>
        <style>{resizeStyles}</style>
        <div
          className="bg-red-100 dark:bg-red-900/20 flex items-center justify-center p-4 relative"
          style={{
            width: width || '100%',
            height: height || 200,
          }}
        >
          <span className="text-red-500 text-sm">Error: {fetchError}</span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Placeholder state (uploading or temp path)
  if (isPlaceholder) {
    return (
      <NodeViewWrapper>
        <style>{resizeStyles}</style>
        <div
          className="bg-gray-200 dark:bg-zinc-700 flex items-center justify-center relative border-2 border-dashed border-gray-400"
          style={{
            width: width || 300,
            height: height || 200,
            maxWidth: '100%',
          }}
        >
          <div className="text-center">
            <div className="animate-pulse mb-2">
              <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-gray-500 text-sm">上传中...</span>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loading state
  if (loading || !url) {
    return (
      <NodeViewWrapper>
        <style>{resizeStyles}</style>
        <div
          className="bg-gray-200 dark:bg-zinc-700 animate-pulse flex items-center justify-center relative"
          style={{
            width: width || '100%',
            height: height || 200,
            maxWidth: '100%',
          }}
        >
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      </NodeViewWrapper>
    );
  }

  const handlePositions: HandlePosition[] = [
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
      <style>{resizeStyles}</style>
      <div
        className="image-resizer-wrapper relative inline-block"
        style={{
          width: localDimensions?.width ?? (width ? `${width}px` : '100%'),
          height: localDimensions?.height ?? (height ? `${height}px` : 'auto'),
          maxWidth: '100%',
        }}
      >
        <img
          ref={imgRef}
          src={url}
          alt={alt || ''}
          title={title}
          width={localDimensions?.width ?? width}
          height={localDimensions?.height ?? height}
          className="max-w-full h-auto block"
          draggable={false}
          onMouseDown={e => e.stopPropagation()}
        />
        {selected && (
          <div className="image-resizer-overlay">
            {handlePositions.map((pos) => (
              <div
                key={pos}
                className={`image-resizer-handle ${pos}`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleMouseDown(e, pos);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
