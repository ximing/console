import { Service } from 'typedi';
import { eq, and, count } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { tasks, type Task, type NewTask } from '../db/schema/tasks.js';
import { executionLogs, type NewExecutionLog } from '../db/schema/execution-logs.js';
import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import { ActionRegistry } from '../actions/registry.js';
import type { ActionResult, ActionContext } from '../actions/types.js';

@Service()
export class TaskService {
  constructor(private actionRegistry: ActionRegistry) {}

  /**
   * Get all tasks for a user
   */
  async getTasks(userId: string): Promise<Task[]> {
    const db = getDatabase();
    const results = await db.select().from(tasks).where(eq(tasks.createdBy, userId));
    return results;
  }

  /**
   * Get a task by ID
   */
  async getTask(id: string, userId: string): Promise<Task | null> {
    const db = getDatabase();
    const results = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.createdBy, userId)))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all enabled scheduled tasks
   */
  async getEnabledScheduledTasks(): Promise<Task[]> {
    const db = getDatabase();
    const results = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.triggerType, 'scheduled' as any), eq(tasks.enabled, true)));
    return results;
  }

  /**
   * Create a new task
   */
  async createTask(
    userId: string,
    taskData: Omit<NewTask, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
  ): Promise<Task> {
    const db = getDatabase();
    const id = generateUid();

    const newTask: NewTask = {
      id,
      ...taskData,
      createdBy: userId,
    };

    await db.insert(tasks).values(newTask);

    const [created] = await db.select().from(tasks).where(eq(tasks.id, id));
    return created;
  }

  /**
   * Update a task
   */
  async updateTask(
    id: string,
    userId: string,
    updateData: Partial<
      Pick<
        Task,
        'name' | 'triggerType' | 'cronExpression' | 'enabled' | 'actionId' | 'actionConfig'
      >
    >
  ): Promise<Task | null> {
    const db = getDatabase();

    const existing = await this.getTask(id, userId);
    if (!existing) {
      return null;
    }

    await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, id), eq(tasks.createdBy, userId)));

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
    return updated;
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string, userId: string): Promise<boolean> {
    const db = getDatabase();

    const existing = await this.getTask(id, userId);
    if (!existing) {
      return false;
    }

    // Delete associated execution logs (cascade should handle this, but being explicit)
    await db.delete(executionLogs).where(eq(executionLogs.taskId, id));

    // Delete the task
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.createdBy, userId)));

    return true;
  }

  /**
   * Toggle task enabled status
   */
  async toggleTask(id: string, userId: string): Promise<Task | null> {
    const existing = await this.getTask(id, userId);
    if (!existing) {
      return null;
    }

    return this.updateTask(id, userId, { enabled: !existing.enabled });
  }

  /**
   * Execute a task and record the execution log
   */
  async executeTask(taskId: string): Promise<ActionResult> {
    const db = getDatabase();
    const executionId = generateUid();

    // Get the task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) {
      return {
        success: false,
        error: { message: 'Task not found', code: 'TASK_NOT_FOUND' },
      };
    }

    // Create execution log entry (started)
    const logEntry: NewExecutionLog = {
      id: executionId,
      taskId: task.id,
      status: 'failed',
      startedAt: new Date(),
    };

    try {
      // Get the action handler
      const handler = this.actionRegistry.get(task.actionId);
      if (!handler) {
        const result: ActionResult = {
          success: false,
          error: {
            message: `Action handler "${task.actionId}" not found`,
            code: 'ACTION_NOT_FOUND',
          },
        };

        await db.insert(executionLogs).values({
          ...logEntry,
          finishedAt: new Date(),
          errorMessage: result.error?.message,
          errorType: result.error?.code,
        });

        return result;
      }

      // Execute the action
      const config = (task.actionConfig as Record<string, unknown>) || {};
      const context: ActionContext = {
        userId: task.createdBy,
      };
      const result = await handler.execute(config, context);

      // Update execution log
      await db.insert(executionLogs).values({
        ...logEntry,
        status: result.success ? 'success' : 'failed',
        finishedAt: new Date(),
        errorMessage: result.error?.message,
        errorType: result.error?.code,
        result: result.data,
      });

      return result;
    } catch (error: any) {
      logger.error('Task execution error:', error);

      await db.insert(executionLogs).values({
        ...logEntry,
        finishedAt: new Date(),
        errorMessage: error.message || 'Unknown error',
        errorType: 'EXECUTION_ERROR',
      });

      return {
        success: false,
        error: { message: error.message || 'Unknown error', code: 'EXECUTION_ERROR' },
      };
    }
  }

  /**
   * Get execution logs for a task
   */
  async getExecutionLogs(
    taskId: string,
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<{ logs: any[]; total: number }> {
    const db = getDatabase();

    // Verify task belongs to user
    const task = await this.getTask(taskId, userId);
    if (!task) {
      return { logs: [], total: 0 };
    }

    const results = await db
      .select()
      .from(executionLogs)
      .where(eq(executionLogs.taskId, taskId))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(executionLogs)
      .where(eq(executionLogs.taskId, taskId));

    const total = countResult[0]?.count ?? 0;

    return { logs: results, total };
  }
}
