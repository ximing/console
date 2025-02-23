import { JsonController, Get, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil } from '../../utils/response.js';
import type { UserInfoDto } from '@x-console/dto';

const MINIMAX_API_URL = 'https://www.minimaxi.com/v1/token_plan/remains';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';

@Service()
@JsonController('/api/v1/minimax')
export class MiniMaxController {
  /**
   * GET /api/v1/minimax/token-remains - Get MiniMax token remaining usage
   */
  @Get('/token-remains')
  async getTokenRemains(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      if (!MINIMAX_API_KEY) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'MiniMax API key not configured');
      }

      const response = await fetch(MINIMAX_API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MINIMAX_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('MiniMax API error:', response.status, errorBody);
        return ResponseUtil.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          `MiniMax API error: ${response.status}`
        );
      }

      const data = (await response.json()) as {
        model_remains?: Array<{
          start_time: number;
          end_time: number;
          remains_time: number;
          current_interval_total_count: number;
          current_interval_usage_count: number;
          model_name: string;
          current_weekly_total_count: number;
          current_weekly_usage_count: number;
          weekly_start_time: number;
          weekly_end_time: number;
          weekly_remains_time: number;
        }>;
        base_resp?: { status_code: number; status_msg: string };
      };

      if (data.base_resp?.status_code !== 0) {
        return ResponseUtil.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          data.base_resp?.status_msg || 'MiniMax API returned error'
        );
      }

      return ResponseUtil.success({
        modelRemains: data.model_remains || [],
      });
    } catch (error) {
      logger.error('Get MiniMax token remains error:', error);
      return ResponseUtil.error(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}
