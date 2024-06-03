import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, shell, screen, type WebContents } from 'electron';
import Store from 'electron-store';
import { PRELOAD_PATH, VITE_DEV_SERVER_URL, getIsQuitting, setIsQuitting } from './index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  x: 0,
  y: 0,
  width: 1200,
  height: 800,
  isMaximized: false,
};

const windowStore = new Store<WindowState>({
  name: 'window-state',
  defaults: DEFAULT_STATE,
});

export class WindowManager {
  private window: BrowserWindow | null = null;

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  getWebContents(): WebContents | null {
    return this.window?.webContents ?? null;
  }

  private getIconPath(): string {
    return path.join(__dirname, '../../build/icon.png');
  }

  private loadSavedState(): { bounds: Partial<WindowState>; isValid: boolean } {
    const savedState = windowStore.store;
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

    return {
      bounds: isOnValidDisplay ? savedState : DEFAULT_STATE,
      isValid: isOnValidDisplay,
    };
  }

  private saveState(): void {
    if (!this.window) return;

    const isMaximized = this.window.isMaximized();
    windowStore.set('isMaximized', isMaximized);

    if (!isMaximized) {
      const bounds = this.window.getBounds();
      windowStore.set('x', bounds.x);
      windowStore.set('y', bounds.y);
      windowStore.set('width', bounds.width);
      windowStore.set('height', bounds.height);
    }
  }

  create(): void {
    const { bounds, isValid } = this.loadSavedState();

    const iconPath = this.getIconPath();

    this.window = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width ?? 1200,
      height: bounds.height ?? 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      title: 'Console',
      icon: iconPath,
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // Restore maximized state
    if (bounds.isMaximized && isValid) {
      this.window.maximize();
    }

    // Window event handlers
    this.window.webContents.on('did-finish-load', () => {
      this.window?.webContents.send('main-process-message', new Date().toLocaleString());
    });

    this.window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    this.window.webContents.on('will-navigate', (event) => {
      if (event.url.startsWith('file://')) {
        event.preventDefault();
      }
    });

    // Drag and drop handling
    // @ts-expect-error - drag events not fully typed
    this.window.webContents.on('drag-enter', (event) => event.preventDefault());
    // @ts-expect-error
    this.window.webContents.on('drag-over', (event) => event.preventDefault());
    // @ts-expect-error
    this.window.webContents.on('drop', (event, files: string[]) => {
      event.preventDefault();
      if (!files || !Array.isArray(files)) return;

      const filePaths = files.filter((filePath) => {
        try {
          return fs.statSync(filePath).isFile();
        } catch {
          return false;
        }
      });

      if (filePaths.length > 0) {
        this.window?.webContents.send('files-dropped', filePaths);
      }
    });

    this.window.loadURL(VITE_DEV_SERVER_URL);

    this.window.once('ready-to-show', () => {
      this.window?.show();
    });

    this.window.on('close', (event) => {
      this.saveState();
      if (!getIsQuitting()) {
        event.preventDefault();
        this.window?.hide();
      }
    });
  }

  show(): void {
    if (!this.window) {
      this.create();
      return;
    }

    if (this.window.isMinimized()) {
      this.window.restore();
    }

    this.window.show();
    this.window.focus();

    if (process.platform === 'darwin') {
      app.focus({ steal: true });
      this.window.moveTop();
    }
  }

  hide(): void {
    this.window?.hide();
  }

  minimize(): void {
    this.window?.minimize();
  }

  maximize(): void {
    if (this.window?.isMaximized()) {
      this.window.unmaximize();
    } else {
      this.window?.maximize();
    }
  }

  close(): void {
    setIsQuitting(true);
    app.quit();
  }
}
