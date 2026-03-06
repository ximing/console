import type { UserInfoDto } from '@aimo-console/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

/**
 * Get current user info
 */
export const getUserInfo = async (): Promise<UserInfoDto> => {
  const response = await request.get<unknown, ApiResponse<UserInfoDto>>('/api/v1/user/info');
  return response.data;
};

/**
 * Update user info (username)
 */
export const updateUserInfo = async (data: { username: string }): Promise<UserInfoDto> => {
  const response = await request.put<unknown, ApiResponse<UserInfoDto>>('/api/v1/user/info', data);
  return response.data;
};

/**
 * Upload user avatar
 */
export const uploadAvatar = async (file: File): Promise<{ avatar: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await request.post<unknown, ApiResponse<{ avatar: string }>>(
    '/api/v1/user/avatar',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};
