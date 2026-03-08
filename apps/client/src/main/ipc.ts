import { app, ipcMain, Notification, type IpcMainInvokeEvent } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger';
import { WindowManager } from './window';
import { AutoUpdaterManager } from './updater';

interface NotificationPayload {
  id: string;
  title: string;
  body: string;
}

interface LogQueryParams {
  offset?: number;
  limit?: number;
  level?: string;
  search?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  projectName?: string;
  [key: string]: unknown;
}

/**
 * Get the log directory path
 */
function getLogDir(): string {
  return path.join(app.getPath('userData'), 'logs');
}

/**
 * Get all log files sorted by date (newest first)
 */
function getLogFiles(): string[] {
  const logDir = getLogDir();

  if (!fs.existsSync(logDir)) {
    return [];
  }

  const files = fs.readdirSync(logDir);
  return files
    .filter((file) => file.endsWith('.log'))
    .map((file) => path.join(logDir, file))
    .sort((a, b) => b.localeCompare(a)); // Sort newest first
}

/**
 * Parse a log line to LogEntry
 */
function parseLogLine(line: string): LogEntry | null {
  try {
    const parsed = JSON.parse(line);
    return {
      timestamp: parsed.timestamp || '',
      level: parsed.level || 'info',
      message: parsed.message || '',
      projectName: parsed.projectName,
      ...parsed,
    };
  } catch {
    // If not valid JSON, try to parse as plain text
    return null;
  }
}

/**
 * Read and filter logs from log files
 */
function readLogs(params: LogQueryParams): { logs: LogEntry[]; total: number } {
  const { offset = 0, limit = 100, level, search } = params;
  const logFiles = getLogFiles();
  const allLogs: LogEntry[] = [];

  // Read all log files
  for (const file of logFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        const entry = parseLogLine(line);
        if (entry) {
          // Filter by level if specified
          if (level && level !== 'all' && entry.level !== level) {
            continue;
          }

          // Filter by search keyword if specified
          if (search) {
            const searchLower = search.toLowerCase();
            const messageLower = entry.message.toLowerCase();
            if (!messageLower.includes(searchLower)) {
              continue;
            }
          }

          allLogs.push(entry);
        }
      }
    } catch (error) {
      logger.warn(`Failed to read log file ${file}:`, { error: String(error) });
    }
  }

  // Sort by timestamp (newest first)
  allLogs.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });

  // Apply pagination
  const total = allLogs.length;
  const paginatedLogs = allLogs.slice(offset, offset + limit);

  return { logs: paginatedLogs, total };
}

/**
 * Get total count of logs matching criteria
 */
function getLogCount(params: Omit<LogQueryParams, 'offset' | 'limit'>): number {
  const { logs } = readLogs({ ...params, offset: 0, limit: Number.MAX_SAFE_INTEGER });
  return logs.length;
}

export function setupIPCHandlers(
  windowManager: WindowManager,
  updaterManager: AutoUpdaterManager
): void {
  // Logging
  ipcMain.handle('log-preload', (_event: IpcMainInvokeEvent, data: unknown) => {
    logger.debug('[Preload] Debug info:', { data } as Record<string, unknown>);
    return { success: true };
  });

  // App info
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Update handlers
  ipcMain.handle('check-for-updates', async () => {
    return await updaterManager.checkForUpdates();
  });

  ipcMain.handle('download-update', async () => {
    await updaterManager.downloadUpdate();
    return { success: true };
  });

  ipcMain.handle('install-update', () => {
    updaterManager.install();
  });

  // Notification handler
  ipcMain.handle(
    'show-notification',
    (_event: IpcMainInvokeEvent, payload: NotificationPayload) => {
      if (!Notification.isSupported()) {
        return { success: false, error: 'Notifications not supported' };
      }

      try {
        const notification = new Notification({
          title: payload.title,
          body: payload.body,
          silent: false,
        });

        notification.on('click', () => {
          windowManager.show();
          windowManager.getWebContents()?.send('notification-clicked', { id: payload.id });
        });

        notification.show();
        return { success: true };
      } catch (error) {
        logger.error('Failed to show notification:', { error: String(error) });
        return { success: false, error: String(error) };
      }
    }
  );

  // Socket status
  ipcMain.handle('get-socket-status', () => {
    const socketPath = process.env.VITE_SOCKET_PATH;
    return {
      path: socketPath,
      exists: socketPath ? false : false, // Will be handled by socket server
    };
  });

  // Log handlers
  ipcMain.handle('get-logs', (_event: IpcMainInvokeEvent, params: LogQueryParams) => {
    try {
      return readLogs(params);
    } catch (error) {
      logger.error('Failed to read logs:', { error: String(error) });
      return { logs: [], total: 0, error: String(error) };
    }
  });

  ipcMain.handle(
    'get-log-count',
    (_event: IpcMainInvokeEvent, params: Omit<LogQueryParams, 'offset' | 'limit'>) => {
      try {
        return { count: getLogCount(params) };
      } catch (error) {
        logger.error('Failed to get log count:', { error: String(error) });
        return { count: 0, error: String(error) };
      }
    }
  );

  // Command palette IPC
  ipcMain.handle('show-command-palette', () => {
    const window = windowManager.getWindow();
    if (window) {
      window.webContents.send('toggle-command-palette');
      return { success: true };
    }
    return { success: false, error: 'Window not available' };
  });

  // Get command palette hotkey for display
  ipcMain.handle('get-command-palette-shortcut', () => {
    return process.platform === 'darwin' ? 'Option+Space' : 'Alt+Space';
  });
}
