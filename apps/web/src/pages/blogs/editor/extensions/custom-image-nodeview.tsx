import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useState, useEffect } from 'react';

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
}

export function CustomImageNodeView({ node }: CustomImageNodeViewProps) {
  const { path, alt, title, width, height } = node.attrs;
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) return;

    setLoading(true);
    setError(false);

    fetch(`/api/v1/blogs/media/url?path=${encodeURIComponent(path)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0 && data.data?.url) {
          setUrl(data.data.url);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [path]);

  if (loading || !url) {
    return (
      <NodeViewWrapper>
        <div
          className="bg-gray-200 dark:bg-dark-700 animate-pulse flex items-center justify-center"
          style={{
            width: width || '100%',
            height: height || 200,
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
        <div
          className="bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
          style={{
            width: width || '100%',
            height: height || 200,
          }}
        >
          <span className="text-red-500 text-sm">Failed to load image</span>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <img
        src={url}
        alt={alt || ''}
        title={title}
        width={width}
        height={height}
        className="max-w-full h-auto"
        draggable={true}
      />
    </NodeViewWrapper>
  );
}
