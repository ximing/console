import { app, ipcMain, Notification, type IpcMainInvokeEvent } from 'electron';
import { WindowManager } from './window';
import { AutoUpdaterManager } from './updater';

interface NotificationPayload {
  id: string;
  title: string;
  body: string;
}

export function setupIPCHandlers(
  windowManager: WindowManager,
  updaterManager: AutoUpdaterManager
): void {
  // Logging
  ipcMain.handle('log-preload', (_event: IpcMainInvokeEvent, data: unknown) => {
    console.log('[Preload] Debug info:', data);
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
  ipcMain.handle('show-notification', (_event: IpcMainInvokeEvent, payload: NotificationPayload) => {
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
      console.error('Failed to show notification:', error);
      return { success: false, error: String(error) };
    }
  });

  // Socket status
  ipcMain.handle('get-socket-status', () => {
    const socketPath = process.env.VITE_SOCKET_PATH;
    return {
      path: socketPath,
      exists: socketPath ? false : false, // Will be handled by socket server
    };
  });
}
