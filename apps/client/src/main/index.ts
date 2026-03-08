import { app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger';
import { WindowManager } from './window';
import { TrayManager } from './tray';
import { MenuManager } from './menu';
import { AutoUpdaterManager } from './updater';
import { setupIPCHandlers } from './ipc';
import { SocketServer } from './socket';
import { CommandPaletteHotkey } from './command-palette-hotkey';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'https://console.aimo.plus';
export const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs');

let isQuitting = false;

export function getIsQuitting(): boolean {
  return isQuitting;
}

export function setIsQuitting(value: boolean): void {
  isQuitting = value;
}

export async function initializeApp(): Promise<void> {
  const windowManager = new WindowManager();
  const trayManager = new TrayManager(windowManager);
  const menuManager = new MenuManager(windowManager);
  const updaterManager = new AutoUpdaterManager();
  const socketServer = new SocketServer();
  const commandPaletteHotkey = new CommandPaletteHotkey(windowManager);

  // Connect managers that need each other
  menuManager.setUpdaterManager(updaterManager);
  socketServer.setWindowManager(windowManager);

  // Setup IPC handlers with dependencies
  setupIPCHandlers(windowManager, updaterManager);

  // Initialize managers
  windowManager.create();

  // Register command palette hotkey after window is ready
  commandPaletteHotkey.register();

  // Delay other initializations to let window load first
  setTimeout(() => {
    trayManager.create();
    menuManager.create();
    socketServer.start();

    // Check for updates after a delay
    setTimeout(() => {
      updaterManager.setup();
    }, 3000);
  }, 1000);

  // App event handlers
  app.on('window-all-closed', () => {
    // Don't quit on macOS or when tray is active
    if (process.platform !== 'darwin') {
      // Keep running with tray icon
    }
  });

  app.on('activate', () => {
    windowManager.show();
  });

  app.on('before-quit', () => {
    setIsQuitting(true);
  });

  app.on('will-quit', () => {
    // Cleanup
    commandPaletteHotkey.unregisterAll();
    socketServer.stop();
    logger.close();
  });

  logger.info('Application initialized', { version: app.getVersion() });
}

app.whenReady().then(initializeApp);
