# Blog Media Upload Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local file upload support (image/audio/video) to blog editor with progress feedback, and auto-embed external video links (YouTube, Bilibili, Douyin).

**Architecture:**
- Server: New `/api/v1/blogs/media/upload` endpoint using existing S3 storage via `StorageService.uploadFile()`
- Frontend: Toolbar buttons trigger `<input type="file">`, upload via axios with `onUploadProgress`, insert into TipTap editor
- External links: Custom TipTap extension detects URLs on paste and converts to embedded players

**Tech Stack:** TipTap, Axios, Multer, S3/MinIO, routing-controllers

---

## Chunk 1: Server - Media Upload Controller

**Files:**
- Create: `apps/server/src/controllers/v1/blog-media.controller.ts`
- Create: `apps/server/src/config/upload.config.ts`
- Modify: `apps/server/src/controllers/index.ts:15` (add BlogMediaController export)
- Reference: `apps/server/src/services/storage.service.ts` (existing `uploadFile` method)
- Reference: `apps/server/src/constants/error-codes.ts` (existing `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `FILE_UPLOAD_ERROR`)

### Task 1: Create upload configuration

**Files:**
- Create: `apps/server/src/config/upload.config.ts`

- [ ] **Step 1: Create upload config file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/config/upload.config.ts
git commit -m "feat(blogs): add media upload configuration"
```

### Task 2: Create BlogMediaController

**Files:**
- Create: `apps/server/src/controllers/v1/blog-media.controller.ts`

- [ ] **Step 1: Create blog media controller**

```typescript
// apps/server/src/controllers/v1/blog-media.controller.ts

import {
  JsonController,
  Post,
  CurrentUser,
  UploadedFile,
} from 'routing-controllers';
import { Service } from 'typedi';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';

import { ErrorCode } from '../../constants/error-codes.js';
import { StorageService } from '../../services/storage.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { MEDIA_UPLOAD_LIMITS, BLOG_MEDIA_PREFIX } from '../../config/upload.config.js';

import type { UserInfoDto } from '@x-console/dto';

// Configure multer for memory storage with no file size limit (we validate manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max (highest limit)
  },
});

type MediaType = 'image' | 'audio' | 'video';

function getMediaType(mimetype: string): MediaType | null {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  return null;
}

@Service()
@JsonController('/api/v1/blogs/media')
export class BlogMediaController {
  constructor(private storageService: StorageService) {}

  @Post('/upload')
  async uploadMedia(
    @CurrentUser() userDto: UserInfoDto,
    @UploadedFile('file', { options: upload }) file: Express.Multer.File
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!file) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'No file uploaded');
      }

      // Check if S3 storage is available
      if (!this.storageService.isAvailable()) {
        return ResponseUtility.error(ErrorCode.STORAGE_ERROR, 'Storage service is not available');
      }

      const mediaType = getMediaType(file.mimetype);
      if (!mediaType) {
        return ResponseUtility.error(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          'Unsupported file type'
        );
      }

      const limits = MEDIA_UPLOAD_LIMITS[mediaType];

      // Validate file size
      if (file.size > limits.maxSize) {
        return ResponseUtility.error(
          ErrorCode.FILE_TOO_LARGE,
          `File size exceeds ${limits.maxSize / 1024 / 1024}MB limit for ${mediaType}`
        );
      }

      // Validate MIME type
      if (!limits.mimeTypes.includes(file.mimetype)) {
        return ResponseUtility.error(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          `Unsupported ${mediaType} format`
        );
      }

      // Generate unique filename with original extension
      const ext = path.extname(file.originalname);
      const filename = `${nanoid()}${ext}`;
      const objectPath = `${BLOG_MEDIA_PREFIX}/${userDto.id}/${filename}`;

      // Upload to S3 using StorageService
      // Note: StorageService.uploadFile expects (buffer, originalName, contentType)
      // We pass the objectPath as part of the prefix via a workaround
      // since uploadFile doesn't support custom prefix per-call
      const objectName = await this.storageService.uploadFile(
        file.buffer,
        `${userDto.id}/${filename}`,
        file.mimetype
      );

      // Generate presigned URL for access
      const url = await this.storageService.getPresignedUrl(objectName);

      return ResponseUtility.success({
        url,
        filename: file.originalname,
        size: file.size,
        type: mediaType,
      });
    } catch (error: any) {
      logger.error('Upload media error:', error);
      if (error.message?.includes('file size')) {
        return ResponseUtility.error(ErrorCode.FILE_TOO_LARGE, error.message);
      }
      if (error.message?.includes('type') || error.message?.includes('format')) {
        return ResponseUtility.error(ErrorCode.UNSUPPORTED_FILE_TYPE, error.message);
      }
      return ResponseUtility.error(ErrorCode.FILE_UPLOAD_ERROR, 'Failed to upload file');
    }
  }
}
```

- [ ] **Step 2: Verify code compiles**

Run: `cd apps/server && pnpm tsc --noEmit`
Expected: No errors (may have type warnings)

- [ ] **Step 3: Add controller to index exports**

Modify: `apps/server/src/controllers/index.ts:14`

Add after line 14:
```typescript
import { BlogMediaController } from './v1/blog-media.controller.js';
```

Add to array after BlogController (line 30):
```typescript
BlogMediaController,
```

- [ ] **Step 4: Verify controller is exported**

Run: `cd apps/server && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/controllers/v1/blog-media.controller.ts apps/server/src/controllers/index.ts apps/server/src/config/upload.config.ts
git commit -m "feat(blogs): add media upload endpoint"
```

---

## Chunk 2: Frontend - API Client

**Files:**
- Create: `apps/web/src/api/blog-media.ts`
- Reference: `apps/web/src/utils/request.ts` (axios instance)
- Reference: `apps/web/src/api/blog.ts` (existing API pattern)

### Task 3: Create blog-media API client

**Files:**
- Create: `apps/web/src/api/blog-media.ts`

- [ ] **Step 1: Create blog-media API client**

```typescript
// apps/web/src/api/blog-media.ts

import axios from 'axios';
import request from '../utils/request';

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
```

- [ ] **Step 2: Verify code compiles**

Run: `cd apps/web && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/blog-media.ts
git commit -m "feat(blogs): add media upload API client"
```

---

## Chunk 3: Frontend - Upload Modal Component

**Files:**
- Create: `apps/web/src/pages/blogs/components/media-upload-modal.tsx`
- Reference: `apps/web/src/pages/blogs/components/editor-toolbar.tsx` (existing UI patterns)

### Task 4: Create MediaUploadModal component

**Files:**
- Create: `apps/web/src/pages/blogs/components/media-upload-modal.tsx`

- [ ] **Step 1: Create MediaUploadModal component**

```tsx
// apps/web/src/pages/blogs/components/media-upload-modal.tsx

import { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface MediaUploadModalProps {
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'success' | 'error';
  error?: string;
  onClose: () => void;
}

export function MediaUploadModal({
  filename,
  progress,
  status,
  error,
  onClose,
}: MediaUploadModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-[400px] max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-700">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {status === 'uploading' && '上传中'}
            {status === 'success' && '上传成功'}
            {status === 'error' && '上传失败'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Filename */}
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {filename}
            </span>
          </div>

          {/* Progress bar */}
          {status === 'uploading' && (
            <>
              <div className="h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-right">
                {progress}%
              </div>
            </>
          )}

          {/* Success state */}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>上传完成</span>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error || '上传失败，请重试'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify code compiles**

Run: `cd apps/web && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/media-upload-modal.tsx
git commit -m "feat(blogs): add media upload progress modal"
```

---

## Chunk 4: Frontend - Toolbar Integration

**Files:**
- Modify: `apps/web/src/pages/blogs/components/editor-toolbar.tsx`
- Reference: `apps/web/src/pages/blogs/components/media-upload-modal.tsx` (created in Chunk 3)
- Reference: `apps/web/src/api/blog-media.ts` (created in Chunk 2)

### Task 5: Add upload buttons to EditorToolbar

**Files:**
- Modify: `apps/web/src/pages/blogs/components/editor-toolbar.tsx`

- [ ] **Step 1: Read current toolbar implementation**

Already read - review the file structure around lines 629-648 where image/audio/youtube buttons exist.

- [ ] **Step 2: Add imports for new components**

Add after existing imports (line 35):
```tsx
import { MediaUploadModal } from './media-upload-modal';
import { uploadMedia, validateMediaFile } from '../../api/blog-media';
```

Add Lucide icons for upload (add to existing lucide import if needed, or use existing Upload icon which is already imported at line 19: `Upload`)

- [ ] **Step 3: Add upload state to EditorToolbar component**

Add after line 299 (after `const [bgColor, setBgColor] = useState<string | null>(null);`):
```tsx
const [uploadModal, setUploadModal] = useState<{
  filename: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
} | null>(null);
```

- [ ] **Step 4: Add upload handler functions**

Add after `handleKeyDown` function (around line 383):
```tsx
const handleFileUpload = async (type: 'image' | 'audio' | 'video') => {
  const input = document.createElement('input');
  input.type = 'file';

  switch (type) {
    case 'image':
      input.accept = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';
      break;
    case 'audio':
      input.accept = 'audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/flac';
      break;
    case 'video':
      input.accept = 'video/mp4,video/webm,video/quicktime';
      break;
  }

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setUploadModal({
        filename: file.name,
        progress: 0,
        status: 'error',
        error: validation.error,
      });
      return;
    }

    // Show uploading modal
    setUploadModal({
      filename: file.name,
      progress: 0,
      status: 'uploading',
    });

    try {
      const result = await uploadMedia(file, (progress) => {
        setUploadModal((prev) =>
          prev ? { ...prev, progress: progress.percent } : null
        );
      });

      // Insert into editor
      if (editor) {
        switch (type) {
          case 'image':
            editor.chain().focus().setImage({ src: result.url }).run();
            break;
          case 'audio':
            editor.chain().focus().setAudio({ src: result.url }).run();
            break;
          case 'video':
            editor.chain().focus().setVideo({ src: result.url }).run();
            break;
        }
      }

      setUploadModal((prev) =>
        prev ? { ...prev, status: 'success' } : null
      );

      // Auto close after 1 second
      setTimeout(() => {
        setUploadModal(null);
      }, 1000);
    } catch (err: any) {
      setUploadModal((prev) =>
        prev
          ? { ...prev, status: 'error', error: err?.message || '上传失败' }
          : null
      );
    }
  };

  input.click();
};
```

Note: TipTap doesn't have a `setVideo` command by default. We need to add a video extension or use a custom approach. For now, we will add the video insertion after we create the extension in Chunk 5.

- [ ] **Step 5: Add upload buttons to toolbar**

Find the section with image/audio/youtube buttons (around lines 629-648) and modify:

Replace:
```tsx
<ToolbarButton onClick={() => handleInsertClick('image')} title="插入图片">
  <Image className="w-4 h-4" />
  <span>图片</span>
</ToolbarButton>
<ToolbarButton onClick={() => handleInsertClick('audio')} title="插入音频">
  <Mic className="w-4 h-4" />
  <span>音频</span>
</ToolbarButton>
<ToolbarButton onClick={() => handleInsertClick('youtube')} title="插入 YouTube 视频">
  <Youtube className="w-4 h-4" />
  <span>视频</span>
</ToolbarButton>
```

With:
```tsx
{/* Local upload buttons */}
<ToolbarButton onClick={() => handleFileUpload('image')} title="上传图片">
  <Image className="w-4 h-4" />
  <span>图片</span>
</ToolbarButton>
<ToolbarButton onClick={() => handleFileUpload('audio')} title="上传音频">
  <Mic className="w-4 h-4" />
  <span>音频</span>
</ToolbarButton>
<ToolbarButton onClick={() => handleFileUpload('video')} title="上传视频">
  <Youtube className="w-4 h-4" />
  <span>视频</span>
</ToolbarButton>

<ToolbarDivider />

{/* External link buttons */}
<ToolbarButton onClick={() => handleInsertClick('youtube')} title="嵌入 YouTube">
  <Youtube className="w-4 h-4" />
  <span>外链</span>
</ToolbarButton>
```

- [ ] **Step 6: Add modal to render**

Add before the final closing `);` of the main return statement (around line 757, before `</div>`):
```tsx
{uploadModal && (
  <MediaUploadModal
    filename={uploadModal.filename}
    progress={uploadModal.progress}
    status={uploadModal.status}
    error={uploadModal.error}
    onClose={() => setUploadModal(null)}
  />
)}
```

- [ ] **Step 7: Verify code compiles**

Run: `cd apps/web && pnpm tsc --noEmit`
Expected: No errors (may have warnings about setVideo not existing on editor)

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/blogs/components/editor-toolbar.tsx
git commit -m "feat(blogs): add media upload buttons to toolbar"
```

---

## Chunk 5: Frontend - External Video Extension

**Files:**
- Modify: `apps/web/src/pages/blogs/editor/tiptap.config.ts`
- Create: `apps/web/src/pages/blogs/editor/extensions/external-video.ts`
- Reference: `apps/web/src/pages/blogs/components/editor-toolbar.tsx` (integration)

### Task 6: Create ExternalVideoExtension for paste-to-embed

**Files:**
- Create: `apps/web/src/pages/blogs/editor/extensions/external-video.ts`

- [ ] **Step 1: Create external video extension**

```typescript
// apps/web/src/pages/blogs/editor/extensions/external-video.ts

import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface ExternalVideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

// URL patterns for different platforms
const URL_PATTERNS = {
  youtube: {
    pattern: /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    embedUrl: 'https://www.youtube.com/embed/{id}',
    extractId: (match: RegExpMatchArray) => match[3],
  },
  bilibili: {
    pattern: /^https?:\/\/(www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
    embedUrl: 'https://player.bilibili.com/player.html?bvid={id}&autoplay=0',
    extractId: (match: RegExpMatchArray) => match[2],
  },
  douyin: {
    pattern: /^https?:\/\/(www\.)?douyin\.com\/video\/([a-zA-Z0-9]+)/,
    embedUrl: 'https://www.douyin.com/embed/{id}',
    extractId: (match: RegExpMatchArray) => match[2],
  },
} as const;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    externalVideo: {
      setExternalVideo: (options: { src: string }) => ReturnType;
    };
  }
}

export const ExternalVideo = Node.create<ExternalVideoOptions>({
  name: 'externalVideo',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      type: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src*="youtube"], iframe[src*="bilibili"], iframe[src*="douyin"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'w-full aspect-video',
        frameborder: '0',
        allowfullscreen: 'true',
        style: 'max-width: 100%;',
      }),
    ];
  },

  addCommands() {
    return {
      setExternalVideo:
        (options: { src: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('externalVideo');

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handlePaste: (view, event) => {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            const text = clipboardData.getData('text/plain');
            if (!text) return false;

            // Check each platform pattern
            for (const [platform, config] of Object.entries(URL_PATTERNS)) {
              const match = text.match(config.pattern);
              if (match) {
                const videoId = config.extractId(match);
                const embedUrl = config.embedUrl.replace('{id}', videoId);

                // Insert the iframe
                const { tr, selection } = view.state;
                const node = this.type.create({
                  src: embedUrl,
                  type: platform,
                });

                tr.replaceSelectionWith(node);
                view.dispatch(tr);

                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
```

- [ ] **Step 2: Update tiptap.config.ts to export extension**

Modify: `apps/web/src/pages/blogs/editor/tiptap.config.ts`

Add after line 14:
```typescript
import { ExternalVideo } from './extensions/external-video';
```

Add to `baseContentExtensions` array (around line 59):
```typescript
ExternalVideo,
```

- [ ] **Step 3: Verify code compiles**

Run: `cd apps/web && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/blogs/editor/extensions/external-video.ts apps/web/src/pages/blogs/editor/tiptap.config.ts
git commit -m "feat(blogs): add external video paste-to-embed extension"
```

### Task 7: Add video insertion command to toolbar

**Files:**
- Modify: `apps/web/src/pages/blogs/components/editor-toolbar.tsx`

- [ ] **Step 1: Update handleFileUpload to use setExternalVideo for video**

The video upload needs to insert as a custom node. Update the `handleFileUpload` function in editor-toolbar.tsx.

Find this part in the upload success handler:
```tsx
case 'video':
  editor.chain().focus().setVideo({ src: result.url }).run();
  break;
```

Replace with:
```tsx
case 'video':
  // For uploaded video files, use standard video HTML element
  editor.chain().focus().insertContent(`<video src="${result.url}" controls style="max-width: 100%; height: auto;" />`).run();
  break;
```

Note: TipTap's default video extension uses the `<video>` HTML element directly, which works for uploaded videos but not for external platform embeds. The ExternalVideo extension is for paste-to-embed functionality.

- [ ] **Step 2: Verify code compiles**

Run: `cd apps/web && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/blogs/components/editor-toolbar.tsx
git commit -m "fix(blogs): use video element for uploaded video insertion"
```

---

## Chunk 6: Integration & Testing

### Task 8: Verify full integration

- [ ] **Step 1: Run typecheck on entire project**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 2: Test upload endpoint manually**

Start server: `pnpm dev:server`
Test with curl:
```bash
curl -X POST http://localhost:3000/api/v1/blogs/media/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.jpg"
```

Expected: JSON response with `{ "code": 0, "data": { "url": "...", ... } }`

- [ ] **Step 3: Test toolbar buttons in browser**

Start web dev: `pnpm dev:web`
Navigate to blog editor
Click image/audio/video upload buttons
Verify file picker opens
Select a test file
Verify progress modal appears
Verify file is inserted into editor on success

- [ ] **Step 4: Test paste-to-embed**

In blog editor, paste a YouTube URL like:
`https://www.youtube.com/watch?v=dQw4w9WgXcQ`
Verify it converts to an embedded player

Paste a Bilibili URL like:
`https://www.bilibili.com/video/BV1xx411c7XD`
Verify it converts to an embedded player

- [ ] **Step 5: Commit any final fixes**

```bash
git add .
git commit -m "fix(blogs): integration fixes"
```

---

## Summary

**Created files:**
- `apps/server/src/controllers/v1/blog-media.controller.ts` - Upload endpoint
- `apps/server/src/config/upload.config.ts` - Upload limits config
- `apps/web/src/api/blog-media.ts` - Upload API client with progress
- `apps/web/src/pages/blogs/components/media-upload-modal.tsx` - Progress UI
- `apps/web/src/pages/blogs/editor/extensions/external-video.ts` - Paste-to-embed

**Modified files:**
- `apps/server/src/controllers/index.ts` - Export new controller
- `apps/web/src/pages/blogs/components/editor-toolbar.tsx` - Upload buttons
- `apps/web/src/pages/blogs/editor/tiptap.config.ts` - Add extension

**Total tasks:** 8 main tasks, ~20 steps
