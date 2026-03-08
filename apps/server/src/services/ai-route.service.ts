import { ChatOpenAI } from '@langchain/openai';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { TOOL_REGISTRY, getToolById, type Tool } from './tool-registry.js';

export interface MatchedTool {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  confidence: number;
  category: Tool['category'];
}

export interface AIRouteResult {
  tools: MatchedTool[];
}

/**
 * Service for AI-powered routing in command palette
 * Matches user input to available tools using AI
 */
@Service()
export class AIRouteService {
  private model: ChatOpenAI;

  constructor() {
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
   * Route user input to matching tools
   * @param userInput - The user's query or command
   * @returns List of matched tools with confidence scores
   */
  async route(userInput: string): Promise<AIRouteResult> {
    if (!userInput || userInput.trim().length === 0) {
      return { tools: [] };
    }

    const systemPrompt = `Role
你是一个智能命令路由助手，负责将用户的输入匹配到最合适的工具。

Task
根据用户的输入，从提供的工具列表中选择最匹配的工具。

Tool Selection Rules (核心指令)
1. 仔细分析用户的意图和需求
2. 匹配时优先考虑：
   - 用户输入的关键词
   - 工具的名称（中英文）
   - 工具的描述
   - 工具的关键字
3. 只返回置信度 >= 0.5 的工具
4. 最多返回 3 个最匹配的工具
5. 按置信度从高到低排序

Response Format
你必须只返回一个 JSON 对象，不要包含任何其他内容：
{
  "tools": [
    {
      "id": "工具ID",
      "confidence": 0.0-1.0 之间的置信度
    }
  ]
}

如果没有任何匹配的工具，返回空数组：
{"tools": []}`;

    const toolsDescription = TOOL_REGISTRY.map(
      (tool) => `- ${tool.id}: ${tool.name} (${tool.nameEn}) - ${tool.description} [关键词: ${tool.keywords.join(', ')}]`
    ).join('\n');

    const userPrompt = `用户输入: "${userInput.trim()}"

可用工具:
${toolsDescription}

请分析用户输入，选择最匹配的工具并返回 JSON 格式的结果。`;

    try {
      const response = await this.model.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const responseContent = typeof response.content === 'string' ? response.content : '';

      return this.parseResponse(responseContent);
    } catch (error) {
      logger.error('Error in AI routing:', error);
      return { tools: [] };
    }
  }

  /**
   * Parse AI response to extract matched tools
   */
  private parseResponse(responseContent: string): AIRouteResult {
    try {
      // Extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { tools: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]) as { tools: Array<{ id: string; confidence: number }> };

      if (!parsed.tools || !Array.isArray(parsed.tools)) {
        return { tools: [] };
      }

      // Map to full tool information
      const matchedTools: MatchedTool[] = [];
      for (const match of parsed.tools) {
        if (match.confidence >= 0.5) {
          const tool = getToolById(match.id);
          if (tool) {
            matchedTools.push({
              id: tool.id,
              name: tool.name,
              nameEn: tool.nameEn,
              description: tool.description,
              confidence: match.confidence,
              category: tool.category,
            });
          }
        }
      }

      // Sort by confidence descending
      matchedTools.sort((a, b) => b.confidence - a.confidence);

      return { tools: matchedTools.slice(0, 3) };
    } catch (error) {
      logger.warn('Failed to parse AI routing response:', error, 'Response:', responseContent);
      return { tools: [] };
    }
  }
}
