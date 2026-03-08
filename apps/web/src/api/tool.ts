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

// Intent recognition types
export interface IntentResult {
  intentId: string;
  intentName: string;
  confidence: number;
  isHighConfidence: boolean;
  extractedParams: Record<string, unknown>;
  rawInput: string;
}

export interface IntentRecognitionResult {
  intent: IntentResult | null;
  alternativeIntents: IntentResult[];
}

export interface IntentExecutionResult {
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

/**
 * Recognize intent from user input using AI
 */
export const recognizeIntent = async (input: string, modelId?: string): Promise<IntentRecognitionResult> => {
  const response = await request.post<unknown, ApiResponse<IntentRecognitionResult>>('/api/command-palette/intent', {
    input,
    modelId: modelId || undefined,
  });
  if (response.code !== 0) {
    console.error('Intent recognition error:', response.msg);
    return { intent: null, alternativeIntents: [] };
  }
  return response.data;
};

/**
 * Execute tool from recognized intent (for confirmed or auto-executed intents)
 */
export const executeIntent = async (
  intentId: string,
  input: string,
  params?: Record<string, unknown>,
  modelId?: string
): Promise<IntentExecutionResult> => {
  const response = await request.post<unknown, ApiResponse<{ toolId: string; toolName: string; result: string }>>(
    '/api/command-palette/execute',
    {
      intentId,
      input,
      params,
      modelId: modelId || undefined,
    }
  );
  if (response.code !== 0) {
    return { success: false, error: response.msg || 'Intent execution failed' };
  }
  return { success: true, result: response.data.result };
};
