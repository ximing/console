/**
 * Tool definitions for command palette AI routing
 * These tools will be used by the AI to match user input to available functionality
 */

export interface Tool {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  keywords: string[];
  category: 'text' | 'developer' | 'ai';
}

export const TOOL_REGISTRY: Tool[] = [
  {
    id: 'json-format',
    name: 'JSON 格式化',
    nameEn: 'JSON Formatter',
    description: '将 JSON 字符串格式化为美观的缩进形式',
    keywords: ['json', '格式化', 'format', '美化', 'pretty'],
    category: 'text',
  },
  {
    id: 'json-validate',
    name: 'JSON 验证',
    nameEn: 'JSON Validator',
    description: '验证 JSON 字符串是否有效',
    keywords: ['json', '验证', 'validate', '检查', 'valid'],
    category: 'text',
  },
  {
    id: 'base64-encode',
    name: 'Base64 编码',
    nameEn: 'Base64 Encoder',
    description: '将字符串编码为 Base64 格式',
    keywords: ['base64', '编码', 'encode', '转换'],
    category: 'text',
  },
  {
    id: 'base64-decode',
    name: 'Base64 解码',
    nameEn: 'Base64 Decoder',
    description: '将 Base64 字符串解码为原始内容',
    keywords: ['base64', '解码', 'decode', '转换'],
    category: 'text',
  },
  {
    id: 'url-encode',
    name: 'URL 编码',
    nameEn: 'URL Encoder',
    description: '对字符串进行 URL 编码',
    keywords: ['url', '编码', 'encode', '百分号编码', 'uri'],
    category: 'text',
  },
  {
    id: 'url-decode',
    name: 'URL 解码',
    nameEn: 'URL Decoder',
    description: '对 URL 编码的字符串进行解码',
    keywords: ['url', '解码', 'decode', '百分号解码', 'uri'],
    category: 'text',
  },
  {
    id: 'markdown-preview',
    name: 'Markdown 预览',
    nameEn: 'Markdown Preview',
    description: '将 Markdown 渲染为 HTML 预览',
    keywords: ['markdown', 'md', '预览', 'preview', '渲染', 'render'],
    category: 'text',
  },
  {
    id: 'uuid-generate',
    name: 'UUID 生成',
    nameEn: 'UUID Generator',
    description: '生成符合 RFC 4122 标准的 UUID v4',
    keywords: ['uuid', 'guid', '生成', 'generate', '随机', '唯一'],
    category: 'developer',
  },
  {
    id: 'color-convert',
    name: '颜色转换',
    nameEn: 'Color Converter',
    description: '在 HEX、RGB、HSL 颜色格式之间转换',
    keywords: ['颜色', 'color', 'hex', 'rgb', 'hsl', '转换', 'convert'],
    category: 'developer',
  },
  {
    id: 'timestamp-convert',
    name: '时间戳转换',
    nameEn: 'Timestamp Converter',
    description: '在 Unix 时间戳和日期时间之间转换',
    keywords: ['时间戳', 'timestamp', '日期', 'date', '时间', 'time', '转换'],
    category: 'developer',
  },
  {
    id: 'hash-md5',
    name: 'MD5 哈希',
    nameEn: 'MD5 Hash',
    description: '计算字符串的 MD5 哈希值',
    keywords: ['md5', 'hash', '哈希', '加密', 'digest'],
    category: 'developer',
  },
  {
    id: 'hash-sha256',
    name: 'SHA256 哈希',
    nameEn: 'SHA256 Hash',
    description: '计算字符串的 SHA256 哈希值',
    keywords: ['sha256', 'sha', 'hash', '哈希', '加密', 'digest'],
    category: 'developer',
  },
  {
    id: 'ai-translate',
    name: 'AI 翻译',
    nameEn: 'AI Translator',
    description: '使用 AI 将文本翻译成目标语言',
    keywords: ['翻译', 'translate', '语言', 'language', '中英', '英文', '中文'],
    category: 'ai',
  },
  {
    id: 'ai-summarize',
    name: 'AI 总结',
    nameEn: 'AI Summarizer',
    description: '使用 AI 总结文本内容',
    keywords: ['总结', 'summarize', '摘要', 'summary', '概括', '精简'],
    category: 'ai',
  },
  {
    id: 'ai-explain-code',
    name: 'AI 代码解释',
    nameEn: 'AI Code Explainer',
    description: '使用 AI 解释代码的功能和工作原理',
    keywords: ['代码', 'code', '解释', 'explain', '说明', '分析', '编程'],
    category: 'ai',
  },
];

/**
 * Get tool by ID
 */
export function getToolById(id: string): Tool | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: Tool['category']): Tool[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}
