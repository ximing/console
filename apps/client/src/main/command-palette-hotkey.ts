import { globalShortcut } from 'electron';
import { logger } from './logger';
import { commandPaletteStore } from './window';
import { CommandPaletteWindowManager } from './command-palette-window';

// Get shortcut from store, fallback to platform default
function getCommandPaletteShortcut(): string {
  return commandPaletteStore.get('hotkey');
}

export class CommandPaletteHotkey {
  private commandPaletteWindowManager: CommandPaletteWindowManager;
  private isRegistered = false;

  constructor(commandPaletteWindowManager: CommandPaletteWindowManager) {
    this.commandPaletteWindowManager = commandPaletteWindowManager;
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
    // Toggle the command palette independent window
    this.commandPaletteWindowManager.toggle();
    logger.debug('Command palette window toggled');
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

  // Re-register with new hotkey (after user changes it)
  reregister(newHotkey: string, oldHotkey?: string): boolean {
    // Use provided oldHotkey or get from store (but store might already be updated)
    const currentShortcut = oldHotkey || getCommandPaletteShortcut();

    // Unregister old shortcut if different from new one
    if (currentShortcut !== newHotkey) {
      try {
        globalShortcut.unregister(currentShortcut);
        logger.info(`Unregistered old hotkey: ${currentShortcut}`);
      } catch (error) {
        logger.warn(`Failed to unregister old hotkey ${currentShortcut}:`, { error: String(error) });
      }
      this.isRegistered = false;
    }

    // Register new shortcut
    try {
      const success = globalShortcut.register(newHotkey, () => {
        this.handleHotkeyPressed();
      });

      if (success) {
        this.isRegistered = true;
        logger.info(`Command palette hotkey registered: ${newHotkey}`);
        return true;
      } else {
        logger.warn(`Failed to register command palette hotkey: ${newHotkey}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error registering command palette hotkey: ${newHotkey}`, {
        error: String(error),
      });
      return false;
    }
  }
}
