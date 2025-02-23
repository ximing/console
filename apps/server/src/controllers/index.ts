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
import { GithubActionsController } from './v1/github-actions.controller.js';
import { GithubSettingsController } from './v1/github-settings.controller.js';
import { BlogController } from './v1/blog.controller.js';
import { BlogMediaController } from './v1/blog-media.controller.js';
import { AppController } from './v1/app.controller.js';
import { MiniMaxController } from './v1/minimax.controller.js';
import { StaticController } from './static.controller.js';

// StaticController 必须在最后
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
  GithubActionsController,
  GithubSettingsController,
  BlogController,
  BlogMediaController,
  AppController,
  MiniMaxController,
  StaticController,
];
