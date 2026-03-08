import { JsonController, Post, Body, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import type { UserInfoDto } from '@x-console/dto';
import { getToolById } from '../../services/tool-registry.js';
import { ToolExecutionService } from '../../services/tool-execution.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

interface ToolExecutionRequestBody {
  toolId: string;
  input: string;
  options?: Record<string, unknown>;
  modelId?: string;
}

@Service()
@JsonController('/api/tool')
export class ToolExecutionController {
  constructor(private toolExecutionService: ToolExecutionService) {}

  /**
   * POST /api/tool/execute - Execute a tool with the given input
   */
  @Post('/execute')
  async execute(@CurrentUser() userDto: UserInfoDto, @Body() body: ToolExecutionRequestBody) {
    try {
      // 1. Validate toolId
      if (!body.toolId || body.toolId.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '工具ID不能为空');
      }

      // 2. Check if tool requires authentication
      const tool = getToolById(body.toolId.trim());
      if (tool?.category === 'ai') {
        // AI tools require login
        if (!userDto?.id) {
          return ResponseUtility.error(ErrorCode.UNAUTHORIZED, 'AI 工具需要登录后使用');
        }
      }

      // 3. Validate input
      if (!body.input || body.input.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '输入内容不能为空');
      }

      // 4. Validate input length
      if (body.input.trim().length > 10000) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, '输入内容过长');
      }

      // 5. Get userId
      const userId = userDto?.id;

      // 6. Execute the tool
      const result = await this.toolExecutionService.execute({
        toolId: body.toolId.trim(),
        input: body.input.trim(),
        options: body.options,
        modelId: body.modelId,
        userId: userId,
      });

      if (!result.success) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, result.error || 'Tool execution failed');
      }

      return ResponseUtility.success({ result: result.result });
    } catch (error) {
      logger.error('Tool execution error:', error);
      return ResponseUtility.error(ErrorCode.SYSTEM_ERROR);
    }
  }
}
