import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Tray, Menu, nativeImage, app, type NativeImage } from 'electron';
import { WindowManager } from './window';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  private getIconPath(): string {
    return path.join(__dirname, '../../build/icon_16.png');
  }

  private createIcon(): NativeImage {
    const iconPath = this.getIconPath();

    try {
      if (fs.existsSync(iconPath)) {
        return nativeImage.createFromPath(iconPath);
      }
    } catch {
      // Fall through to empty icon
    }

    return nativeImage.createEmpty();
  }

  create(): void {
    const icon = this.createIcon();
    this.tray = new Tray(icon);

    this.tray.setToolTip('Console');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => this.windowManager.show(),
      },
      { type: 'separator' },
      {
        label: '退出应用',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);

    this.tray.on('click', () => {
      const window = this.windowManager.getWindow();
      if (window?.isVisible()) {
        window.hide();
      } else {
        this.windowManager.show();
      }
    });
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
