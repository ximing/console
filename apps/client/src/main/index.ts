import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

import {
  app,
  BrowserWindow,
  shell,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  ipcMain,
  type MenuItemConstructorOptions,
  screen,
  dialog,
  Notification,
} from 'electron';
import Store from 'electron-store';
import { autoUpdater, type UpdateInfo } from 'electron-updater';

// Enable auto-updater logging
autoUpdater.logger = console;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The built directory structure
//
// ├─┬ dist
// │ ├─┬ main
// │ │ └── index.js     > Electron-Main
// │ ├─┬ preload
// │ │ └── index.mjs    > Preload-Scripts
// │ └─┬ index.html   > Web app (built from apps/web with ELECTRON=true)

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const RENDERER_DIST = path.resolve(__dirname, '..');
export const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs');

process.env.VITE_PUBLIC = RENDERER_DIST;

let mainWindow: BrowserWindow | null;
let tray: Tray | null = null;
let isQuiting = false;

// Window state store for saving/restoring window bounds and maximized state
interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const windowStore = new Store<WindowState>({
  name: 'window-state',
  defaults: {
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    isMaximized: false,
  },
});

function saveWindowState(): void {
  if (!mainWindow) return;

  const isMaximized = mainWindow.isMaximized();

  // Save maximized state
  windowStore.set('isMaximized', isMaximized);

  // Only save bounds if not maximized (maximized bounds are not useful)
  if (!isMaximized) {
    const bounds = mainWindow.getBounds();
    windowStore.set('x', bounds.x);
    windowStore.set('y', bounds.y);
    windowStore.set('width', bounds.width);
    windowStore.set('height', bounds.height);
  }
}

function getIconPath(): string {
  // Use build directory icons for the app
  const iconPath = path.join(__dirname, '../../build/icon.png');
  return iconPath;
}

function createWindow(): void {
  // Load saved window state
  const savedState = windowStore.store;

  // Check if the saved display is still available
  const displays = screen.getAllDisplays();
  const isOnValidDisplay = displays.some((display) => {
    const { x, y, width, height } = display.bounds;
    return (
      savedState.x >= x - width &&
      savedState.x <= x + width &&
      savedState.y >= y - height &&
      savedState.y <= y + height
    );
  });

  // Use saved bounds if on valid display, otherwise use default
  const windowBounds = isOnValidDisplay
    ? {
        x: savedState.x,
        y: savedState.y,
        width: savedState.width,
        height: savedState.height,
      }
    : { width: 1200, height: 800 };

  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    ...windowBounds,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'AIMO',
    icon: iconPath,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Restore maximized state after window is created
  if (savedState.isMaximized && isOnValidDisplay) {
    mainWindow.maximize();
  }

  // Test active push message to Renderer-process.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  // Make all links open with the browser, not within the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent navigation from drag-and-drop (will-navigate)
  mainWindow.webContents.on('will-navigate', (event) => {
    // Only prevent navigation if it's a file drop (not from user clicking links)
    // The URL will typically be file:// when files are dropped
    if (event.url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Handle file drag and drop events from the webContents
  // @ts-expect-error - webContents drag events are not fully typed in Electron types
  mainWindow.webContents.on('drag-enter', (event: Electron.Event) => {
    event.preventDefault();
  });

  // @ts-expect-error - webContents drag events are not fully typed in Electron types
  mainWindow.webContents.on('drag-over', (event: Electron.Event) => {
    event.preventDefault();
  });

  // @ts-expect-error - webContents drag events are not fully typed in Electron types
  mainWindow.webContents.on('drop', (event: Electron.Event, files: string[]) => {
    event.preventDefault();
    if (!files || !Array.isArray(files)) return;

    // Filter to only include files (not directories) and return absolute paths
    const filePaths = files.filter((filePath) => {
      try {
        const stats = fs.statSync(filePath);
        return stats.isFile();
      } catch {
        return false;
      }
    });

    if (filePaths.length > 0 && mainWindow) {
      mainWindow.webContents.send('files-dropped', filePaths);
    }
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle close to tray - prevent default close and hide window instead
  mainWindow.on('close', (event) => {
    if (isQuiting) {
      // Save window state before quitting
      saveWindowState();
    } else {
      // Save window state before hiding
      saveWindowState();
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function showMainWindow(): void {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();

  if (process.platform === 'darwin') {
    app.focus({ steal: true });
    mainWindow.moveTop();
  }
}

function registerGlobalShortcuts(): void {
  // @TODO Register CommandOrControl+Shift+A to toggle window visibility
}

function createTray(): void {
  // Create tray icon
  // Use icon_16.png from build directory for tray
  const iconPath = path.join(__dirname, '../../build/icon_16.png');

  // Try to load icon from build folder
  try {
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      tray = new Tray(icon);
    } else {
      // Fallback: create a simple 16x16 icon
      const emptyIcon = nativeImage.createEmpty();
      tray = new Tray(emptyIcon);
    }
  } catch {
    // Create a simple 16x16 transparent icon as fallback
    const emptyIcon = nativeImage.createEmpty();
    tray = new Tray(emptyIcon);
  }

  // Set tooltip
  tray.setToolTip('AIMO');

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        showMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click tray icon to toggle window visibility
  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
      return;
    }

    showMainWindow();
  });
}

// Auto-update setup
function setupAutoUpdater(): void {
  // Configure autoUpdater to use GitHub releases
  autoUpdater.autoDownload = false; // Don't auto-download, let user confirm
  autoUpdater.autoInstallOnAppQuit = true; // Install on quit

  // Check for updates
  autoUpdater.checkForUpdates().catch((error) => {
    console.warn('Failed to check for updates:', error);
  });
}

// Manual check for updates - can be called from menu or renderer
async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo || null;
  } catch (error) {
    console.warn('Failed to check for updates:', error);
    return null;
  }
}

// Download update
async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    console.warn('Failed to download update:', error);
    throw error;
  }
}

// Install update and restart
function installUpdate(): void {
  autoUpdater.quitAndInstall();
}

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  // Common edit menu items
  const editMenuItems: MenuItemConstructorOptions[] = [
    { label: '撤销', role: 'undo', accelerator: 'CmdOrCtrl+Z' },
    { label: '重做', role: 'redo', accelerator: 'Shift+CmdOrCtrl+Z' },
    { type: 'separator' },
    { label: '剪切', role: 'cut', accelerator: 'CmdOrCtrl+X' },
    { label: '复制', role: 'copy', accelerator: 'CmdOrCtrl+C' },
    { label: '粘贴', role: 'paste', accelerator: 'CmdOrCtrl+V' },
    { label: '全选', role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
  ];

  // View menu items
  const viewMenuItems: MenuItemConstructorOptions[] = [
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

  // Window menu items
  const windowMenuItems: MenuItemConstructorOptions[] = [
    { label: '最小化', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
    { label: '关闭', role: 'close', accelerator: 'CmdOrCtrl+W' },
    { type: 'separator' },
    {
      label: '显示主窗口',
      click: () => {
        showMainWindow();
      },
    },
  ];

  // macOS specific window menu additions
  if (isMac) {
    windowMenuItems.push(
      { type: 'separator' },
      { label: '前置全部窗口', role: 'front' },
      { label: '进入全屏', role: 'togglefullscreen' }
    );
  }

  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    // macOS: App menu as first item
    template.push({
      label: app.getName(),
      submenu: [
        { label: `关于 ${app.getName()}`, role: 'about' },
        { type: 'separator' },
        {
          label: '隐藏',
          role: 'hide',
          accelerator: 'Command+H',
        },
        {
          label: '隐藏其他',
          role: 'hideOthers',
          accelerator: 'Command+Alt+H',
        },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        {
          label: `退出 ${app.getName()}`,
          accelerator: 'Command+Q',
          click: () => {
            isQuiting = true;
            app.quit();
          },
        },
      ],
    });
  }

  // Edit menu
  template.push(
    {
      label: '编辑',
      submenu: editMenuItems,
    },
    {
      label: '视图',
      submenu: viewMenuItems,
    },
    {
      label: '窗口',
      role: 'window',
      submenu: windowMenuItems,
    },
    {
      label: '帮助',
      role: 'help',
      submenu: [
        {
          label: `检查更新 (v${app.getVersion()})`,
          click: async () => {
            const updateInfo = await checkForUpdates();
            if (!updateInfo) {
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
            shell.openExternal('https://github.com/ximing/aimo');
          },
        },
      ],
    }
  );

  // Windows/Linux: Add File menu with Quit option
  if (!isMac) {
    template.unshift({
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'Ctrl+Q',
          click: () => {
            isQuiting = true;
            app.quit();
          },
        },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on('window-all-closed', () => {
  mainWindow = null;
  // On macOS, keep app running in background when window is closed
  // On Windows/Linux, we keep running with tray icon
  // Don't quit here - tray icon keeps app running
});

app.on('activate', () => {
  // macOS: click dock icon to restore window
  showMainWindow();
});

// Register IPC handlers
ipcMain.handle('log-preload', (_event, data) => {
  console.log('[Preload] Debug info:', data);
  return { success: true };
});

// Update-related IPC handlers
ipcMain.handle('check-for-updates', async () => {
  return await checkForUpdates();
});

ipcMain.handle('download-update', async () => {
  await downloadUpdate();
  return { success: true };
});

ipcMain.handle('install-update', () => {
  installUpdate();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Notification payload type
interface NotificationPayload {
  id: string;
  title: string;
  body: string;
}

// IPC handler for showing system notifications
ipcMain.handle('show-notification', (_event, payload: NotificationPayload) => {
  if (!Notification.isSupported()) {
    console.warn('System notifications not supported');
    return { success: false, error: 'Notifications not supported' };
  }

  try {
    const notification = new Notification({
      title: payload.title,
      body: payload.body,
      silent: false,
    });

    notification.on('click', () => {
      // Show main window and send notification click event to renderer
      showMainWindow();
      mainWindow?.webContents.send('notification-clicked', {
        id: payload.id,
      });
    });

    notification.show();
    return { success: true };
  } catch (error) {
    console.error('Failed to show notification:', error);
    return { success: false, error: String(error) };
  }
});

// ============================================
// Socket Server for CLI communication
// ============================================

const SOCKET_PATH = '/tmp/aimo-console.sock';

// Generate unique ID for each dialog
function generateId(): string {
  return `dialog_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Parse command line arguments
interface DialogOptions {
  command: 'notify' | 'dialog';
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'question';
  buttons: string[];
  persistent: boolean;
  icon?: string;
  timeout?: number;
}

function parseCommand(line: string): DialogOptions | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Match command and key-value pairs
  const commandMatch = trimmed.match(/^(notify|dialog)\b/);
  if (!commandMatch) return null;

  const command = commandMatch[1] as 'notify' | 'dialog';

  // Parse --key "value" or --key value or --flag
  const options: Partial<DialogOptions> = {
    command,
    type: 'info',
    buttons: ['确定'],
    persistent: command === 'dialog',
  };

  // Regex to match --key "value" or --key value or --key='value'
  const kvRegex = /--(\w+)(?:=(.+?)|\s+(".*?"|\S+))/g;
  let match;

  while ((match = kvRegex.exec(trimmed)) !== null) {
    const key = match[1];
    let value = match[2] || match[3];

    // Remove surrounding quotes if present
    if (value && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    switch (key) {
      case 'title':
        options.title = value;
        break;
      case 'message':
        options.message = value;
        break;
      case 'type':
        if (['info', 'warning', 'error', 'success', 'question'].includes(value)) {
          options.type = value as DialogOptions['type'];
        }
        break;
      case 'buttons':
        options.buttons = value.split(',').map((b) => b.trim());
        break;
      case 'persistent':
        options.persistent = value === 'true' || value === '' || !value;
        break;
      case 'icon':
        options.icon = value;
        break;
      case 'timeout':
        options.timeout = parseInt(value, 10) || 3000;
        break;
    }
  }

  // Validate required fields
  if (!options.title || !options.message) {
    return null;
  }

  return options as DialogOptions;
}

// Get icon for dialog type
function getDialogIcon(type: DialogOptions['type']): string | undefined {
  // On macOS, we can use system icons via file paths
  // On Windows, we rely on the native dialog's built-in icons
  return undefined;
}

// Show dialog and return result
function showDialog(options: DialogOptions): Promise<{ action: string; button: string; id: string }> {
  return new Promise((resolve) => {
    const dialogId = generateId();

    const dialogTypeMap: Record<string, 'none' | 'info' | 'error' | 'question' | 'warning'> = {
      info: 'info',
      warning: 'warning',
      error: 'error',
      success: 'info',
      question: 'question',
    };

    // Map our type to Electron's dialog type
    const electronDialogType = dialogTypeMap[options.type] || 'info';

    const dialogOptions: Electron.MessageBoxOptions = {
      type: electronDialogType,
      title: options.title,
      message: options.message,
      buttons: options.buttons,
      defaultId: 0,
      cancelId: options.buttons.length - 1,
    };

    // Try to add icon if provided and exists
    if (options.icon && fs.existsSync(options.icon)) {
      try {
        dialogOptions.icon = nativeImage.createFromPath(options.icon);
      } catch {
        // Ignore icon errors
      }
    }

    dialog.showMessageBox(dialogOptions).then((result) => {
      const buttonClicked = options.buttons[result.response] || options.buttons[0];
      resolve({
        action: 'button_clicked',
        button: buttonClicked,
        id: dialogId,
      });
    });
  });
}

// Show notification (auto-dismiss)
function showNotification(options: DialogOptions): void {
  const notification = new Notification({
    title: options.title,
    body: options.message,
    silent: false,
  });

  notification.on('click', () => {
    showMainWindow();
  });

  notification.show();

  // Auto-dismiss after timeout (default 3 seconds)
  const timeout = options.timeout || 3000;
  setTimeout(() => {
    notification.close();
  }, timeout);
}

// Handle incoming socket data
function handleSocketData(
  data: Buffer,
  client: net.Socket
): void {
  const line = data.toString().trim();
  console.log('[Socket] Received command:', line);

  const options = parseCommand(line);

  if (!options) {
    client.write(JSON.stringify({ error: 'Invalid command', usage: 'notify|dialog --title "xxx" --message "xxx" [--type info|warning|error|success|question] [--buttons "btn1,btn2"] [--persistent] [--icon /path/to/icon.png] [--timeout 3000]' }) + '\n');
    return;
  }

  console.log('[Socket] Parsed options:', options);

  if (options.command === 'notify') {
    showNotification(options);
    client.write(JSON.stringify({ success: true, action: 'notification_shown' }) + '\n');
  } else {
    showDialog(options).then((result) => {
      client.write(JSON.stringify(result) + '\n');
    });
  }
}

// Start socket server
function startSocketServer(): void {
  // Clean up old socket file
  if (fs.existsSync(SOCKET_PATH)) {
    try {
      fs.unlinkSync(SOCKET_PATH);
    } catch (error) {
      console.warn('[Socket] Failed to remove old socket:', error);
    }
  }

  const server = net.createServer((client) => {
    let buffer = '';

    client.on('data', (data) => {
      buffer += data.toString();

      // Handle multiple commands (newline separated)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          handleSocketData(Buffer.from(line), client);
        }
      }
    });

    client.on('error', (error) => {
      console.error('[Socket] Client error:', error.message);
    });
  });

  server.on('error', (error) => {
    console.error('[Socket] Server error:', error.message);
  });

  server.listen(SOCKET_PATH, () => {
    console.log('[Socket] Server listening on:', SOCKET_PATH);
  });
}

// IPC handler for socket server status
ipcMain.handle('get-socket-status', () => {
  return {
    path: SOCKET_PATH,
    exists: fs.existsSync(SOCKET_PATH),
  };
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();
  createApplicationMenu();

  // Start socket server for CLI communication
  startSocketServer();

  // Check for updates 3 seconds after app startup
  setTimeout(() => {
    setupAutoUpdater();
  }, 3002);
});

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
  mainWindow?.webContents.send('update-status', { status: 'checking' });
});

autoUpdater.on('update-available', (info: UpdateInfo) => {
  console.log('Update available:', info.version);
  mainWindow?.webContents.send('update-status', {
    status: 'available',
    version: info.version,
    releaseNotes: info.releaseNotes,
  });

  // Show system notification
  if (Notification.isSupported()) {
    new Notification({
      title: '发现新版本',
      body: `版本 ${info.version} 可用，是否立即下载？`,
    }).show();
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('Update not available');
  mainWindow?.webContents.send('update-status', { status: 'not-available' });
});

autoUpdater.on('download-progress', (progress) => {
  console.log('Download progress:', progress.percent);
  mainWindow?.webContents.send('update-status', {
    status: 'downloading',
    percent: progress.percent,
  });
});

autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
  console.log('Update downloaded:', info.version);
  mainWindow?.webContents.send('update-status', {
    status: 'downloaded',
    version: info.version,
  });

  // Show system notification
  if (Notification.isSupported()) {
    new Notification({
      title: '更新已下载',
      body: '新版本已下载完成，重启应用即可安装',
    }).show();
  }

  // Ask user if they want to restart now
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
        installUpdate();
      }
    });
});

autoUpdater.on('error', (error) => {
  console.error('Auto-updater error:', error);
  mainWindow?.webContents.send('update-status', {
    status: 'error',
    error: error.message,
  });
});

app.on('before-quit', () => {
  isQuiting = true;
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
