import { JsonController, Post, Body, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import type { UserInfoDto } from '@x-console/dto';
import { CommandPaletteIntentService } from '../../services/command-palette-intent.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

interface IntentRequestBody {
  input: string;
  modelId?: string;
}

@Service()
@JsonController('/api/command-palette')
export class CommandPaletteIntentController {
  constructor(private intentService: CommandPaletteIntentService) {}

  /**
   * POST /api/command-palette/intent - Recognize intent from user input
   */
  @Post('/intent')
  async recognizeIntent(@CurrentUser() userDto: UserInfoDto, @Body() body: IntentRequestBody) {
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

      // 4. Call intent recognition service
      const result = await this.intentService.recognizeIntent(body.input.trim(), body.modelId, userId);

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('Intent recognition error:', error);
      return ResponseUtility.error(ErrorCode.SYSTEM_ERROR);
    }
  }
}
