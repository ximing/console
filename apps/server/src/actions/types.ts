/**
 * Action types for the task orchestration system
 */

/**
 * Schema for action parameters
 */
export interface ActionParamSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
  properties?: Record<string, ActionParamSchema>;
  enum?: string[];
  items?: ActionParamSchema;
}

/**
 * Result returned by action execution
 */
export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Context passed to action execution
 */
export interface ActionContext {
  /** User ID who triggered the action */
  userId: string;
}

/**
 * Model info for action
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  modelName: string;
}

/**
 * Interface for action handlers
 */
export interface ActionHandler {
  /** Unique identifier for the action */
  id: string;
  /** Display name for the action */
  name: string;
  /** Description of what the action does */
  description: string;
  /** Schema for action parameters */
  paramSchema: Record<string, ActionParamSchema>;
  /** Whether this action requires user to select a model */
  requiresModel?: boolean;
  /**
   * Get available models for this action
   * @param userId - The user ID
   * @returns Promise resolving to array of ModelInfo
   */
  getModels?: (userId: string) => Promise<ModelInfo[]>;
  /**
   * Execute the action with given parameters
   * @param params - Configuration parameters for the action
   * @param context - Execution context including userId
   * @returns Promise resolving to ActionResult
   */
  execute(params: Record<string, unknown>, context?: ActionContext): Promise<ActionResult>;
}

/**
 * Action configuration stored in database
 */
export interface ActionConfig {
  actionId: string;
  config: Record<string, unknown>;
}
