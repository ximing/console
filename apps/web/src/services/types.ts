/**
 * Shared service types
 */

/**
 * Toast service interface for notifications
 */
export type ToastService = {
  success(message: string): void;
  error(message: string): void;
};
