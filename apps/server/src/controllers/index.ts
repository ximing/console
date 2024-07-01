/* eslint-disable import/order */
import { AuthV1Controller } from './v1/auth.controller.js';
import { UserV1Controller } from './v1/user.controller.js';
import { TaskController } from './v1/task.controller.js';
import { NotificationController } from './v1/notification.controller.js';
import { NotificationBAController } from './v1/notification.ba.controller.js';
import { AIController } from './v1/ai.controller.js';
import { AIRouteController } from './v1/ai-route.controller.js';
import { ToolExecutionController } from './v1/tool-execution.controller.js';
import { UserModelController } from './v1/user-model.controller.js';
import { ApiTokenController } from './v1/api-token.controller.js';
import { CommandPaletteIntentController } from './v1/command-palette-intent.controller.js';
import { GithubController } from './v1/github.controller.js';
import { StaticController } from './static.controller.js';

export const controllers = [
  AuthV1Controller,
  UserV1Controller,
  TaskController,
  NotificationController,
  NotificationBAController,
  AIController,
  AIRouteController,
  ToolExecutionController,
  UserModelController,
  ApiTokenController,
  CommandPaletteIntentController,
  GithubController,
  StaticController,
];
