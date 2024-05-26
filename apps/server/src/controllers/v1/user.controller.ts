import {
  JsonController,
  Get,
  Put,
  Post,
  CurrentUser,
  Body,
  UploadedFile,
} from 'routing-controllers';
import { Service } from 'typedi';
import multer from 'multer';

import { ErrorCode } from '../../constants/error-codes.js';
import { UserService } from '../../services/user.service.js';
import { StorageService } from '../../services/storage.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { UserInfoDto, UpdateUserDto } from '@x-console/dto';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

@Service()
@JsonController('/api/v1/user')
export class UserV1Controller {
  constructor(
    private userService: UserService,
    private storageService: StorageService
  ) {}

  @Get('/info')
  async getUser(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const user = await this.userService.getUserById(userDto.id);
      if (!user) {
        return ResponseUtility.error(ErrorCode.USER_NOT_FOUND);
      }

      // If user has avatar stored as object key, generate presigned URL
      let avatarUrl = user.avatar ?? undefined;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        try {
          avatarUrl = await this.storageService.getPresignedUrl(avatarUrl);
        } catch (error) {
          logger.error('Failed to generate presigned URL for avatar', { error });
          // Keep the object key if presigned URL generation fails
        }
      }

      // Return user info
      const userInfo: UserInfoDto = {
        id: user.id,
        email: user.email ?? undefined,
        username: user.username ?? undefined,
        avatar: avatarUrl,
      };

      return ResponseUtility.success(userInfo);
    } catch (error) {
      logger.error('Get user info error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Put('/info')
  async updateUser(@CurrentUser() userDto: UserInfoDto, @Body() updateData: UpdateUserDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate username
      if (updateData.username && updateData.username.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Username cannot be empty');
      }

      // Update user
      await this.userService.updateUser(userDto.id, updateData);

      // Get updated user info
      const user = await this.userService.getUserById(userDto.id);
      if (!user) {
        return ResponseUtility.error(ErrorCode.USER_NOT_FOUND);
      }

      // Generate presigned URL for avatar if needed
      let avatarUrl = user.avatar ?? undefined;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        try {
          avatarUrl = await this.storageService.getPresignedUrl(avatarUrl);
        } catch (error) {
          logger.error('Failed to generate presigned URL for avatar', { error });
        }
      }

      const userInfo: UserInfoDto = {
        id: user.id,
        email: user.email ?? undefined,
        username: user.username ?? undefined,
        avatar: avatarUrl,
      };

      return ResponseUtility.success(userInfo);
    } catch (error) {
      logger.error('Update user info error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/avatar')
  async uploadAvatar(
    @CurrentUser() userDto: UserInfoDto,
    @UploadedFile('avatar', { options: upload }) file: Express.Multer.File
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!file) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'No file uploaded');
      }

      // Check if avatar S3 storage is available
      if (!this.storageService.isAvailable()) {
        return ResponseUtility.error(ErrorCode.STORAGE_ERROR, 'Storage service is not available');
      }

      // Get current user to check if they have an old avatar
      const user = await this.userService.getUserById(userDto.id);
      if (!user) {
        return ResponseUtility.error(ErrorCode.USER_NOT_FOUND);
      }

      // Upload new avatar to S3 storage
      const objectName = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      // Update user avatar in database (store object key, not URL)
      await this.userService.updateUser(userDto.id, { avatar: objectName });

      // Delete old avatar if exists (and it's not an HTTP URL)
      if (user.avatar && !user.avatar.startsWith('http')) {
        await this.storageService.deleteFile(user.avatar);
      }

      // Generate presigned URL for response
      const avatarUrl = await this.storageService.getPresignedUrl(objectName);

      return ResponseUtility.success({ avatar: avatarUrl });
    } catch (error: any) {
      logger.error('Upload avatar error:', error);
      if (error.message === 'Only image files are allowed') {
        return ResponseUtility.error(ErrorCode.UNSUPPORTED_FILE_TYPE, error.message);
      }
      return ResponseUtility.error(ErrorCode.FILE_UPLOAD_ERROR, 'Failed to upload avatar');
    }
  }
}
