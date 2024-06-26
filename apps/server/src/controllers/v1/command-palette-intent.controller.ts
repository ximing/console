import { JsonController, Post, Body, CurrentUser } from 'routing-controllers';
import { Service, Inject } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import type { UserInfoDto } from '@x-console/dto';

import { CommandPaletteIntentService, CONFIDENCE_HIGH } from '../../services/command-palette-intent.service.js';
import { ToolExecutionService } from '../../services/tool-execution.service.js';
import { getToolById } from '../../services/tool-registry.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

interface IntentRequestBody {
  input: string;
  modelId?: string;
}

interface ExecuteRequestBody {
  intentId: string;
  input: string;
  params?: Record<string, unknown>;
  modelId?: string;
}

@Service()
@JsonController('/api/command-palette')
export class CommandPaletteIntentController {
  constructor(
    private intentService: CommandPaletteIntentService,
    @Inject() private toolExecutionService: ToolExecutionService
  ) {}

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

  /**
   * POST /api/command-palette/execute - Execute tool with high confidence intent
   * This endpoint is called when confidence >= 0.8 for auto-execution
   */
  @Post('/execute')
  async executeIntent(@CurrentUser() userDto: UserInfoDto, @Body() body: ExecuteRequestBody) {
    try {
      // 1. Validate input
      if (!body.intentId || body.intentId.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '意图ID不能为空');
      }

      if (!body.input || body.input.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '输入不能为空');
      }

      // 2. Validate input length
      if (body.input.trim().length > 500) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '输入内容过长');
      }

      // 3. Check if tool exists
      const tool = getToolById(body.intentId.trim());
      if (!tool) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, `未知的工具: ${body.intentId}`);
      }

      // 4. Check if tool requires authentication
      if (tool.category === 'ai') {
        if (!userDto?.id) {
          return ResponseUtility.error(ErrorCode.UNAUTHORIZED, 'AI 工具需要登录后使用');
        }
      }

      // 5. Get userId
      const userId = userDto?.id;

      // 6. Execute the tool with the provided params
      const result = await this.toolExecutionService.execute({
        toolId: body.intentId.trim(),
        input: body.input.trim(),
        options: body.params,
        modelId: body.modelId,
        userId: userId,
      });

      if (!result.success) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, result.error || '工具执行失败');
      }

      return ResponseUtility.success({
        toolId: body.intentId.trim(),
        toolName: tool.name,
        result: result.result,
      });
    } catch (error) {
      logger.error('Intent execution error:', error);
      return ResponseUtility.error(ErrorCode.SYSTEM_ERROR);
    }
  }
}
