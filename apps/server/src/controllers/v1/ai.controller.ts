import { JsonController, Post, Body, UseBefore } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { AIService } from '../../services/ai.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { baAuthInterceptor } from '../../middlewares/ba-auth.interceptor.js';

interface ChatRequestBody {
  msg: string;
}

@Service()
@JsonController('/api/v1/ba/ai')
export class AIController {
  constructor(private aiService: AIService) {}

  /**
   * POST /api/v1/ba/ai/chat - Chat with AI personal assistant (BA Auth)
   */
  @Post('/chat')
  @UseBefore(baAuthInterceptor)
  async chat(@Body() body: ChatRequestBody) {
    try {
      // 1. Validate input
      if (!body.msg || body.msg.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '消息不能为空');
      }

      // 2. Call AI service
      const reply = await this.aiService.chat(body.msg.trim());

      return ResponseUtility.success({ reply });
    } catch (error) {
      logger.error('AI chat error:', error);
      return ResponseUtility.error(ErrorCode.SYSTEM_ERROR);
    }
  }
}
