import { Container } from 'typedi';

import type {
  ActionHandler,
  ActionResult,
  ActionParamSchema,
  ActionContext,
  ModelInfo,
} from './types.js';
import { LLMService } from '../services/llm.service.js';
import { NotificationService } from '../services/notification.service.js';

import type { NotificationChannel, NotificationOwnership } from '@x-console/dto';

/**
 * Meal nutrition action configuration
 */
export interface MealNutritionConfig {
  /** 用餐人：先生/太太/夫妇（一起） */
  recipient?: 'husband' | 'wife' | 'couple';
  /** 特殊偏好或饮食限制（先生） */
  husbandPreferences?: string;
  /** 特殊偏好或饮食限制（太太） */
  wifePreferences?: string;
  /** 微信群ID列表，用于发送通知到群聊 */
  groupIds?: string[];
  /** 选择的模型ID */
  modelId?: string;
}

/**
 * Meal Nutrition Action - Provides nutritional meal advice for elderly couples
 * in Northeast China (Heilongjiang)
 *
 * Determines meal type based on current time:
 * - Breakfast: 5:00-9:00
 * - Lunch: 11:00-14:00
 * - Dinner: 17:00-20:00
 */
export class MealNutritionAction implements ActionHandler {
  id = 'meal-nutrition';
  name = '营养餐食建议';
  description = '为60+老年夫妇提供东北风味营养餐食建议';
  requiresModel = true;

  paramSchema: Record<string, ActionParamSchema> = {
    recipient: {
      type: 'string',
      description: '用餐人：先生/太太/夫妇（一起）',
      required: false,
      enum: ['husband', 'wife', 'couple'],
      default: 'couple',
    },
    husbandPreferences: {
      type: 'string',
      description: '先生的特殊偏好或饮食限制（可选）',
      required: false,
    },
    wifePreferences: {
      type: 'string',
      description: '太太的特殊偏好或饮食限制（可选）',
      required: false,
    },
    groupIds: {
      type: 'array',
      description: '微信群ID列表，用于发送通知到群聊（可选）',
      required: false,
      items: {
        type: 'string',
      },
    },
  };

  /**
   * Determine meal type based on current hour
   */
  private getMealType(): 'breakfast' | 'lunch' | 'dinner' {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 9) {
      return 'breakfast';
    } else if (hour >= 9 && hour < 14) {
      return 'lunch';
    } else if (hour >= 14 && hour < 20) {
      return 'dinner';
    }

    // Default to breakfast if outside meal times
    return 'breakfast';
  }

  /**
   * Get meal type display name in Chinese
   */
  private getMealTypeName(mealType: 'breakfast' | 'lunch' | 'dinner'): string {
    const names = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
    };
    return names[mealType];
  }

  /**
   * Get recipient display name in Chinese
   */
  private getRecipientName(recipient: 'husband' | 'wife'): string {
    return recipient === 'husband' ? '先生' : '太太';
  }

  /**
   * Get available models for this action
   */
  async getModels(userId: string): Promise<ModelInfo[]> {
    const llmService = Container.get(LLMService);
    return llmService.listModels(userId);
  }

  async execute(params: Record<string, unknown>, context?: ActionContext): Promise<ActionResult> {
    const config = params as unknown as MealNutritionConfig;
    const recipient = config.recipient || 'couple';
    const husbandPreferences = config.husbandPreferences || '';
    const wifePreferences = config.wifePreferences || '';
    const groupIds = config.groupIds || [];
    const modelId = config.modelId as string | undefined;
    const userId = context?.userId;

    // Determine meal type based on current time
    const mealType = this.getMealType();
    const mealTypeName = this.getMealTypeName(mealType);

    // Build the prompt for AI
    const systemPrompt = `你是一位贴心的东北营养师，专门为60岁以上的黑龙江老年夫妇提供饮食建议。你非常了解东北老人的生活习惯、烹饪能力和饮食偏好。

你的职责是根据当前餐食类型，提供**简单易做、营养均衡、符合东北口味**的餐食建议。

🎯 **核心原则（必须遵守）：**
1. **简单易做**：推荐老年人能轻松完成的烹饪方法（炖、炒、蒸、煮），避免复杂步骤
2. **东北风味**：优先推荐东北家常菜，少推荐或不推荐西餐、日料等不熟悉的菜式
3. **食材常见**：使用东北地区容易买到的食材（白菜、土豆、萝卜、猪肉、鸡蛋、豆腐等）
4. **营养均衡**：低盐、低糖、高钙、易消化，适合老年人身体需求
5. **温暖亲切**：像子女关心父母一样，语气温暖贴心

🍲 **东北老人饮食特点（必须考虑）：**
- **主食偏好**：米饭、馒头、面条、饺子、包子、玉米饼等
- **烹饪习惯**：喜欢炖菜、炒菜、蒸菜，不习惯复杂的西式烹饪
- **食材可得**：冬季以白菜、土豆、萝卜、酸菜为主，夏季有更多新鲜蔬菜
- **口味偏好**：咸鲜口味，喜欢葱姜蒜调味，不太能吃辣
- **体力限制**：老年人做饭容易累，建议30分钟内能完成的简单菜肴

⚠️ **重要提醒：**
1. **粥类要少推荐**：粥的营养密度低，升糖快，老年人应适量食用
2. **避免生冷**：东北老人肠胃较弱，避免推荐生冷食物（沙拉、刺身等）
3. **软烂易嚼**：考虑牙齿状况，推荐炖得软烂的菜肴
4. **分量适中**：老年人食量小，避免推荐分量太大的菜肴
5. **季节适应**：冬季推荐温热滋补的炖菜，夏季推荐清爽的凉拌菜

📋 **餐食建议结构（请按此格式回答）：**
1. **主食推荐**：1-2种简单主食（如：二米饭、全麦馒头、玉米饼等）
2. **菜品推荐**：2-3道东北家常菜（必须包含蛋白质来源）
3. **烹饪提示**：简单说明关键步骤和注意事项
4. **营养说明**：简要说明本餐的主要营养亮点
5. **贴心提醒**：像子女一样关心父母的温暖话语

💡 **推荐食材（东北常见易得）：**
- **主食类**：大米、小米、玉米面、全麦面粉、红薯、土豆
- **蛋白质**：鸡蛋、猪肉、鸡肉、鱼肉、豆腐、豆制品
- **蔬菜类**：白菜、土豆、萝卜、西红柿、黄瓜、茄子、豆角
- **调味品**：葱、姜、蒜、酱油、醋、花椒、大料

请用温暖亲切的语气，像关心自己父母一样给出建议。`;

    const isCouple = recipient === 'couple';

    // Build user prompt based on recipient
    let userPrompt: string;
    if (isCouple) {
      userPrompt = `请为先生和太太两人一起准备${mealTypeName}建议。

${husbandPreferences ? `先生特别偏好：${husbandPreferences}` : ''}
${wifePreferences ? `太太特别偏好：${wifePreferences}` : ''}

当前时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}`;
    } else {
      const recipientName = this.getRecipientName(recipient);
      const preferences = recipient === 'husband' ? husbandPreferences : wifePreferences;
      userPrompt = `请为${recipientName}提供${mealTypeName}建议。

${preferences ? `特别偏好：${preferences}` : ''}

当前时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}
不需要寒暄，直接给出你的建议即可`;
    }

    try {
      // Get LLM service from container
      const llmService = Container.get(LLMService);

      if (!userId) {
        return {
          success: false,
          error: {
            message: 'User ID is required for this action',
            code: 'USER_ID_REQUIRED',
          },
        };
      }

      // Generate meal suggestion using LLM
      let mealSuggestion: string;
      if (modelId) {
        const response = await llmService.chatWithModel(userId, modelId, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });
        mealSuggestion = response.choices[0]?.message.content || '';
      } else {
        const response = await llmService.chat(userId, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });
        mealSuggestion = response.choices[0]?.message.content || '';
      }

      const notificationIds: string[] = [];

      // If groupIds provided, create wechat notifications for each group
      if (groupIds.length > 0) {
        const notificationService = Container.get(NotificationService);

        for (const groupId of groupIds) {
          const notification = await notificationService.createNotification({
            channel: 'wechat' as NotificationChannel,
            ownership: 'group' as NotificationOwnership,
            ownershipId: groupId,
            content: mealSuggestion,
            messageType: 'text',
          });
          notificationIds.push(notification.id);
        }
      }

      return {
        success: true,
        data: {
          mealType,
          recipient,
          notificationIds,
          suggestion: mealSuggestion,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        error: {
          message: `营养餐食建议生成失败：${errorMessage}`,
          code: 'MEAL_NUTRITION_ERROR',
        },
      };
    }
  }
}
