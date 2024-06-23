import { ipcRenderer, contextBridge, IpcRendererEvent, app } from 'electron';

type MessageCallback = (message: string) => void;
type FileDropCallback = (filePaths: string[]) => void;

// Update status callback type
type UpdateStatusCallback = (status: UpdateStatus) => void;

// Notification callback type
type NotificationClickCallback = (data: { id: string }) => void;

// Update status type
export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseNotes?: string;
  percent?: number;
  error?: string;
}

// Update info type
export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

// Store wrapped callbacks to allow proper removal
const messageCallbackMap = new Map<
  MessageCallback,
  (event: IpcRendererEvent, message: string) => void
>();
const fileDropCallbackMap = new Map<
  FileDropCallback,
  (event: IpcRendererEvent, filePaths: string[]) => void
>();
const updateStatusCallbackMap = new Map<
  UpdateStatusCallback,
  (event: IpcRendererEvent, status: UpdateStatus) => void
>();

// Notification click callback map
const notificationClickCallbackMap = new Map<
  NotificationClickCallback,
  (event: IpcRendererEvent, data: { id: string }) => void
>();

// Command palette toggle callback - single callback
let commandPaletteToggleCallback: (() => void) | null = null;

// Log query params type
export interface LogQueryParams {
  offset?: number;
  limit?: number;
  level?: string;
  search?: string;
}

// Log entry type
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  projectName?: string;
  [key: string]: unknown;
}

// Log response type
export interface LogResponse {
  logs: LogEntry[];
  total: number;
  error?: string;
}

// Log count response type
export interface LogCountResponse {
  count: number;
  error?: string;
}

// Command palette callback type
type CommandPaletteToggleCallback = () => void;

// Log platform info for debugging
console.log('Preload script loaded, platform:', process.platform);
// Also send to main process via IPC for better visibility
ipcRenderer.invoke('log-preload', { platform: process.platform });

// --------- Expose API to Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // App version
  getVersion: () => app.getVersion(),

  // IPC communication
  onMainMessage: (callback: MessageCallback) => {
    const wrappedCallback = (_event: IpcRendererEvent, message: string) => {
      callback(message);
    };
    messageCallbackMap.set(callback, wrappedCallback);
    ipcRenderer.on('main-process-message', wrappedCallback);
  },

  removeMainMessageListener: (callback: MessageCallback) => {
    const wrappedCallback = messageCallbackMap.get(callback);
    if (wrappedCallback) {
      ipcRenderer.removeListener('main-process-message', wrappedCallback);
      messageCallbackMap.delete(callback);
    }
  },

  // File drag and drop
  onFileDrop: (callback: FileDropCallback) => {
    const wrappedCallback = (_event: IpcRendererEvent, filePaths: string[]) => {
      callback(filePaths);
    };
    fileDropCallbackMap.set(callback, wrappedCallback);
    ipcRenderer.on('files-dropped', wrappedCallback);
  },

  removeFileDropListener: (callback: FileDropCallback) => {
    const wrappedCallback = fileDropCallbackMap.get(callback);
    if (wrappedCallback) {
      ipcRenderer.removeListener('files-dropped', wrappedCallback);
      fileDropCallbackMap.delete(callback);
    }
  },

  // Auto-update APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Update status listener
  onUpdateStatus: (callback: UpdateStatusCallback) => {
    const wrappedCallback = (_event: IpcRendererEvent, status: UpdateStatus) => {
      callback(status);
    };
    updateStatusCallbackMap.set(callback, wrappedCallback);
    ipcRenderer.on('update-status', wrappedCallback);
  },

  removeUpdateStatusListener: (callback: UpdateStatusCallback) => {
    const wrappedCallback = updateStatusCallbackMap.get(callback);
    if (wrappedCallback) {
      ipcRenderer.removeListener('update-status', wrappedCallback);
      updateStatusCallbackMap.delete(callback);
    }
  },

  // System notification API (for showing notifications in Electron)
  showNotification: (payload: { id: string; title: string; body: string }) =>
    ipcRenderer.invoke('show-notification', payload),

  // Notification click listener
  onNotificationClick: (callback: NotificationClickCallback) => {
    const wrappedCallback = (_event: IpcRendererEvent, data: { id: string }) => {
      callback(data);
    };
    notificationClickCallbackMap.set(callback, wrappedCallback);
    ipcRenderer.on('notification-clicked', wrappedCallback);
  },

  removeNotificationClickListener: (callback: NotificationClickCallback) => {
    const wrappedCallback = notificationClickCallbackMap.get(callback);
    if (wrappedCallback) {
      ipcRenderer.removeListener('notification-clicked', wrappedCallback);
      notificationClickCallbackMap.delete(callback);
    }
  },

  // Log APIs
  getLogs: (params: LogQueryParams) => ipcRenderer.invoke('get-logs', params),
  getLogCount: (params: Omit<LogQueryParams, 'offset' | 'limit'>) =>
    ipcRenderer.invoke('get-log-count', params),

  // Command palette APIs
  showCommandPalette: () => ipcRenderer.invoke('show-command-palette'),
  closeCommandPalette: () => ipcRenderer.invoke('close-command-palette'),
  getCommandPaletteShortcut: () => ipcRenderer.invoke('get-command-palette-shortcut'),
  setCommandPaletteShortcut: (hotkey: string) =>
    ipcRenderer.invoke('set-command-palette-shortcut', hotkey),
  onCommandPaletteToggle: (callback: CommandPaletteToggleCallback) => {
    // Remove existing listener if any
    if (commandPaletteToggleCallback) {
      ipcRenderer.removeAllListeners('toggle-command-palette');
    }
    commandPaletteToggleCallback = callback;
    ipcRenderer.on('toggle-command-palette', () => {
      if (commandPaletteToggleCallback) {
        commandPaletteToggleCallback();
      }
    });
  },
  removeCommandPaletteToggleListener: (_callback: CommandPaletteToggleCallback) => {
    ipcRenderer.removeAllListeners('toggle-command-palette');
    commandPaletteToggleCallback = null;
  },
});

// --------- Type definitions for Renderer process ---------
declare global {
  interface Window {
    electronAPI: {
      platform: string;
      getVersion: () => string;
      onMainMessage: (callback: (message: string) => void) => void;
      removeMainMessageListener: (callback: (message: string) => void) => void;
      onFileDrop: (callback: (filePaths: string[]) => void) => void;
      removeFileDropListener: (callback: (filePaths: string[]) => void) => void;
      // Auto-update APIs
      checkForUpdates: () => Promise<UpdateInfo | null>;
      downloadUpdate: () => Promise<{ success: boolean }>;
      installUpdate: () => void;
      getAppVersion: () => Promise<string>;
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => void;
      removeUpdateStatusListener: (callback: (status: UpdateStatus) => void) => void;
      // System notification APIs
      showNotification: (payload: {
        id: string;
        title: string;
        body: string;
      }) => Promise<{ success: boolean; error?: string }>;
      onNotificationClick: (callback: (data: { id: string }) => void) => void;
      removeNotificationClickListener: (callback: (data: { id: string }) => void) => void;
      // Log APIs
      getLogs: (params: LogQueryParams) => Promise<LogResponse>;
      getLogCount: (params: Omit<LogQueryParams, 'offset' | 'limit'>) => Promise<LogCountResponse>;
      // Command palette APIs
      showCommandPalette: () => Promise<{ success: boolean; error?: string }>;
      closeCommandPalette: () => Promise<{ success: boolean; error?: string }>;
      getCommandPaletteShortcut: () => Promise<string>;
      setCommandPaletteShortcut: (
        hotkey: string
      ) => Promise<{ success: boolean; hotkey?: string; error?: string }>;
      onCommandPaletteToggle: (callback: () => void) => void;
      removeCommandPaletteToggleListener: (callback: () => void) => void;
    };
  }
}

export type ElectronAPI = Window['electronAPI'];
