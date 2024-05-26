import type { ApiTokenDto, CreateApiTokenDto, ApiTokenListDto } from '@x-console/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

/**
 * User API Token endpoints
 */
export const apiTokenApi = {
  /**
   * Get all tokens for current user
   */
  getTokens: async (): Promise<ApiTokenListDto> => {
    const response = await request.get<unknown, ApiResponse<ApiTokenListDto>>(
      '/api/v1/user/api-tokens'
    );
    return response.data;
  },

  /**
   * Create a new API token
   * Returns the plaintext token only once!
   */
  createToken: async (data: CreateApiTokenDto): Promise<ApiTokenDto> => {
    const response = await request.post<CreateApiTokenDto, ApiResponse<ApiTokenDto>>(
      '/api/v1/user/api-tokens',
      data
    );
    return response.data;
  },

  /**
   * Delete an API token
   */
  deleteToken: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/user/api-tokens/${id}`
    );
    return response.data;
  },
};
