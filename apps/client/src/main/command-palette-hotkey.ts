import { globalShortcut } from 'electron';
import { logger } from './logger';
import { WindowManager } from './window';

// Determine shortcut based on platform
function getCommandPaletteShortcut(): string {
  return process.platform === 'darwin' ? 'Option+Space' : 'Alt+Space';
}

export class CommandPaletteHotkey {
  private windowManager: WindowManager;
  private isRegistered = false;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  register(): boolean {
    const shortcut = getCommandPaletteShortcut();

    try {
      // Unregister first in case already registered
      if (this.isRegistered) {
        globalShortcut.unregister(shortcut);
      }

      const success = globalShortcut.register(shortcut, () => {
        this.handleHotkeyPressed();
      });

      if (success) {
        this.isRegistered = true;
        logger.info(`Command palette hotkey registered: ${shortcut}`);
        return true;
      } else {
        logger.warn(`Failed to register command palette hotkey: ${shortcut}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error registering command palette hotkey: ${shortcut}`, {
        error: String(error),
      });
      return false;
    }
  }

  private handleHotkeyPressed(): void {
    const window = this.windowManager.getWindow();
    if (!window) {
      logger.warn('Command palette hotkey pressed but no window available');
      return;
    }

    // Send message to renderer to toggle command palette
    window.webContents.send('toggle-command-palette');
    logger.debug('Command palette toggle sent to renderer');
  }

  unregister(): void {
    const shortcut = getCommandPaletteShortcut();
    try {
      globalShortcut.unregister(shortcut);
      this.isRegistered = false;
      logger.info(`Command palette hotkey unregistered: ${shortcut}`);
    } catch (error) {
      logger.error(`Error unregistering command palette hotkey:`, { error: String(error) });
    }
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.isRegistered = false;
    logger.info('All global shortcuts unregistered');
  }
}
