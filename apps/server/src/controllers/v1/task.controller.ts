import cron from 'node-cron';
import {
  JsonController,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { ActionRegistry } from '../../actions/registry.js';
import { SchedulerService } from '../../services/scheduler.service.js';
import { TaskService } from '../../services/task.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type {
  AvailableActionDto,
  CreateTaskDto,
  ExecutionLogDto,
  TaskDto,
  TaskTriggerResultDto,
  UpdateTaskDto,
  UserInfoDto,
} from '@aimo-console/dto';
import type { Task } from '../../db/schema/tasks.js';

/**
 * Helper to convert Task model to TaskDto
 */
function convertTaskToDto(task: Task): TaskDto {
  return {
    id: task.id,
    name: task.name,
    triggerType: task.triggerType,
    cronExpression: task.cronExpression ?? undefined,
    enabled: task.enabled,
    actionId: task.actionId,
    actionConfig: task.actionConfig as Record<string, unknown> | undefined,
    createdBy: task.createdBy,
    createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
    updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
  };
}

@Service()
@JsonController('/api/v1/tasks')
export class TaskController {
  constructor(
    private taskService: TaskService,
    private schedulerService: SchedulerService,
    private actionRegistry: ActionRegistry
  ) {}

  /**
   * POST /api/v1/tasks - Create a new task
   */
  @Post('/')
  async createTask(@CurrentUser() userDto: UserInfoDto, @Body() createData: CreateTaskDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate required fields
      if (!createData.name || createData.name.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Task name is required');
      }

      if (!createData.actionId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Action ID is required');
      }

      // Check if action exists
      if (!this.actionRegistry.has(createData.actionId)) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, `Action "${createData.actionId}" not found`);
      }

      // Validate trigger type and cron expression
      if (createData.triggerType === 'scheduled') {
        if (!createData.cronExpression) {
          return ResponseUtility.error(
            ErrorCode.PARAMS_ERROR,
            'Cron expression is required for scheduled tasks'
          );
        }

        if (!cron.validate(createData.cronExpression)) {
          return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Invalid cron expression format');
        }
      }

      // Create the task
      const task = await this.taskService.createTask(userDto.id, {
        name: createData.name.trim(),
        triggerType: createData.triggerType || 'manual',
        cronExpression: createData.cronExpression,
        enabled: true,
        actionId: createData.actionId,
        actionConfig: createData.actionConfig || {},
      });

      // Register with scheduler if it's a scheduled task and enabled
      if (task.triggerType === 'scheduled' && task.enabled && this.schedulerService.getRunning()) {
        this.schedulerService.registerTask(task.id, task.cronExpression!);
      }

      return ResponseUtility.success(convertTaskToDto(task));
    } catch (error) {
      logger.error('Create task error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/tasks - List all tasks for current user
   */
  @Get('/')
  async listTasks(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const tasks = await this.taskService.getTasks(userDto.id);
      const taskDtos = tasks.map(convertTaskToDto);

      return ResponseUtility.success({ tasks: taskDtos });
    } catch (error) {
      logger.error('List tasks error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/tasks/:id - Get task details
   */
  @Get('/:id')
  async getTask(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const task = await this.taskService.getTask(id, userDto.id);
      if (!task) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Task not found');
      }

      return ResponseUtility.success(convertTaskToDto(task));
    } catch (error) {
      logger.error('Get task error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id - Update task fields
   */
  @Patch('/:id')
  async updateTask(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() updateData: UpdateTaskDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Check if task exists
      const existingTask = await this.taskService.getTask(id, userDto.id);
      if (!existingTask) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Task not found');
      }

      // Validate trigger type change
      if (updateData.triggerType && updateData.triggerType !== existingTask.triggerType) {
        if (updateData.triggerType === 'scheduled' && !updateData.cronExpression) {
          return ResponseUtility.error(
            ErrorCode.PARAMS_ERROR,
            'Cron expression is required for scheduled tasks'
          );
        }
      }

      // Validate cron expression if provided
      const cronExpr = updateData.cronExpression || existingTask.cronExpression;
      if (cronExpr && !cron.validate(cronExpr)) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Invalid cron expression format');
      }

      // Validate action if provided
      if (updateData.actionId && !this.actionRegistry.has(updateData.actionId)) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, `Action "${updateData.actionId}" not found`);
      }

      // Update the task
      const updatedTask = await this.taskService.updateTask(id, userDto.id, updateData);
      if (!updatedTask) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Task not found');
      }

      // Handle scheduler registration changes
      if (this.schedulerService.getRunning()) {
        const isScheduled = updatedTask.triggerType === 'scheduled';

        if (isScheduled && updatedTask.enabled && updatedTask.cronExpression) {
          // Register or update scheduled task
          this.schedulerService.registerTask(updatedTask.id, updatedTask.cronExpression);
        } else {
          // Unregister if not scheduled or disabled
          this.schedulerService.unregisterTask(updatedTask.id);
        }
      }

      return ResponseUtility.success(convertTaskToDto(updatedTask));
    } catch (error) {
      logger.error('Update task error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/tasks/:id - Delete task and related logs
   */
  @Delete('/:id')
  async deleteTask(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.taskService.deleteTask(id, userDto.id);
      if (!deleted) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Task not found');
      }

      // Unregister from scheduler if running
      if (this.schedulerService.getRunning()) {
        this.schedulerService.unregisterTask(id);
      }

      return ResponseUtility.success({ deleted: true });
    } catch (error) {
      logger.error('Delete task error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/tasks/:id/trigger - Manually trigger a task
   */
  @Post('/:id/trigger')
  async triggerTask(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Verify task belongs to user
      const task = await this.taskService.getTask(id, userDto.id);
      if (!task) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Task not found');
      }

      // Execute the task
      const result = await this.taskService.executeTask(id);

      // Build response
      const response: TaskTriggerResultDto = {
        success: result.success,
        executionId: id,
        data: result.data,
        error: result.error,
      };

      return ResponseUtility.success(response);
    } catch (error) {
      logger.error('Trigger task error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/tasks/actions - Get available actions
   */
  @Get('/actions/list')
  async getAvailableActions() {
    try {
      const actions: AvailableActionDto[] = this.actionRegistry.getAvailableActions();
      return ResponseUtility.success({ actions });
    } catch (error) {
      logger.error('Get available actions error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
