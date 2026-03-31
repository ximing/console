// apps/server/src/config/upload.config.ts

export const MEDIA_UPLOAD_LIMITS = {
  image: {
    maxSize: 100 * 1024 * 1024, // 100MB
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
  },
  audio: {
    maxSize: 300 * 1024 * 1024, // 300MB
    mimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/flac',
    ],
  },
  video: {
    maxSize: 500 * 1024 * 1024, // 500MB
    mimeTypes: [
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ],
  },
} as const;

export const BLOG_MEDIA_PREFIX = 'blogs/media';
