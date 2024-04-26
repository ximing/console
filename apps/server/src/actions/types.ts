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
  /**
   * Execute the action with given parameters
   * @param params - Configuration parameters for the action
   * @returns Promise resolving to ActionResult
   */
  execute(params: Record<string, unknown>): Promise<ActionResult>;
}

/**
 * Action configuration stored in database
 */
export interface ActionConfig {
  actionId: string;
  config: Record<string, unknown>;
}
