import { AuthV1Controller } from './v1/auth.controller.js';
import { UserV1Controller } from './v1/user.controller.js';
import { TaskController } from './v1/task.controller.js';

export const controllers = [AuthV1Controller, UserV1Controller, TaskController];
