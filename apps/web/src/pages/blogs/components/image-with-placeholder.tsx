import { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';

interface ImageWithPlaceholderProps {
  path: string;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
}

export function ImageWithPlaceholder({
  path,
  width,
  height,
  alt = '',
  className = '',
}: ImageWithPlaceholderProps) {
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Fetch presigned URL when path changes
  useEffect(() => {
    if (!path) return;

    setLoading(true);
    setError(false);

    fetch(`/api/v1/blogs/media/url?path=${encodeURIComponent(path)}`)
      .then((res) => res.json())
      .then((data) => {
        console.log('ImageWithPlaceholder response:', data);
        if (data.code === 0 && data.data?.url) {
          setUrl(data.data.url);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.error('ImageWithPlaceholder error:', err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [path]);

  // Calculate aspect ratio for skeleton
  const aspectRatio = width && height ? width / height : undefined;

  if (loading || !url) {
    return (
      <div
        className={`bg-gray-200 dark:bg-dark-700 animate-pulse flex items-center justify-center ${className}`}
        style={
          aspectRatio
            ? { aspectRatio: `${width}/${height}` }
            : { height: height || 200 }
        }
      >
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-red-100 dark:bg-red-900/20 flex items-center justify-center ${className}`}
        style={{ height: height || 200 }}
      >
        <span className="text-red-500 text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
    />
  );
}
