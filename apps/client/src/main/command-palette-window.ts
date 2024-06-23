import { BrowserWindow, screen } from 'electron';
import { logger } from './logger';
import { PRELOAD_PATH, VITE_DEV_SERVER_URL } from './index';

export class CommandPaletteWindowManager {
  private window: BrowserWindow | null = null;

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  private calculatePosition(): { x: number; y: number } {
    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;

    const windowWidth = 680;

    // Center horizontally, position at 20% from top
    const x = Math.round((screenWidth - windowWidth) / 2);
    const y = Math.round(screenHeight * 0.2);

    return { x, y };
  }

  create(): void {
    if (this.window && !this.window.isDestroyed()) {
      return;
    }

    const position = this.calculatePosition();

    logger.info('[CommandPaletteWindowManager] Creating command palette window');
    this.window = new BrowserWindow({
      width: 680,
      height: 500,
      x: position.x,
      y: position.y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        preload: PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // Load the command palette route
    this.window.loadURL(`${VITE_DEV_SERVER_URL}/command-palette`);

    this.window.once('ready-to-show', () => {
      logger.info('[CommandPaletteWindowManager] Window ready to show');
    });

    // Handle blur to hide window when focus is lost
    this.window.on('blur', () => {
      this.hide();
    });

    this.window.on('closed', () => {
      this.window = null;
    });

    logger.info('[CommandPaletteWindowManager] Command palette window created');
  }

  show(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
    }

    // Recalculate position in case screen size changed
    const position = this.calculatePosition();
    this.window?.setPosition(position.x, position.y);

    this.window?.show();
    this.window?.focus();

    logger.info('[CommandPaletteWindowManager] Window shown');
  }

  hide(): void {
    this.window?.hide();
    logger.info('[CommandPaletteWindowManager] Window hidden');
  }

  toggle(): void {
    if (!this.window || this.window.isDestroyed() || !this.window.isVisible()) {
      this.show();
    } else {
      this.hide();
    }
  }

  isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }

  close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
      this.window = null;
    }
  }
}
