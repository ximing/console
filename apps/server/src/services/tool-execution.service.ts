import { ChatOpenAI } from '@langchain/openai';
import { Service } from 'typedi';
import * as crypto from 'crypto';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { getToolById } from './tool-registry.js';

export interface ToolExecutionRequest {
  toolId: string;
  input: string;
  options?: Record<string, unknown>;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: string;
  error?: string;
}

/**
 * Service for executing tools in command palette
 */
@Service()
export class ToolExecutionService {
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
   * Execute a tool with the given input
   */
  async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const { toolId, input, options = {} } = request;

    // Validate tool exists
    const tool = getToolById(toolId);
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolId}`,
      };
    }

    try {
      switch (toolId) {
        // Text processing tools
        case 'json-format':
          return this.executeJsonFormat(input);
        case 'json-validate':
          return this.executeJsonValidate(input);
        case 'base64-encode':
          return this.executeBase64Encode(input);
        case 'base64-decode':
          return this.executeBase64Decode(input);
        case 'url-encode':
          return this.executeUrlEncode(input);
        case 'url-decode':
          return this.executeUrlDecode(input);
        case 'markdown-preview':
          return this.executeMarkdownPreview(input);

        // Developer tools
        case 'uuid-generate':
          return this.executeUuidGenerate(options.count as number);
        case 'color-convert':
          return this.executeColorConvert(input);
        case 'timestamp-convert':
          return this.executeTimestampConvert(input);
        case 'hash-md5':
          return this.executeHashMd5(input);
        case 'hash-sha256':
          return this.executeHashSha256(input);

        // AI tools
        case 'ai-translate':
          return this.executeAiTranslate(input, options);
        case 'ai-summarize':
          return this.executeAiSummarize(input);
        case 'ai-explain-code':
          return this.executeAiExplainCode(input);

        default:
          return {
            success: false,
            error: `Tool not implemented: ${toolId}`,
          };
      }
    } catch (error) {
      logger.error(`Error executing tool ${toolId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Text processing tools

  private executeJsonFormat(input: string): ToolExecutionResult {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      return { success: true, result: formatted };
    } catch {
      return { success: false, error: 'Invalid JSON' };
    }
  }

  private executeJsonValidate(input: string): ToolExecutionResult {
    try {
      JSON.parse(input);
      return { success: true, result: 'Valid JSON' };
    } catch {
      return { success: false, error: 'Invalid JSON' };
    }
  }

  private executeBase64Encode(input: string): ToolExecutionResult {
    try {
      const encoded = Buffer.from(input, 'utf-8').toString('base64');
      return { success: true, result: encoded };
    } catch {
      return { success: false, error: 'Failed to encode to Base64' };
    }
  }

  private executeBase64Decode(input: string): ToolExecutionResult {
    try {
      const decoded = Buffer.from(input.trim(), 'base64').toString('utf-8');
      return { success: true, result: decoded };
    } catch {
      return { success: false, error: 'Invalid Base64 string' };
    }
  }

  private executeUrlEncode(input: string): ToolExecutionResult {
    try {
      const encoded = encodeURIComponent(input);
      return { success: true, result: encoded };
    } catch {
      return { success: false, error: 'Failed to URL encode' };
    }
  }

  private executeUrlDecode(input: string): ToolExecutionResult {
    try {
      const decoded = decodeURIComponent(input);
      return { success: true, result: decoded };
    } catch {
      return { success: false, error: 'Invalid URL encoded string' };
    }
  }

  private executeMarkdownPreview(input: string): ToolExecutionResult {
    // Return raw markdown - frontend will render it with highlighting
    return { success: true, result: input };
  }

  // Developer tools

  private executeUuidGenerate(count: number = 1): ToolExecutionResult {
    const uuids: string[] = [];
    for (let i = 0; i < Math.min(count || 1, 100); i++) {
      uuids.push(crypto.randomUUID());
    }
    return { success: true, result: uuids.join('\n') };
  }

  private executeColorConvert(input: string): ToolExecutionResult {
    const color = input.trim();

    // HEX to RGB
    const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
      const r = parseInt(hexMatch[1], 16);
      const g = parseInt(hexMatch[2], 16);
      const b = parseInt(hexMatch[3], 16);
      const hsl = this.rgbToHsl(r, g, b);
      return {
        success: true,
        result: `HEX: #${hexMatch[1]}${hexMatch[2]}${hexMatch[3]}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      };
    }

    // RGB to HEX
    const rgbMatch = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      if (r <= 255 && g <= 255 && b <= 255) {
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        const hsl = this.rgbToHsl(r, g, b);
        return {
          success: true,
          result: `HEX: ${hex}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
        };
      }
    }

    // HSL to HEX/RGB
    const hslMatch = color.match(/^hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)$/i);
    if (hslMatch) {
      const h = parseInt(hslMatch[1], 10);
      const s = parseInt(hslMatch[2], 10) / 100;
      const l = parseInt(hslMatch[3], 10) / 100;
      const rgb = this.hslToRgb(h, s, l);
      const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
      return {
        success: true,
        result: `HEX: ${hex}\nRGB: rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\nHSL: hsl(${h}, ${s * 100}%, ${l * 100}%)`,
      };
    }

    return { success: false, error: 'Invalid color format. Use HEX (#ff0000), RGB (rgb(255, 0, 0), or HSL (hsl(0, 100%, 50%))' };
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  private executeTimestampConvert(input: string): ToolExecutionResult {
    const value = input.trim();
    const isSeconds = !value.includes('-') && value.length <= 10;

    // If input is a number, treat as timestamp
    if (/^\d+$/.test(value)) {
      const timestamp = isSeconds ? parseInt(value) * 1000 : parseInt(value);
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return { success: false, error: 'Invalid timestamp' };
      }
      return {
        success: true,
        result: `Unix (seconds): ${Math.floor(date.getTime() / 1000)}\nUnix (ms): ${date.getTime()}\nISO 8601: ${date.toISOString()}\nLocal: ${date.toLocaleString('zh-CN')}`,
      };
    }

    // Try to parse as date string
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { success: false, error: 'Invalid date format. Use Unix timestamp or date string' };
    }
    return {
      success: true,
      result: `Unix (seconds): ${Math.floor(date.getTime() / 1000)}\nUnix (ms): ${date.getTime()}\nISO 8601: ${date.toISOString()}\nLocal: ${date.toLocaleString('zh-CN')}`,
    };
  }

  private executeHashMd5(input: string): ToolExecutionResult {
    const hash = crypto.createHash('md5').update(input).digest('hex');
    return { success: true, result: hash };
  }

  private executeHashSha256(input: string): ToolExecutionResult {
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return { success: true, result: hash };
  }

  // AI tools

  private async executeAiTranslate(input: string, options: Record<string, unknown>): Promise<ToolExecutionResult> {
    const targetLang = (options.targetLanguage as string) || 'English';
    const systemPrompt = `你是一个专业的翻译助手。将用户提供的文本翻译成${targetLang}。

要求：
1. 只返回翻译结果，不要添加任何解释
2. 保持原文的格式和风格
3. 如果文本已经是你要翻译的语言，直接返回原文`;

    try {
      const response = await this.model.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ]);

      return {
        success: true,
        result: typeof response.content === 'string' ? response.content : String(response.content),
      };
    } catch (error) {
      logger.error('AI translation error:', error);
      return { success: false, error: 'Translation failed' };
    }
  }

  private async executeAiSummarize(input: string): Promise<ToolExecutionResult> {
    const systemPrompt = `你是一个文本总结助手。将用户提供的文本进行精简总结。

要求：
1. 提取原文的核心要点
2. 保持简洁，控制在原文长度的30%左右
3. 使用清晰的语言
4. 如果文本太短无法总结，直接返回原文`;

    try {
      const response = await this.model.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ]);

      return {
        success: true,
        result: typeof response.content === 'string' ? response.content : String(response.content),
      };
    } catch (error) {
      logger.error('AI summarize error:', error);
      return { success: false, error: 'Summarization failed' };
    }
  }

  private async executeAiExplainCode(input: string): Promise<ToolExecutionResult> {
    const systemPrompt = `你是一个代码解释助手。解释用户提供的代码的功能和工作原理。

要求：
1. 解释代码的整体功能
2. 解释关键部分的实现逻辑
3. 如果是函数或方法，说明输入输出
4. 使用清晰的语言，适当使用代码高亮
5. 如果无法识别代码类型，尝试根据内容进行合理推测`;

    try {
      const response = await this.model.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ]);

      return {
        success: true,
        result: typeof response.content === 'string' ? response.content : String(response.content),
      };
    } catch (error) {
      logger.error('AI explain code error:', error);
      return { success: false, error: 'Code explanation failed' };
    }
  }
}
