import type {
  TaskDto,
  CreateTaskDto,
  UpdateTaskDto,
  TaskTriggerResultDto,
  AvailableActionDto,
  ExecutionLogListDto,
} from '@x-console/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

// Type for task list response
interface TaskListResponse {
  tasks: TaskDto[];
}

/**
 * Task API endpoints
 */
export const taskApi = {
  /**
   * Get all tasks for current user
   */
  getTasks: async (): Promise<TaskListResponse> => {
    const response = await request.get<unknown, ApiResponse<TaskListResponse>>('/api/v1/tasks');
    return response.data;
  },

  /**
   * Get a single task by ID
   */
  getTask: async (id: string): Promise<TaskDto> => {
    const response = await request.get<unknown, ApiResponse<TaskDto>>(`/api/v1/tasks/${id}`);
    return response.data;
  },

  /**
   * Create a new task
   */
  createTask: async (data: CreateTaskDto): Promise<TaskDto> => {
    const response = await request.post<CreateTaskDto, ApiResponse<TaskDto>>('/api/v1/tasks', data);
    return response.data;
  },

  /**
   * Update a task
   */
  updateTask: async (id: string, data: UpdateTaskDto): Promise<TaskDto> => {
    const response = await request.patch<UpdateTaskDto, ApiResponse<TaskDto>>(
      `/api/v1/tasks/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a task
   */
  deleteTask: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/tasks/${id}`
    );
    return response.data;
  },

  /**
   * Toggle task enabled status
   */
  toggleTask: async (id: string): Promise<TaskDto> => {
    const response = await request.patch<unknown, ApiResponse<TaskDto>>(
      `/api/v1/tasks/${id}/toggle`
    );
    return response.data;
  },

  /**
   * Manually trigger a task
   */
  triggerTask: async (id: string): Promise<TaskTriggerResultDto> => {
    const response = await request.post<unknown, ApiResponse<TaskTriggerResultDto>>(
      `/api/v1/tasks/${id}/trigger`
    );
    return response.data;
  },

  /**
   * Get available actions
   */
  getAvailableActions: async (): Promise<{ actions: AvailableActionDto[] }> => {
    const response = await request.get<unknown, ApiResponse<{ actions: AvailableActionDto[] }>>(
      '/api/v1/tasks/actions/list'
    );
    return response.data;
  },

  /**
   * Get execution logs for a task
   */
  getTaskExecutions: async (
    id: string,
    limit?: number,
    offset?: number
  ): Promise<ExecutionLogListDto> => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());
    const query = params.toString();
    const response = await request.get<unknown, ApiResponse<ExecutionLogListDto>>(
      `/api/v1/tasks/${id}/executions${query ? `?${query}` : ''}`
    );
    return response.data;
  },
};
