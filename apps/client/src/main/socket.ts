import fs from 'node:fs';
import net from 'node:net';
import { Notification, nativeImage, dialog } from 'electron';
import { logger } from './logger';
import { WindowManager } from './window';

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

export class SocketServer {
  private server: net.Server | null = null;
  private socketPath: string = '';
  private windowManager?: WindowManager;

  setWindowManager(manager: WindowManager): void {
    this.windowManager = manager;
  }

  start(): void {
    this.socketPath = process.env.VITE_SOCKET_PATH || '';

    if (!this.socketPath) {
      logger.info('[Socket] No socket path configured, skipping server start');
      return;
    }

    // Cleanup old socket
    if (fs.existsSync(this.socketPath)) {
      try {
        fs.unlinkSync(this.socketPath);
      } catch (error) {
        logger.warn('[Socket] Failed to remove old socket:', { error: String(error) });
      }
    }

    this.server = net.createServer((client) => {
      let buffer = '';

      client.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            this.handleCommand(Buffer.from(line), client);
          }
        }
      });

      client.on('error', (error) => {
        logger.error('[Socket] Client error:', error.message);
      });
    });

    this.server.on('error', (error) => {
      logger.error('[Socket] Server error:', error.message);
    });

    this.server.listen(this.socketPath, () => {
      logger.info('[Socket] Server listening on:', this.socketPath);
    });
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }

  private generateId(): string {
    return `dialog_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private parseCommand(line: string): DialogOptions | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const commandMatch = trimmed.match(/^(notify|dialog)\b/);
    if (!commandMatch) return null;

    const command = commandMatch[1] as 'notify' | 'dialog';
    const options: Partial<DialogOptions> = {
      command,
      type: 'info',
      buttons: ['确定'],
      persistent: command === 'dialog',
    };

    const kvRegex = /--(\w+)(?:=(.+?)|\s+(".*?"|\S+))/g;
    let match;

    while ((match = kvRegex.exec(trimmed)) !== null) {
      const key = match[1];
      let value = match[2] || match[3];

      if (value?.startsWith('"') && value.endsWith('"')) {
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

    if (!options.title || !options.message) {
      return null;
    }

    return options as DialogOptions;
  }

  private handleCommand(data: Buffer, client: net.Socket): void {
    const line = data.toString().trim();
    logger.debug('[Socket] Received command:', line);

    const options = this.parseCommand(line);

    if (!options) {
      client.write(
        JSON.stringify({
          error: 'Invalid command',
          usage:
            'notify|dialog --title "xxx" --message "xxx" [--type info|warning|error|success|question] [--buttons "btn1,btn2"] [--persistent] [--icon /path/to/icon.png] [--timeout 3000]',
        }) + '\n'
      );
      return;
    }

    logger.debug('[Socket] Parsed options:', { options } as Record<string, unknown>);

    if (options.command === 'notify') {
      this.showNotification(options);
      client.write(JSON.stringify({ success: true, action: 'notification_shown' }) + '\n');
    } else {
      this.showDialog(options).then((result) => {
        client.write(JSON.stringify(result) + '\n');
      });
    }
  }

  private showNotification(options: DialogOptions): void {
    const notification = new Notification({
      title: options.title,
      body: options.message,
      silent: false,
    });

    notification.on('click', () => {
      this.windowManager?.show();
    });

    notification.show();
    const timeout = options.timeout;
    if (timeout) {
      setTimeout(() => {
        notification.close();
      }, timeout);
    }
  }

  private async showDialog(
    options: DialogOptions
  ): Promise<{ action: string; button: string; id: string }> {
    const dialogId = this.generateId();

    const dialogTypeMap: Record<string, 'none' | 'info' | 'error' | 'question' | 'warning'> = {
      info: 'info',
      warning: 'warning',
      error: 'error',
      success: 'info',
      question: 'question',
    };

    const electronDialogType = dialogTypeMap[options.type] || 'info';

    const dialogOptions: Electron.MessageBoxOptions = {
      type: electronDialogType,
      title: options.title,
      message: options.message,
      buttons: options.buttons,
      defaultId: 0,
      cancelId: options.buttons.length - 1,
    };

    if (options.icon && fs.existsSync(options.icon)) {
      try {
        dialogOptions.icon = nativeImage.createFromPath(options.icon);
      } catch {
        // Ignore icon errors
      }
    }

    const result = await dialog.showMessageBox(dialogOptions);
    const buttonClicked = options.buttons[result.response] || options.buttons[0];

    return {
      action: 'button_clicked',
      button: buttonClicked,
      id: dialogId,
    };
  }
}
