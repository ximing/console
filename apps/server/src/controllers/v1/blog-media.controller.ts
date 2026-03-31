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

      // Upload to S3 using StorageService
      const objectName = await this.storageService.uploadFile(
        file.buffer,
        `${userDto.id}/${filename}`,
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

      return ResponseUtility.success({
        path: objectName,
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

      // Verify the path belongs to this user (path format: blogs/media/{userId}/...)
      const pathParts = params.path.split('/');
      if (pathParts.length < 3 || pathParts[0] !== 'blogs' || pathParts[1] !== 'media' || pathParts[2] !== userDto.id) {
        return ResponseUtility.error(ErrorCode.FORBIDDEN, 'Access denied');
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