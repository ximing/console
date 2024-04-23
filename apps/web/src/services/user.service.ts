import { Service, resolve } from '@rabjs/react';
import { updateUserInfo, uploadAvatar } from '../api/user';
import { AuthService } from './auth.service';

/**
 * User Service
 * Manages user profile operations
 */
export class UserService extends Service {
  // 使用 getter + resolve 获取依赖
  private get authService() {
    return resolve(AuthService);
  }

  /**
   * Update user information (username)
   */
  async updateUserInfo(data: { username: string }): Promise<void> {
    const result = await updateUserInfo(data);

    // Update auth service user data
    if (this.authService.user) {
      this.authService.user = {
        ...this.authService.user,
        username: result.username,
      };

      // Update localStorage
      localStorage.setItem('aimo_user', JSON.stringify(this.authService.user));
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<void> {
    const result = await uploadAvatar(file);

    // Update auth service user data with new avatar URL
    if (this.authService.user) {
      this.authService.user = {
        ...this.authService.user,
        avatar: result.avatar,
      };

      // Update localStorage
      localStorage.setItem('aimo_user', JSON.stringify(this.authService.user));
    }
  }
}
