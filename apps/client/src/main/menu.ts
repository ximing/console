import { app, Menu, shell, dialog, type MenuItemConstructorOptions } from 'electron';
import { WindowManager } from './window';
import { AutoUpdaterManager } from './updater';

export class MenuManager {
  private windowManager: WindowManager;
  private updaterManager?: AutoUpdaterManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  setUpdaterManager(updater: AutoUpdaterManager): void {
    this.updaterManager = updater;
  }

  private createEditMenu(): MenuItemConstructorOptions[] {
    return [
      { label: '撤销', role: 'undo', accelerator: 'CmdOrCtrl+Z' },
      { label: '重做', role: 'redo', accelerator: 'Shift+CmdOrCtrl+Z' },
      { type: 'separator' },
      { label: '剪切', role: 'cut', accelerator: 'CmdOrCtrl+X' },
      { label: '复制', role: 'copy', accelerator: 'CmdOrCtrl+C' },
      { label: '粘贴', role: 'paste', accelerator: 'CmdOrCtrl+V' },
      { label: '全选', role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
    ];
  }

  private createViewMenu(): MenuItemConstructorOptions[] {
    const isMac = process.platform === 'darwin';
    return [
      {
        label: '重新加载',
        role: 'reload',
        accelerator: 'CmdOrCtrl+R',
      },
      {
        label: '切换开发者工具',
        role: 'toggleDevTools',
        accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
      },
      { type: 'separator' },
      { label: '重置缩放', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
      { label: '放大', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
      { label: '缩小', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
      { type: 'separator' },
      { label: '全屏', role: 'togglefullscreen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11' },
    ];
  }

  private createWindowMenu(): MenuItemConstructorOptions[] {
    const isMac = process.platform === 'darwin';
    const items: MenuItemConstructorOptions[] = [
      { label: '最小化', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
      { label: '关闭', role: 'close', accelerator: 'CmdOrCtrl+W' },
      { type: 'separator' },
      {
        label: '显示主窗口',
        click: () => this.windowManager.show(),
      },
    ];

    if (isMac) {
      items.push(
        { type: 'separator' },
        { label: '前置全部窗口', role: 'front' },
        { label: '进入全屏', role: 'togglefullscreen' }
      );
    }

    return items;
  }

  private createHelpMenu(): MenuItemConstructorOptions[] {
    return [
      {
        label: `检查更新 (v${app.getVersion()})`,
        click: async () => {
          const hasUpdate = await this.updaterManager?.checkForUpdates() ?? false;
          if (!hasUpdate) {
            dialog.showMessageBox({
              type: 'info',
              title: '检查更新',
              message: '当前已是最新版本',
            });
          }
        },
      },
      { type: 'separator' },
      {
        label: '访问 GitHub',
        click: () => {
          shell.openExternal('https://github.com/ximing/console');
        },
      },
    ];
  }

  create(): void {
    const isMac = process.platform === 'darwin';
    const template: MenuItemConstructorOptions[] = [];

    if (isMac) {
      template.push({
        label: app.getName(),
        submenu: [
          { label: `关于 ${app.getName()}`, role: 'about' },
          { type: 'separator' },
          { label: '隐藏', role: 'hide', accelerator: 'Command+H' },
          { label: '隐藏其他', role: 'hideOthers', accelerator: 'Command+Alt+H' },
          { label: '显示全部', role: 'unhide' },
          { type: 'separator' },
          {
            label: `退出 ${app.getName()}`,
            accelerator: 'Command+Q',
            click: () => app.quit(),
          },
        ],
      });
    }

    template.push(
      {
        label: '编辑',
        submenu: this.createEditMenu(),
      },
      {
        label: '视图',
        submenu: this.createViewMenu(),
      },
      {
        label: '窗口',
        role: 'window',
        submenu: this.createWindowMenu(),
      },
      {
        label: '帮助',
        role: 'help',
        submenu: this.createHelpMenu(),
      }
    );

    // Windows/Linux: Add File menu
    if (!isMac) {
      template.unshift({
        label: '文件',
        submenu: [
          {
            label: '退出',
            accelerator: 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}
