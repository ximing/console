import { ChatOpenAI } from '@langchain/openai';
import { Service, Inject } from 'typedi';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { TOOL_REGISTRY, getToolById, type Tool } from './tool-registry.js';
import { UserModelService } from './user-model.service.js';
import type { UserModel } from '../db/schema/user-models.js';
import type { LLMProvider } from '@x-console/dto';

export interface ExtractedParams {
  [key: string]: unknown;
}

export interface IntentResult {
  intentId: string;
  intentName: string;
  confidence: number;
  isHighConfidence: boolean;
  extractedParams: ExtractedParams;
  rawInput: string;
}

export interface IntentRecognitionResult {
  intent: IntentResult | null;
  alternativeIntents: IntentResult[];
  isCommand?: boolean;
  commandError?: string;
}

/**
 * Confidence thresholds
 */
export const CONFIDENCE_HIGH = 0.8;
export const CONFIDENCE_MEDIUM = 0.7;

/**
 * Command parameter extraction patterns for common tools
 */
const COMMAND_PARAM_PATTERNS: Record<string, { paramName: string; type: 'number' | 'string' }[]> = {
  'uuid-generate': [{ paramName: 'count', type: 'number' }],
  'ai-translate': [{ paramName: 'text', type: 'string' }],
  'ai-summarize': [{ paramName: 'text', type: 'string' }],
  'ai-explain-code': [{ paramName: 'code', type: 'string' }],
  'json-format': [{ paramName: 'json', type: 'string' }],
  'json-validate': [{ paramName: 'json', type: 'string' }],
  'base64-encode': [{ paramName: 'text', type: 'string' }],
  'base64-decode': [{ paramName: 'text', type: 'string' }],
  'url-encode': [{ paramName: 'text', type: 'string' }],
  'url-decode': [{ paramName: 'text', type: 'string' }],
  'markdown-preview': [{ paramName: 'text', type: 'string' }],
  'hash-md5': [{ paramName: 'text', type: 'string' }],
  'hash-sha256': [{ paramName: 'text', type: 'string' }],
  'color-convert': [{ paramName: 'color', type: 'string' }],
  'timestamp-convert': [{ paramName: 'value', type: 'string' }],
};

/**
 * Service for intent recognition in command palette
 * Analyzes user input, identifies intent, and extracts parameters
 */
@Service()
export class CommandPaletteIntentService {
  private model: ChatOpenAI;

  constructor(@Inject() private userModelService: UserModelService) {
    this.model = new ChatOpenAI({
      modelName: config.openai.model || 'gpt-4o-mini',
      apiKey: config.openai.apiKey,
      configuration: {
        baseURL: config.openai.baseURL,
      },
      temperature: 0.3,
    });
  }

  /**
   * Recognize command format input (starts with /)
   * Commands are matched case-insensitively against tool IDs and keywords
   */
  private recognizeCommand(commandInput: string, userId?: string): IntentRecognitionResult {
    if (!commandInput || commandInput.trim().length === 0) {
      return {
        intent: null,
        alternativeIntents: [],
        isCommand: true,
        commandError: '命令不能为空',
      };
    }

    const parts = commandInput.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    // Try to match command against tool IDs and keywords
    let matchedTool: Tool | undefined;

    // First, try exact match with tool ID
    matchedTool = TOOL_REGISTRY.find((tool) => tool.id.toLowerCase() === command);

    // If no exact match, try keyword match
    if (!matchedTool) {
      for (const tool of TOOL_REGISTRY) {
        if (tool.keywords.some((kw) => kw.toLowerCase() === command)) {
          matchedTool = tool;
          break;
        }
      }
    }

    // If still no match, try partial keyword match
    if (!matchedTool) {
      for (const tool of TOOL_REGISTRY) {
        if (tool.keywords.some((kw) => kw.toLowerCase().includes(command))) {
          matchedTool = tool;
          break;
        }
      }
    }

    if (!matchedTool) {
      return {
        intent: null,
        alternativeIntents: [],
        isCommand: true,
        commandError: `未找到匹配的命令: /${command}，请尝试其他命令`,
      };
    }

    // Check if tool requires authentication
    if (matchedTool.category === 'ai' && !userId) {
      return {
        intent: null,
        alternativeIntents: [],
        isCommand: true,
        commandError: 'AI 工具需要登录后使用',
      };
    }

    // Extract parameters based on command pattern
    const extractedParams = this.extractCommandParams(matchedTool.id, args);

    return {
      intent: {
        intentId: matchedTool.id,
        intentName: matchedTool.name,
        confidence: 1.0,
        isHighConfidence: true,
        extractedParams,
        rawInput: '/' + commandInput,
      },
      alternativeIntents: [],
      isCommand: true,
    };
  }

  /**
   * Extract parameters from command arguments based on tool's parameter patterns
   */
  private extractCommandParams(toolId: string, args: string): ExtractedParams {
    const params: ExtractedParams = {};
    const patterns = COMMAND_PARAM_PATTERNS[toolId];

    if (!patterns || !args) {
      return params;
    }

    // For tools with text parameter, use all remaining args
    const textParam = patterns.find((p) => p.type === 'string');
    if (textParam) {
      params[textParam.paramName] = args;
    }

    // For tools with number parameter, try to parse from first arg
    const numberParam = patterns.find((p) => p.type === 'number');
    if (numberParam) {
      const num = parseInt(args, 10);
      if (!isNaN(num)) {
        params[numberParam.paramName] = num;
      }
    }

    return params;
  }

  /**
   * Get API configuration for a provider
   */
  private getApiConfig(provider: LLMProvider, model: UserModel): { baseUrl: string; apiKey: string } {
    const modelName = model.modelName;

    let baseUrl: string;
    switch (provider) {
      case 'openai':
        baseUrl = model.apiBaseUrl || 'https://api.openai.com/v1';
        break;
      case 'deepseek':
        baseUrl = model.apiBaseUrl || 'https://api.deepseek.com/v1';
        break;
      case 'openrouter':
        baseUrl = model.apiBaseUrl || 'https://openrouter.ai/api/v1';
        break;
      case 'other':
        if (!model.apiBaseUrl) {
          throw new Error('API Base URL is required for custom providers');
        }
        baseUrl = model.apiBaseUrl;
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    return {
      baseUrl,
      apiKey: model.apiKey,
    };
  }

  /**
   * Create a ChatOpenAI instance with user-configured model
   */
  private async createModelWithConfig(userId: string, modelId: string): Promise<ChatOpenAI> {
    const model = await this.userModelService.getModel(modelId, userId);

    if (!model) {
      throw new Error('Model not found');
    }

    const { baseUrl, apiKey } = this.getApiConfig(model.provider as LLMProvider, model);

    return new ChatOpenAI({
      modelName: model.modelName,
      apiKey: apiKey,
      configuration: {
        baseURL: baseUrl,
      },
      temperature: 0.3,
    });
  }

  /**
   * Recognize intent from user input
   * @param userInput - The user's query or command
   * @param modelId - Optional model ID for user-configured model
   * @param userId - Optional user ID for model ownership verification
   * @returns Intent recognition result with primary and alternative intents
   */
  async recognizeIntent(
    userInput: string,
    modelId?: string,
    userId?: string
  ): Promise<IntentRecognitionResult> {
    if (!userInput || userInput.trim().length === 0) {
      return { intent: null, alternativeIntents: [] };
    }

    const trimmedInput = userInput.trim();

    // Check if input starts with / - treat as command
    if (trimmedInput.startsWith('/')) {
      return this.recognizeCommand(trimmedInput.substring(1), userId);
    }

    // Determine which model to use
    let modelToUse: ChatOpenAI = this.model;

    // If modelId is provided and userId is available, try to use user-configured model
    if (modelId && userId) {
      try {
        modelToUse = await this.createModelWithConfig(userId, modelId);
      } catch (error) {
        logger.warn('Failed to use user-configured model, falling back to default:', error);
      }
    }

    const systemPrompt = `Role
你是一个智能意图识别助手，负责分析用户的输入，识别用户的意图并提取相关参数。

Task
1. 分析用户的输入内容
2. 识别用户想要使用的工具/功能
3. 从输入中提取相关参数

Tool Parameters Guide (参数提取指南)
- uuid-generate: 从输入中提取要生成的 UUID 数量，如"生成5个UUID"提取 count=5
- ai-translate: 从输入中提取要翻译的文本和目标语言，如"翻译hello world为中文"提取 text="hello world", targetLang="zh"
- ai-summarize: 从输入中提取要总结的文本内容
- ai-explain-code: 从输入中提取要解释的代码
- json-format: 从输入中提取要格式化的 JSON 字符串
- json-validate: 从输入中提取要验证的 JSON 字符串
- base64-encode: 从输入中提取要编码的文本
- base64-decode: 从输入中提取要解码的 Base64 字符串
- url-encode: 从输入中提取要编码的 URL
- url-decode: 从输入中提取要解码的 URL
- markdown-preview: 从输入中提取要预览的 Markdown 内容
- hash-md5: 从输入中提取要计算 MD5 的文本
- hash-sha256: 从输入中提取要计算 SHA256 的文本
- color-convert: 从输入中提取要转换的颜色值
- timestamp-convert: 从输入中提取要转换的时间戳或日期

Response Format
你必须只返回一个 JSON 对象，不要包含任何其他内容：
{
  "intents": [
    {
      "id": "工具ID",
      "confidence": 0.0-1.0 之间的置信度,
      "params": {
        "参数名": "参数值"
      }
    }
  ]
}

Confidence Guidelines (置信度指南)
- 0.9-1.0: 输入完全明确指向某个工具，如"生成UUID"、"翻译hello"
- 0.8-0.9: 输入非常可能指向某个工具，只有很小的歧义
- 0.7-0.8: 输入比较可能指向某个工具，但存在一定歧义
- 0.5-0.7: 输入可能指向某个工具，但需要更多上下文
- < 0.5: 不应该返回

只返回置信度 >= 0.5 的意图，最多返回 3 个最可能的意图。
按置信度从高到低排序。`;

    const toolsDescription = TOOL_REGISTRY.map(
      (tool) => `- ${tool.id}: ${tool.name} (${tool.nameEn}) - ${tool.description} [关键词: ${tool.keywords.join(', ')}]`
    ).join('\n');

    const userPrompt = `用户输入: "${userInput.trim()}"

可用工具:
${toolsDescription}

请分析用户输入，识别意图并提取参数，返回 JSON 格式的结果。`;

    try {
      const response = await modelToUse.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const responseContent = typeof response.content === 'string' ? response.content : '';

      return this.parseResponse(responseContent, userInput.trim());
    } catch (error) {
      logger.error('Error in intent recognition:', error);
      return { intent: null, alternativeIntents: [] };
    }
  }

  /**
   * Parse AI response to extract intents
   */
  private parseResponse(responseContent: string, rawInput: string): IntentRecognitionResult {
    try {
      // Extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { intent: null, alternativeIntents: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        intents: Array<{ id: string; confidence: number; params?: Record<string, unknown> }>;
      };

      if (!parsed.intents || !Array.isArray(parsed.intents)) {
        return { intent: null, alternativeIntents: [] };
      }

      // Map to full intent information
      const intentResults: IntentResult[] = [];
      for (const match of parsed.intents) {
        if (match.confidence >= 0.5) {
          const tool = getToolById(match.id);
          if (tool) {
            intentResults.push({
              intentId: tool.id,
              intentName: tool.name,
              confidence: match.confidence,
              isHighConfidence: match.confidence >= CONFIDENCE_HIGH,
              extractedParams: match.params || {},
              rawInput,
            });
          }
        }
      }

      // Sort by confidence descending
      intentResults.sort((a, b) => b.confidence - a.confidence);

      // Return primary intent and alternatives
      const primaryIntent = intentResults[0] || null;
      const alternativeIntents = intentResults.slice(1, 3);

      return {
        intent: primaryIntent,
        alternativeIntents,
      };
    } catch (error) {
      logger.warn('Failed to parse intent recognition response:', error, 'Response:', responseContent);
      return { intent: null, alternativeIntents: [] };
    }
  }
}
