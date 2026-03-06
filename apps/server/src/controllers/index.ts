import { AuthV1Controller } from './v1/auth.controller.js';
import { UserV1Controller } from './v1/user.controller.js';
import { TaskController } from './v1/task.controller.js';
import { NotificationController } from './v1/notification.controller.js';
import { NotificationBAController } from './v1/notification.ba.controller.js';
import { AIController } from './v1/ai.controller.js';
import { UserModelController } from './v1/user-model.controller.js';
import { ApiTokenController } from './v1/api-token.controller.js';

export const controllers = [
  AuthV1Controller,
  UserV1Controller,
  TaskController,
  NotificationController,
  NotificationBAController,
  AIController,
  UserModelController,
  ApiTokenController,
];
