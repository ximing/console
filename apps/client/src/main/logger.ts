import path from 'node:path';
import { app } from 'electron';
import { Log } from '@x-console/logger';

/**
 * Console Client Logger
 * Electron main process logger
 */

const logDir = path.join(app.getPath('userData'), 'logs');

export const logger = new Log({
  projectName: 'console-client',
  level: (process.env.AIMO_LOG_LEVEL as 'trace' | 'debug' | 'info' | 'warn' | 'error') || 'info',
  logDir,
  enableTerminal: true,
  maxSize: '20m',
  maxFiles: '7d',
});
