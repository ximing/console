import { JsonController, Post, Body, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import type { UserInfoDto } from '@x-console/dto';
import { AIRouteService } from '../../services/ai-route.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

interface AIRouteRequestBody {
  input: string;
  modelId?: string;
}

@Service()
@JsonController('/api')
export class AIRouteController {
  constructor(private aiRouteService: AIRouteService) {}

  /**
   * POST /api/ai-route - Route user input to matching tools using AI
   */
  @Post('/ai-route')
  async route(@CurrentUser() userDto: UserInfoDto, @Body() body: AIRouteRequestBody) {
    try {
      // 1. Validate input
      if (!body.input || body.input.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '输入不能为空');
      }

      // 2. Validate input length
      if (body.input.trim().length > 500) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '输入内容过长');
      }

      // 3. Get userId if user is logged in
      const userId = userDto?.id;

      // 4. Call AI routing service
      const result = await this.aiRouteService.route(body.input.trim(), body.modelId, userId);

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('AI route error:', error);
      return ResponseUtility.error(ErrorCode.SYSTEM_ERROR);
    }
  }
}
