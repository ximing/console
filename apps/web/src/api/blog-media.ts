import axios from 'axios';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

export interface MediaUploadResponse {
  url: string;
  filename: string;
  size: number;
  type: 'image' | 'audio' | 'video';
}

export interface MediaUploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

export type UploadProgressCallback = (progress: MediaUploadProgress) => void;

/**
 * Upload media file with progress tracking
 */
export async function uploadMedia(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<ApiResponse<MediaUploadResponse>>(
    '/api/v1/blogs/media/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress({
            percent: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            loaded: progressEvent.loaded,
            total: progressEvent.total,
          });
        }
      },
    }
  );

  return response.data.data;
}

/**
 * Validate file before upload (client-side check)
 */
export function validateMediaFile(
  file: File
): { valid: boolean; error?: string } {
  const IMAGE_MAX_SIZE = 100 * 1024 * 1024; // 100MB
  const AUDIO_MAX_SIZE = 300 * 1024 * 1024; // 300MB
  const VIDEO_MAX_SIZE = 500 * 1024 * 1024; // 500MB

  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac'];
  const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

  if (file.type.startsWith('image/')) {
    if (!IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: 'Unsupported image format' };
    }
    if (file.size > IMAGE_MAX_SIZE) {
      return { valid: false, error: 'Image size exceeds 100MB limit' };
    }
  } else if (file.type.startsWith('audio/')) {
    if (!AUDIO_TYPES.includes(file.type)) {
      return { valid: false, error: 'Unsupported audio format' };
    }
    if (file.size > AUDIO_MAX_SIZE) {
      return { valid: false, error: 'Audio size exceeds 300MB limit' };
    }
  } else if (file.type.startsWith('video/')) {
    if (!VIDEO_TYPES.includes(file.type)) {
      return { valid: false, error: 'Unsupported video format' };
    }
    if (file.size > VIDEO_MAX_SIZE) {
      return { valid: false, error: 'Video size exceeds 500MB limit' };
    }
  } else {
    return { valid: false, error: 'Unsupported file type' };
  }

  return { valid: true };
}
