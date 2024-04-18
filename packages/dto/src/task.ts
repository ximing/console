/**
 * Task DTOs for task orchestration system
 */

export type TaskTriggerType = 'manual' | 'scheduled';

export type ExecutionStatus = 'success' | 'failed';

/**
 * DTO for creating a new task
 */
export interface CreateTaskDto {
  name: string;
  triggerType: TaskTriggerType;
  cronExpression?: string;
  actionId: string;
  actionConfig?: Record<string, unknown>;
}

/**
 * DTO for updating an existing task
 */
export interface UpdateTaskDto {
  name?: string;
  triggerType?: TaskTriggerType;
  cronExpression?: string;
  enabled?: boolean;
  actionId?: string;
  actionConfig?: Record<string, unknown>;
}

/**
 * DTO for task response
 */
export interface TaskDto {
  id: string;
  name: string;
  triggerType: TaskTriggerType;
  cronExpression?: string;
  enabled: boolean;
  actionId: string;
  actionConfig?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for task list response
 */
export interface TaskListDto {
  tasks: TaskDto[];
}

/**
 * DTO for execution log
 */
export interface ExecutionLogDto {
  id: string;
  taskId: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  errorType?: string;
  result?: unknown;
}

/**
 * DTO for execution log list response
 */
export interface ExecutionLogListDto {
  executions: ExecutionLogDto[];
  total: number;
}

/**
 * DTO for task trigger response
 */
export interface TaskTriggerResultDto {
  success: boolean;
  executionId: string;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * DTO for available action
 */
export interface AvailableActionDto {
  id: string;
  name: string;
  description: string;
}
