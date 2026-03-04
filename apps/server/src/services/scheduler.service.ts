import { Service } from 'typedi';
import cron, { ScheduledTask } from 'node-cron';

import { logger } from '../utils/logger.js';

import type { TaskService } from './task.service.js';

@Service()
export class SchedulerService {
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private isRunning = false;

  constructor(private taskService: TaskService) {}

  /**
   * Start the scheduler and register all enabled scheduled tasks
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting task scheduler...');

    try {
      // Get all enabled scheduled tasks
      const enabledTasks = await this.taskService.getEnabledScheduledTasks();

      for (const task of enabledTasks) {
        if (task.cronExpression && cron.validate(task.cronExpression)) {
          this.scheduleTask(task.id, task.cronExpression);
          logger.info(`Registered scheduled task: ${task.name} (${task.cronExpression})`);
        } else {
          logger.warn(`Invalid or missing cron expression for task: ${task.name}`);
        }
      }

      this.isRunning = true;
      logger.info(`Scheduler started with ${this.scheduledTasks.size} active tasks`);
    } catch (error) {
      logger.error('Error starting scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the scheduler and cancel all scheduled tasks
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    logger.info('Stopping task scheduler...');

    // Cancel all scheduled tasks
    for (const [taskId, task] of this.scheduledTasks.entries()) {
      task.stop();
      logger.info(`Stopped scheduled task: ${taskId}`);
    }

    this.scheduledTasks.clear();
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  /**
   * Schedule a new task
   */
  private scheduleTask(taskId: string, cronExpression: string): void {
    // If already scheduled, stop the existing one first
    if (this.scheduledTasks.has(taskId)) {
      const existing = this.scheduledTasks.get(taskId);
      existing?.stop();
      this.scheduledTasks.delete(taskId);
    }

    const task = cron.schedule(cronExpression, async () => {
      logger.info(`Executing scheduled task: ${taskId}`);
      try {
        const result = await this.taskService.executeTask(taskId);
        if (result.success) {
          logger.info(`Scheduled task ${taskId} completed successfully`);
        } else {
          logger.error(`Scheduled task ${taskId} failed:`, result.error?.message);
        }
      } catch (error: any) {
        logger.error(`Error executing scheduled task ${taskId}:`, error);
      }
    });

    this.scheduledTasks.set(taskId, task);
  }

  /**
   * Register a new scheduled task dynamically
   */
  registerTask(taskId: string, cronExpression: string): boolean {
    if (!this.isRunning) {
      logger.warn('Cannot register task - scheduler is not running');
      return false;
    }

    if (!cron.validate(cronExpression)) {
      logger.error(`Invalid cron expression: ${cronExpression}`);
      return false;
    }

    this.scheduleTask(taskId, cronExpression);
    logger.info(`Dynamically registered task: ${taskId}`);
    return true;
  }

  /**
   * Unregister a scheduled task
   */
  unregisterTask(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) {
      return false;
    }

    task.stop();
    this.scheduledTasks.delete(taskId);
    logger.info(`Unregistered scheduled task: ${taskId}`);
    return true;
  }

  /**
   * Check if scheduler is running
   */
  getRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get count of active scheduled tasks
   */
  getActiveTaskCount(): number {
    return this.scheduledTasks.size;
  }
}
