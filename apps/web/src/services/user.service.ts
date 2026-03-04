import { Service } from '@rabjs/react';
import { updateUserInfo, uploadAvatar } from '../api/user';
import { AuthService } from './auth.service';

@Service()
export class UserService {
  constructor(private authService: AuthService) {}

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
      localStorage.setItem('user', JSON.stringify(this.authService.user));
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
      localStorage.setItem('user', JSON.stringify(this.authService.user));
    }
  }
}
