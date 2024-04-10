import type { UserInfoDto } from '@aimo-console/dto';
import request from '../utils/request';

/**
 * Get current user info
 */
export const getUserInfo = () => {
  return request.get<unknown, { code: number; data: UserInfoDto }>('/api/v1/user/info');
};
