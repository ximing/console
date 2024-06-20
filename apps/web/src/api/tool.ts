import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

export interface Tool {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  confidence: number;
  category?: 'text' | 'developer' | 'ai';
}

export interface AIRouteResponse {
  tools: Tool[];
}

export interface ToolExecutionRequest {
  toolId: string;
  input: string;
  options?: Record<string, unknown>;
  modelId?: string;
}

export interface ToolExecutionResponse {
  success: boolean;
  result?: string;
  error?: string;
}

/**
 * Route user input to matching tools using AI
 */
export const routeTool = async (input: string, modelId?: string): Promise<Tool[]> => {
  const response = await request.post<unknown, ApiResponse<AIRouteResponse>>('/api/ai-route', {
    input,
    modelId: modelId || undefined,
  });
  if (response.code !== 0) {
    console.error('AI route error:', response.msg);
    return [];
  }
  return response.data.tools;
};

/**
 * Execute a tool with the given input
 */
export const executeTool = async (data: ToolExecutionRequest): Promise<ToolExecutionResponse> => {
  const response = await request.post<unknown, ApiResponse<{ result: string }>>('/api/tool/execute', data);
  if (response.code !== 0) {
    return { success: false, error: response.msg || 'Tool execution failed' };
  }
  return { success: true, result: response.data.result };
};
