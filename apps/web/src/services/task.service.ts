import { Service } from '@rabjs/react';
import { taskApi } from '../api/task';
import { userModelApi } from '../api/user-model';
import type {
  TaskDto,
  CreateTaskDto,
  UpdateTaskDto,
  AvailableActionDto,
  ExecutionLogDto,
  UserModelDto,
} from '@x-console/dto';

/**
 * Task Service
 * Manages task orchestration state and operations
 */
export class TaskService extends Service {
  // State
  tasks: TaskDto[] = [];
  availableActions: AvailableActionDto[] = [];
  userModels: UserModelDto[] = [];
  executions: ExecutionLogDto[] = [];
  executionsTotal = 0;
  isLoading = false;
  isLoadingExecutions = false;
  error: string | null = null;

  /**
   * Fetch all tasks for current user
   */
  async loadTasks(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const data = await taskApi.getTasks();
      this.tasks = data.tasks;
    } catch (err) {
      this.error = 'Failed to load tasks';
      console.error('Load tasks error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Fetch available actions
   */
  async loadAvailableActions(): Promise<void> {
    try {
      const data = await taskApi.getAvailableActions();
      this.availableActions = data.actions;
    } catch (err) {
      console.error('Load available actions error:', err);
    }
  }

  /**
   * Fetch user configured models
   */
  async loadUserModels(): Promise<void> {
    try {
      const data = await userModelApi.getModels();
      this.userModels = data.models;
    } catch (err) {
      console.error('Load user models error:', err);
    }
  }

  /**
   * Create a new task
   */
  async createTask(data: CreateTaskDto): Promise<TaskDto | null> {
    try {
      const task = await taskApi.createTask(data);
      // Add to local tasks list
      this.tasks = [task, ...this.tasks];
      return task;
    } catch (err) {
      this.error = 'Failed to create task';
      console.error('Create task error:', err);
      return null;
    }
  }

  /**
   * Update a task
   */
  async updateTask(id: string, data: UpdateTaskDto): Promise<TaskDto | null> {
    try {
      const task = await taskApi.updateTask(id, data);
      // Update local tasks list
      this.tasks = this.tasks.map((t) => (t.id === id ? task : t));
      return task;
    } catch (err) {
      this.error = 'Failed to update task';
      console.error('Update task error:', err);
      return null;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<boolean> {
    try {
      await taskApi.deleteTask(id);
      // Remove from local tasks list
      this.tasks = this.tasks.filter((t) => t.id !== id);
      return true;
    } catch (err) {
      this.error = 'Failed to delete task';
      console.error('Delete task error:', err);
      return false;
    }
  }

  /**
   * Toggle task enabled status
   */
  async toggleTask(id: string): Promise<TaskDto | null> {
    try {
      const task = await taskApi.toggleTask(id);
      // Update local tasks list
      this.tasks = this.tasks.map((t) => (t.id === id ? task : t));
      return task;
    } catch (err) {
      this.error = 'Failed to toggle task';
      console.error('Toggle task error:', err);
      return null;
    }
  }

  /**
   * Manually trigger a task
   */
  async triggerTask(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await taskApi.triggerTask(id);
      return {
        success: result.success,
        message: result.success
          ? 'Task executed successfully'
          : result.error?.message || 'Task execution failed',
      };
    } catch (err) {
      const message = 'Failed to trigger task';
      console.error('Trigger task error:', err);
      return { success: false, message };
    }
  }

  /**
   * Load execution logs for a task
   */
  async loadTaskExecutions(taskId: string, limit = 20, offset = 0): Promise<void> {
    this.isLoadingExecutions = true;

    try {
      const result = await taskApi.getTaskExecutions(taskId, limit, offset);
      this.executions = result.executions;
      this.executionsTotal = result.total;
    } catch (err) {
      console.error('Load executions error:', err);
    } finally {
      this.isLoadingExecutions = false;
    }
  }
}
