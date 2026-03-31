// apps/server/src/controllers/v1/blog-media.controller.ts

import {
  JsonController,
  Post,
  Get,
  CurrentUser,
  UploadedFile,
  QueryParams,
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
import { readImageDimensions } from '../../utils/image-dimensions.js';
import { blogMedia } from '../../db/schema/blog-media.js';
import { blogs } from '../../db/schema/blog.js';
import { BlogService } from '../../services/blog.service.js';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../../db/connection.js';

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
  constructor(
    private storageService: StorageService,
    private blogService: BlogService
  ) {}

  @Post('/upload')
  async uploadMedia(
    @CurrentUser() userDto: UserInfoDto,
    @UploadedFile('file', { options: upload }) file: Express.Multer.File,
    @QueryParams() params: { blogId: string }
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate blogId and check ownership
      const blog = await this.blogService.getBlog(params.blogId, userDto.id);
      if (!blog) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found or access denied');
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
      const isValidMimeType = (limits.mimeTypes as readonly string[]).includes(file.mimetype);
      if (!isValidMimeType) {
        return ResponseUtility.error(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          `Unsupported ${mediaType} format`
        );
      }

      // Generate unique filename with original extension
      const ext = path.extname(file.originalname);
      const filename = `${nanoid()}${ext}`;
      const objectName = `${userDto.id}/${params.blogId}/${filename}`;

      // Upload to S3 using StorageService
      const s3Path = await this.storageService.uploadFile(
        file.buffer,
        objectName,
        file.mimetype
      );

      // Get image dimensions if it's an image
      let width: number | undefined;
      let height: number | undefined;

      if (mediaType === 'image' && file.mimetype !== 'image/svg+xml') {
        try {
          const dimensions = await readImageDimensions(file.buffer);
          width = dimensions.width;
          height = dimensions.height;
        } catch (e) {
          logger.warn('Failed to get image dimensions', { error: e });
        }
      }

      // Insert media record
      const db = getDatabase();
      await db.insert(blogMedia).values({
        id: `m${nanoid(22)}`,
        blogId: params.blogId,
        path: s3Path,
        filename: file.originalname,
        size: file.size,
        type: mediaType,
        width: width,
        height: height,
      });

      return ResponseUtility.success({
        path: s3Path,
        filename: file.originalname,
        size: file.size,
        type: mediaType,
        width,
        height,
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

  /**
   * GET /api/v1/blogs/media/url - Get presigned URL from path
   */
  @Get('/url')
  async getMediaUrl(
    @CurrentUser() userDto: UserInfoDto,
    @QueryParams() params: { path: string }
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!params.path) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Path is required');
      }

      // Prevent path traversal
      if (params.path.includes('..') || params.path.startsWith('/')) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Invalid path');
      }

      // Get blogId from path: {userId}/{blogId}/{filename}
      const pathParts = params.path.split('/');
      if (!pathParts || pathParts.length < 3) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Invalid path format');
      }

      // Query blog_media to get the blogId
      const db = getDatabase();
      const mediaResults = await db
        .select()
        .from(blogMedia)
        .where(eq(blogMedia.path, params.path))
        .limit(1);

      if (mediaResults.length === 0) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Media not found');
      }

      const media = mediaResults[0];

      // Query the blog to check status and ownership
      const blogResults = await db
        .select()
        .from(blogs)
        .where(eq(blogs.id, media.blogId))
        .limit(1);

      if (blogResults.length === 0) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      const blog = blogResults[0];

      // If blog is published, allow access without auth check
      if (blog.status === 'published') {
        // OK - public access
      } else {
        // For drafts, check ownership
        if (blog.userId !== userDto.id) {
          return ResponseUtility.error(ErrorCode.FORBIDDEN, 'Access denied');
        }
      }

      // Generate presigned URL
      const url = await this.storageService.getPresignedUrl(params.path);

      return ResponseUtility.success({ url });
    } catch (error) {
      logger.error('Get media URL error:', error);
      return ResponseUtility.error(ErrorCode.FILE_UPLOAD_ERROR, 'Failed to get media URL');
    }
  }
}