import { NodeViewWrapper } from '@tiptap/react';
import { useState, useEffect } from 'react';

interface CustomImageNodeViewProps {
  node: {
    attrs: {
      path?: string;
      alt?: string;
      title?: string;
      width?: number;
      height?: number;
    };
  };
}

export function CustomImageNodeView({ node }: CustomImageNodeViewProps) {
  console.log('CustomImageNodeView render, node.attrs:', node.attrs);

  const path = node.attrs?.path;
  const alt = node.attrs?.alt;
  const title = node.attrs?.title;
  const width = node.attrs?.width;
  const height = node.attrs?.height;

  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      console.log('No path provided');
      setLoading(false);
      setFetchError('No path');
      return;
    }

    setLoading(true);
    setFetchError(null);

    const url = `/api/v1/blogs/media/url?path=${encodeURIComponent(path)}`;
    console.log('Fetching URL:', url);

    fetch(url, { credentials: 'include' })
      .then((res) => {
        console.log('Fetch response status:', res.status);
        return res.json();
      })
      .then((data) => {
        console.log('Image URL response:', data);
        if (data.code === 0 && data.data?.url) {
          setUrl(data.data.url);
        } else {
          setFetchError(data.msg || 'Failed to get URL');
        }
      })
      .catch((err) => {
        console.error('Image URL error:', err);
        setFetchError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [path]);

  // Error state
  if (fetchError) {
    return (
      <NodeViewWrapper>
        <div
          className="bg-red-100 dark:bg-red-900/20 flex items-center justify-center p-4"
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

  // Loading state
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
          <span className="text-gray-400 text-sm">{loading ? 'Loading...' : 'Waiting...'}</span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Success state
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
