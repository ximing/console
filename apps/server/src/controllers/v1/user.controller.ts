import { JsonController, Get, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { UserService } from '../../services/user.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { UserInfoDto } from '@aimo-console/dto';

@Service()
@JsonController('/api/v1/user')
export class UserV1Controller {
  constructor(private userService: UserService) {}

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

      // Return user info
      const userInfo: UserInfoDto = {
        id: user.id,
        email: user.email ?? undefined,
        username: user.username ?? undefined,
        avatar: user.avatar ?? undefined,
      };

      return ResponseUtility.success(userInfo);
    } catch (error) {
      logger.error('Get user info error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

}
