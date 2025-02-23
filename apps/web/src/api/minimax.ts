import type { MiniMaxTokenRemainsDto } from '@x-console/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

/**
 * MiniMax API endpoints
 */
export const minimaxApi = {
  /**
   * Get MiniMax token remaining usage
   */
  getTokenRemains: async (): Promise<MiniMaxTokenRemainsDto> => {
    const response = await request.get<unknown, ApiResponse<MiniMaxTokenRemainsDto>>(
      '/api/v1/minimax/token-remains'
    );
    return response.data;
  },
};
