import type { UserInfoDto } from '@aimo-console/dto';
import request from '../utils/request';

/**
 * Get current user info
 */
export const getUserInfo = () => {
  return request.get<unknown, { code: number; data: UserInfoDto }>('/api/v1/user/info');
};

/**
 * Update user info (username)
 */
export const updateUserInfo = (data: { username: string }) => {
  return request.put<unknown, UserInfoDto>('/api/v1/user/info', data);
};

/**
 * Upload user avatar
 */
export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);

  return request.post<unknown, { avatar: string }>('/api/v1/user/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
