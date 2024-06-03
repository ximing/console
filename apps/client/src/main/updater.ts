import { dialog, Notification } from 'electron';
import { autoUpdater, type UpdateInfo } from 'electron-updater';
import { logger } from './logger';
import { WindowManager } from './window';

// Use our logger for autoUpdater
autoUpdater.logger = {
  info: (...args: unknown[]) => logger.info('[AutoUpdater]', { args } as Record<string, unknown>),
  warn: (...args: unknown[]) => logger.warn('[AutoUpdater]', { args } as Record<string, unknown>),
  error: (...args: unknown[]) => logger.error('[AutoUpdater]', { args } as Record<string, unknown>),
  debug: (...args: unknown[]) => logger.debug('[AutoUpdater]', { args } as Record<string, unknown>),
};

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

interface StatusPayload {
  status: UpdateStatus;
  version?: string;
  percent?: number;
  releaseNotes?: string;
  error?: string;
}

export class AutoUpdaterManager {
  private windowManager?: WindowManager;
  private status: UpdateStatus = 'idle';

  setWindowManager(manager: WindowManager): void {
    this.windowManager = manager;
  }

  private sendStatus(payload: StatusPayload): void {
    this.windowManager?.getWebContents()?.send('update-status', payload);
  }

  private showNotification(title: string, body: string): void {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  }

  setup(): void {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.status = 'checking';
      this.sendStatus({ status: 'checking' });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.status = 'available';
      this.sendStatus({
        status: 'available',
        version: info.version,
        releaseNotes: info.releaseNotes as string | undefined,
      });
      this.showNotification('发现新版本', `版本 ${info.version} 可用，是否立即下载？`);
    });

    autoUpdater.on('update-not-available', () => {
      this.status = 'not-available';
      this.sendStatus({ status: 'not-available' });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.status = 'downloading';
      this.sendStatus({
        status: 'downloading',
        percent: progress.percent,
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.status = 'downloaded';
      this.sendStatus({
        status: 'downloaded',
        version: info.version,
      });
      this.showNotification('更新已下载', '新版本已下载完成，重启应用即可安装');

      dialog
        .showMessageBox({
          type: 'info',
          title: '更新已就绪',
          message: `版本 ${info.version} 已下载完成`,
          detail: '是否立即重启应用以安装更新？',
          buttons: ['立即重启', '稍后重启'],
          defaultId: 0,
          cancelId: 1,
        })
        .then((result) => {
          if (result.response === 0) {
            this.install();
          }
        });
    });

    autoUpdater.on('error', (error) => {
      this.status = 'error';
      this.sendStatus({
        status: 'error',
        error: error.message,
      });
    });

    // Initial check
    this.checkForUpdates().catch((error) => {
      logger.warn('Failed to check for updates:', error);
    });
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result?.updateInfo ?? null;
    } catch {
      return null;
    }
  }

  async downloadUpdate(): Promise<void> {
    await autoUpdater.downloadUpdate();
  }

  install(): void {
    autoUpdater.quitAndInstall();
  }

  getStatus(): UpdateStatus {
    return this.status;
  }
}
